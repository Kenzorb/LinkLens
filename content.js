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

function extractReadableTextFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll(
    "script, style, nav, footer, header, aside, form, button, noscript, svg"
  ).forEach((el) => el.remove());

  const article =
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.body;

  return article.innerText || "";
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

        resolve(response.minutes);
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

  for (const link of links) {
    if (shouldSkipLink(link)) continue;

    const title = link.querySelector("h3");
    if (!title) continue;

    link.dataset.readTimeAdded = "true";

    const badge = createBadge(" calculating...");
    title.appendChild(badge);

    const readTime = await getReadTimeFromBackground(link.href);

    if (readTime) {
      badge.textContent = `${readTime} min read`;
    } else {
      badge.textContent = "read time unavailable";
    }
  }
}

addReadTimeToLinks();

const observer = new MutationObserver(() => {
  addReadTimeToLinks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});