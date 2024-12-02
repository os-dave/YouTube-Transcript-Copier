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
  let currentVideoId = null;

  function getVideoIdFromUrl() {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
  }

  function handleVideoChange() {
    const newVideoId = getVideoIdFromUrl();

    if (newVideoId !== currentVideoId) {
      console.log("Video changed, resetting button state");
      copyButtonAdded = false;
      currentVideoId = newVideoId;

      const existingButton = document.querySelector(".transcript-copy-button");
      if (existingButton) {
        existingButton.remove();
      }

      if (currentVideoId) {
        checkForTranscriptPanel();
      }
    }
  }

  function checkForTranscriptPanel() {
    if (window.transcriptCheckInterval) {
      clearInterval(window.transcriptCheckInterval);
    }

    let attempts = 0;
    const maxAttempts = 60;

    window.transcriptCheckInterval = setInterval(() => {
      attempts++;

      const transcriptPanel = document.querySelector(
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
      );

      if (transcriptPanel) {
        console.log("Transcript panel found, attempting to add button");
        startButtonAdditionAttempts();
        clearInterval(window.transcriptCheckInterval);
      } else if (attempts >= maxAttempts) {
        console.log("Gave up looking for transcript panel after 30 seconds");
        clearInterval(window.transcriptCheckInterval);
      }
    }, 500);
  }

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

    const header = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-engagement-panel-title-header-renderer'
    );

    if (!header) {
      console.log("Header not found, retrying...");
      return;
    }

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Transcript";
    copyBtn.className = "transcript-copy-button";

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

  function startButtonAdditionAttempts() {
    if (window.buttonAttemptTimeouts) {
      window.buttonAttemptTimeouts.forEach((timeout) => clearTimeout(timeout));
    }
    window.buttonAttemptTimeouts = [];

    const checkIntervals = [100, 300, 500, 1000, 2000, 3000, 5000];
    for (const ms of checkIntervals) {
      const timeout = setTimeout(() => {
        if (!copyButtonAdded) {
          addCopyButton();
        }
      }, ms);
      window.buttonAttemptTimeouts.push(timeout);
    }
  }

  window.addEventListener("yt-navigate-start", () => {
    copyButtonAdded = false;
    const existingButton = document.querySelector(".transcript-copy-button");
    if (existingButton) {
      existingButton.remove();
    }

    if (window.transcriptCheckInterval) {
      clearInterval(window.transcriptCheckInterval);
    }
    if (window.buttonAttemptTimeouts) {
      window.buttonAttemptTimeouts.forEach((timeout) => clearTimeout(timeout));
    }
  });

  window.addEventListener("yt-navigate-finish", () => {
    handleVideoChange();
  });

  const pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(history, arguments);
    handleVideoChange();
  };

  const replaceState = history.replaceState;
  history.replaceState = function () {
    replaceState.apply(history, arguments);
    handleVideoChange();
  };

  window.addEventListener("popstate", () => {
    handleVideoChange();
  });

  handleVideoChange();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const transcriptPanel = document.querySelector(
          'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );
        if (transcriptPanel && !copyButtonAdded && getVideoIdFromUrl()) {
          console.log("Transcript panel detected by MutationObserver");
          startButtonAdditionAttempts();
          break;
        }
      }
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
