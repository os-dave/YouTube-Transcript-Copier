// ==UserScript==
// @name         YouTube Transcript Copier
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a copy button to YouTube transcripts
// @author       @php100 on X.com
// @match        https://www.youtube.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  "use strict";

  console.log("YouTube Transcript Copier script loaded");

  let copyButtonAdded = false;

  function formatTranscript(data) {
    return data
      .map((segment) => `[${segment.time}] ${segment.text}`)
      .join("\n\n");
  }

  function createToastNotification(message) {
    const toast = document.createElement("div");

    // Style the toast notification
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%) translateY(100%)",
      backgroundColor: "#0f0f0f",
      color: "white",
      padding: "12px 24px",
      borderRadius: "8px",
      fontSize: "14px",
      fontFamily: "Roboto, Arial, sans-serif",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      zIndex: "9999",
      opacity: "0",
      transition: "all 0.3s ease-out",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    // Add a checkmark icon
    const icon = document.createElement("span");
    icon.innerHTML = "✓";
    icon.style.color = "#2ba640"; // Green checkmark
    toast.appendChild(icon);

    // Add the message
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    });

    // Remove the toast after 2 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(100%)";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  function addCopyButton() {
    if (copyButtonAdded) return;

    console.log("Attempting to add copy button...");

    // Look for the transcript panel header
    const header = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-engagement-panel-title-header-renderer'
    );

    console.log("Header found:", !!header);

    if (!header) {
      console.log("Header not found, retrying...");
      return;
    }

    // Create the copy button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Transcript";

    // Apply styles individually to avoid innerHTML manipulation
    Object.assign(copyBtn.style, {
      position: "absolute",
      top: "50%",
      right: "96px",
      transform: "translateY(-50%)",
      zIndex: "9999",
      background: "#0f0f0f",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "18px",
      fontSize: "14px",
      cursor: "pointer",
      fontFamily: "Roboto, Arial, sans-serif",
      fontWeight: "500",
      height: "36px",
      lineHeight: "20px",
      margin: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "fit-content",
      whiteSpace: "nowrap",
    });

    // Add hover effect
    copyBtn.addEventListener("mouseover", () => {
      copyBtn.style.background = "#263850";
    });

    copyBtn.addEventListener("mouseout", () => {
      copyBtn.style.background = "#0f0f0f";
    });

    // Make sure the header has relative positioning for absolute positioning of the button
    header.style.position = "relative";

    // Add button to the header
    header.appendChild(copyBtn);
    copyButtonAdded = true;

    copyBtn.addEventListener("click", function () {
      const segments = Array.from(
        document.querySelectorAll("ytd-transcript-segment-renderer")
      ).map((seg) => ({
        time:
          seg.querySelector(".segment-timestamp")?.textContent?.trim() || "",
        text: seg.querySelector(".segment-text")?.textContent?.trim() || "",
      }));

      if (segments.length === 0) {
        createToastNotification("No transcript segments found");
        return;
      }

      const formattedText = formatTranscript(segments);

      // Add visual feedback to the button
      const originalText = copyBtn.textContent;
      copyBtn.style.background = "#2ba640"; // Success green
      copyBtn.textContent = "✓ Copied";

      // Reset button after 1 second
      setTimeout(() => {
        copyBtn.style.background = "#0f0f0f";
        copyBtn.textContent = originalText;
      }, 1000);

      // Try to copy using the Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(formattedText)
          .then(() => createToastNotification("Transcript copied to clipboard"))
          .catch((err) => {
            console.error("Failed to copy:", err);
            fallbackCopy(formattedText);
          });
      } else {
        fallbackCopy(formattedText);
      }
    });
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      createToastNotification("Transcript copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      createToastNotification("Failed to copy transcript");
    }
    document.body.removeChild(textarea);
  }

  // Make the checks more aggressive
  const checkIntervals = [100, 300, 500, 1000, 2000, 3000, 5000, 7000, 10000];
  for (const ms of checkIntervals) {
    setTimeout(() => {
      if (!copyButtonAdded) {
        addCopyButton();
      }
    }, ms);
  }

  // Watch for changes to detect when transcript panel is added
  new MutationObserver(() => {
    if (!copyButtonAdded) {
      addCopyButton();
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Reset button state on navigation
  window.addEventListener("yt-navigate-start", () => {
    copyButtonAdded = false;
  });

  // Try to add button after navigation
  window.addEventListener("yt-navigate-finish", addCopyButton);
})();
