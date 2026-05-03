const WORDS_PER_MINUTE = 220;

const cache = new Map();

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calculateReadTime(wordCount) {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

function shouldSkipLink(link) {
  const text = link.innerText?.trim();

  if (!text) return true;
  if (text.length < 8) return true;
  if (link.dataset.readTimeAdded === "true") return true;

  const href = link.href;
  if (!href.startsWith("http")) return true;

  return false;
}

function getResultLinks() {
  return [...document.querySelectorAll("a[href]")].filter((link) => {
    return link.querySelector("h3");
  });
}

function getReadTimeFromBackground(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "GET_READ_TIME",
        url
      },
      (response) => {
        if (!response?.ok) {
          resolve(null);
          return;
        }

        resolve(response.displayText);
      }
    );
  });
}

function createBadge(text) {
  const badge = document.createElement("span");
  badge.className = "ll-read-time";
  badge.textContent = text;
  return badge;
}

async function addReadTimeToLinks() {
  const links = getResultLinks();

  await Promise.all(
    links.map(async (link) => {
      if (shouldSkipLink(link)) return;

      const title = link.querySelector("h3");
      if (!title) return;

      link.dataset.readTimeAdded = "true";

      const badge = createBadge("Calculating...");
      title.appendChild(badge);

      const readTimeText = await getReadTimeFromBackground(link.href);

      badge.textContent = readTimeText || "Read Time Unavailable";
    })
  );
}

addReadTimeToLinks();

const observer = new MutationObserver(() => {
  addReadTimeToLinks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SETTINGS_UPDATED") {
    document.querySelectorAll(".ll-read-time").forEach((badge) => {
      badge.remove();
    });

    document.querySelectorAll("[data-read-time-added]").forEach((link) => {
      delete link.dataset.readTimeAdded;
    });

    addReadTimeToLinks();
  }
});