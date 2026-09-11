// SnipCopy — offscreen document
//
// Receives a full-tab screenshot + a crop rectangle from the background
// script, crops it on a <canvas>, and runs Tesseract.js on the crop.
//
// IMPORTANT — verify against your installed Tesseract.js version:
// this is written against the Tesseract.js v5 API (Tesseract.recognize
// with a worker-options object). Tesseract.js has changed this API across
// major versions before, so if `npm view tesseract.js version` gives you
// something other than a 5.x release, check that library's own README for
// the current recognize()/createWorker() signature and adjust the call
// below — the crop/message-passing logic around it won't need to change.

chrome.runtime.onMessage.addListener((message) => {
  if (message?.target !== "offscreen") return;
  if (message.type === "SNIPCOPY_RUN_OCR") {
    runOcr(message).catch((err) => {
      chrome.runtime.sendMessage({
        type: "SNIPCOPY_OCR_ERROR",
        tabId: message.tabId,
        error: "OCR failed: " + err.message
      });
    });
  }
});

async function runOcr({ dataUrl, rect, dpr, tabId }) {
  const canvas = await cropScreenshot(dataUrl, rect, dpr);

  if (typeof Tesseract === "undefined") {
    throw new Error(
      "Tesseract.js isn't bundled yet — see vendor/tesseract/README.md for how to add it."
    );
  }

  const {
    data: { text }
  } = await Tesseract.recognize(canvas, "eng", {
    // Point every asset at the copies bundled inside the extension —
    // Tesseract.js defaults to fetching these from a CDN, which the
    // Chrome Web Store's "no remotely hosted code" policy does not allow.
    workerPath: chrome.runtime.getURL("vendor/tesseract/worker.min.js"),
    // Point corePath at the FOLDER, not one specific .wasm.js file — Tesseract.js
    // picks between tesseract-core.wasm.js / tesseract-core-simd.wasm.js /
    // tesseract-core-lstm.wasm.js / tesseract-core-simd-lstm.wasm.js itself based
    // on the device's SIMD support and which OCR engine mode it's running. Pointing
    // this at a single file is explicitly discouraged by Tesseract.js's own docs —
    // it either degrades performance or breaks on some devices.
    corePath: chrome.runtime.getURL("vendor/tesseract/"),
    langPath: chrome.runtime.getURL("vendor/tesseract/lang-data"),
    gzip: true,
    logger: () => {} // swap in a progress callback if you want a loading indicator
  });

  chrome.runtime.sendMessage({
    type: "SNIPCOPY_OCR_RESULT",
    tabId,
    text
  });
}

function cropScreenshot(dataUrl, rect, dpr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = rect.x * dpr;
      const sy = rect.y * dpr;
      const sw = rect.width * dpr;
      const sh = rect.height * dpr;

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Couldn't load the captured screenshot"));
    img.src = dataUrl;
  });
}
