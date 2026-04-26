const WORDS_PER_MINUTE = 220;
const cache = new Map();

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractReadableText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function getReadTime(url) {
  if (cache.has(url)) return cache.get(url);

  const res = await fetch(url, {
    method: "GET",
    credentials: "omit"
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const html = await res.text();
  const text = extractReadableText(html);
  const words = countWords(text);
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  cache.set(url, minutes);
  return minutes;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GET_READ_TIME") return;

  getReadTime(message.url)
    .then((minutes) => {
      sendResponse({ ok: true, minutes });
    })
    .catch((error) => {
      console.warn("Read time failed:", message.url, error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});