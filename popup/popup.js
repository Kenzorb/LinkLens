const input = document.getElementById("wpm");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");
const useDefaultToggle = document.getElementById("useDefault");

const DEFAULT_WPM = 220;

chrome.storage.sync.get(["wordsPerMinute", "useDefaultWpm"], (result) => {
  const useDefault = result.useDefaultWpm ?? true;

  useDefaultToggle.checked = useDefault;
  input.value = result.wordsPerMinute || DEFAULT_WPM;
  input.disabled = useDefault;
});

useDefaultToggle.addEventListener("change", () => {
  if (useDefaultToggle.checked) {
    input.value = DEFAULT_WPM;
    input.disabled = true;
  } else {
    input.disabled = false;
  }
});

saveBtn.addEventListener("click", () => {
  const useDefault = useDefaultToggle.checked;
  const wpm = useDefault ? DEFAULT_WPM : Number(input.value);

  if (!wpm || wpm < 30 || wpm > 1000) {
    status.textContent = "Enter 30 - 1000";
    return;
  }

  chrome.storage.sync.set(
    {
      useDefaultWpm: useDefault,
      wordsPerMinute: wpm
    },
    () => {
      status.textContent = useDefault
        ? "Using recommended 220 WPM"
        : `Saved ${wpm} WPM`;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        if (!tab?.id) return;

        chrome.tabs.sendMessage(tab.id, {
          type: "WPM_UPDATED"
        });
      });
    }
  );
  
});