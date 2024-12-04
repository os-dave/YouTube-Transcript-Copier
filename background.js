// Listen for transcript API requests
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.method === "POST") {
      // Get the request body
      let decoder = new TextDecoder("utf-8");
      let body = JSON.parse(decoder.decode(details.requestBody.raw[0].bytes));

      console.log("Transcript Request:", body);

      // Send the data to content script
      chrome.tabs.sendMessage(details.tabId, {
        type: "TRANSCRIPT_REQUEST",
        data: body,
      });
    }
    return { cancel: false };
  },
  {
    urls: ["*://www.youtube.com/youtubei/v1/get_transcript*"],
  },
  ["requestBody"]
);

// Listen for transcript API responses
chrome.webRequest.onCompleted.addListener(
  function (details) {
    console.log("Transcript Response:", details);
    // You can fetch the response data here if needed
  },
  {
    urls: ["*://www.youtube.com/youtubei/v1/get_transcript*"],
  }
);
