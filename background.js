const DEFAULT_WORDS_PER_MINUTE = 220;
const wordCountCache = new Map();

async function getUserWordsPerMinute() {
  const result = await chrome.storage.sync.get([
    "wordsPerMinute",
    "useDefaultWpm"
  ]);

  if (result.useDefaultWpm ?? true) {
    return DEFAULT_WORDS_PER_MINUTE;
  }

  return result.wordsPerMinute || DEFAULT_WORDS_PER_MINUTE;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractReadableText(html) {
  return html
    // remove blocks
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")

    // layout sections
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")

    // forms / UI
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<button[\s\S]*?<\/button>/gi, " ")
    .replace(/<select[\s\S]*?<\/select>/gi, " ")
    .replace(/<option[\s\S]*?<\/option>/gi, " ")

    // media
    .replace(/<video[\s\S]*?<\/video>/gi, " ")
    .replace(/<audio[\s\S]*?<\/audio>/gi, " ")

    // comments
    .replace(/<!--[\s\S]*?-->/g, " ")

    // remove remaining tags
    .replace(/<[^>]+>/g, " ")

    // decode entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")

    // cleanup whitespace
    .replace(/\s+/g, " ")
    .trim();
}

async function getReadTime(url) {
  const cleanUrl = url.split("#")[0];

  let words;

  if (wordCountCache.has(cleanUrl)) {
    words = wordCountCache.get(cleanUrl);
  } else {
    const res = await fetch(cleanUrl, {
      method: "GET",
      credentials: "omit"
    });

    if (!res.ok) {
        return console.log("Unable to fetch. Error ", res.status)
    }
    
    console.log("==============response: ", res)
    const html = await res.text();
    console.log("==============html: ", html)
    const text = extractReadableText(html);
    console.log("==============text: ", text)
    words = countWords(text);
    console.log("==============number of words: ", words)

    wordCountCache.set(cleanUrl, words);
  }

  const wordsPerMinute = await getUserWordsPerMinute();
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  console.log("==============minutes ", minutes)

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