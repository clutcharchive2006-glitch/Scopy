// SnipCopy — offscreen document
//
// Receives a full-tab screenshot + a crop rectangle from the background
// script, crops it on a <canvas>, and runs Tesseract.js on the crop.
//
// FIXED: the original version passed workerPath/corePath/langPath/gzip as
// Tesseract.recognize()'s third argument. In Tesseract.js v5 those options
// belong to createWorker() instead — recognize()'s options are for
// recognition settings (like `rectangle`), not asset paths. Passing them to
// recognize() silently doesn't wire up the local files, so the worker falls
// back toward its (CDN) defaults and fails inside an extension, which is
// exactly the "OCR failed" error this was producing.
//
// This also now keeps ONE worker warm across snips instead of creating and
// tearing one down per call — recreating it every time meant reloading the
// ~11MB language data on every single snip, which is slow and is the kind
// of "capture just fails / takes forever" complaint that shows up a lot in
// OCR extension reviews.

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

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    if (typeof Tesseract === "undefined") {
      return Promise.reject(
        new Error("Tesseract.js isn't bundled yet — see vendor/tesseract/README.md for how to add it.")
      );
    }
    workerPromise = Tesseract.createWorker("eng", 1, {
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
    }).catch((err) => {
      workerPromise = null; // don't cache a failed worker — let the next snip retry
      throw err;
    });
  }
  return workerPromise;
}

async function runOcr({ dataUrl, rect, dpr, tabId }) {
  const canvas = await cropScreenshot(dataUrl, rect, dpr);
  const worker = await getWorker();

  const {
    data: { text }
  } = await worker.recognize(canvas);

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
