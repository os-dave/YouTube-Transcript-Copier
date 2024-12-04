// Function to add copy button
function addCopyButton() {
  // Find the transcript container
  const transcriptContainer = document.querySelector(
    "ytd-transcript-segment-list-renderer"
  );
  if (!transcriptContainer) return;

  // Check if button already exists
  if (document.querySelector(".transcript-copy-btn")) return;

  // Create copy button
  const copyButton = document.createElement("button");
  copyButton.className = "transcript-copy-btn";
  copyButton.textContent = "Copy Transcript";

  // Add button to container
  transcriptContainer.parentElement.insertBefore(
    copyButton,
    transcriptContainer
  );

  // Add click handler
  copyButton.addEventListener("click", function () {
    const segments = document.querySelectorAll(
      "ytd-transcript-segment-renderer"
    );

    // Check if timestamps are hidden
    const transcriptPanel = document.querySelector(
      "ytd-transcript-search-panel-renderer"
    );
    const hideTimestamps = transcriptPanel.hasAttribute("hide-timestamps");

    const text = Array.from(segments)
      .map((segment) => {
        const textContent = segment
          .querySelector(".segment-text")
          .textContent.trim();

        if (hideTimestamps) {
          return textContent;
        } else {
          // Include timestamp if not hidden
          const timestamp = segment
            .querySelector(".segment-timestamp")
            .textContent.trim();
          return `[${timestamp}] ${textContent}`;
        }
      })
      .join("\n");

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy Transcript";
        }, 2000);
      });
    }
  });
}

// Watch for transcript panel opening
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      if (document.querySelector("ytd-transcript-segment-list-renderer")) {
        addCopyButton();
        break;
      }
    }
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRANSCRIPT_REQUEST") {
    console.log("Transcript data in content script:", message.data);
  }
});
