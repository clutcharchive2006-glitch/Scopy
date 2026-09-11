// SnipCopy — offscreen document (OCR engine: PaddleOCR via onnxruntime-web)
//
// This file is a SOURCE file — it uses bare module imports ("ppu-paddle-ocr/web",
// "onnxruntime-web") that browsers can't resolve on their own. `npm run build`
// (esbuild) bundles this into offscreen.js, which is what actually ships in the
// extension and is what manifest/offscreen.html reference. Edit this file, not
// offscreen.js directly — your edits to offscreen.js will be overwritten by the
// next build.
//
// Swapped out from Tesseract.js: PP-OCR is a modern deep-learning OCR engine
// (PaddlePaddle/PaddleOCR, Apache 2.0), noticeably more accurate than Tesseract
// on real-world text — small fonts, colored backgrounds, textbook layouts — and
// its "tiny" model bundle is smaller too (~6MB vs Tesseract's ~28MB). Everything
// still runs fully on-device (ONNX Runtime Web + WASM), nothing leaves the
// browser. Uses ppu-paddle-ocr (MIT), an unofficial but actively maintained
// browser/extension-targeted SDK for PaddleOCR's models — see
// vendor/paddleocr/README.md for where the model + runtime files come from and
// their own licenses (Apache 2.0, from PaddlePaddle/PaddleOCR).

import { PaddleOcrService } from "ppu-paddle-ocr/web";
import * as ort from "onnxruntime-web";

// MV3 extension pages can't use SharedArrayBuffer-based threading without extra
// COOP/COEP headers we don't control here, so keep this single-threaded and
// skip the proxy worker — both are known-good settings for the extension
// environment (see the ppu-paddle-ocr-extension reference project).
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = chrome.runtime.getURL("vendor/paddleocr/");

let ocrService = null;
let initPromise = null;

function initOCR() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    ocrService = new PaddleOcrService({
      model: {
        detection: chrome.runtime.getURL("vendor/paddleocr/det.ort"),
        recognition: chrome.runtime.getURL("vendor/paddleocr/rec.ort"),
        charactersDictionary: chrome.runtime.getURL("vendor/paddleocr/dict.txt")
      },
      session: {
        executionProviders: ["wasm"]
      }
    });
    await ocrService.initialize();

    // Warm the model up once at load time (traces the WASM graph) so the
    // FIRST real snip isn't the one paying that one-time cost — this is the
    // kind of thing that shows up as "OCR just hangs the first time" in
    // reviews of tools like this.
    const warm = new OffscreenCanvas(64, 64);
    const wctx = warm.getContext("2d");
    wctx.fillStyle = "white";
    wctx.fillRect(0, 0, 64, 64);
    wctx.fillStyle = "black";
    wctx.font = "20px serif";
    wctx.fillText("A", 12, 40);
    await ocrService.recognize(warm, { flatten: true }).catch(() => {});
  })().catch((err) => {
    initPromise = null; // let the next snip retry instead of caching a failed init forever
    throw err;
  });
  return initPromise;
}

// Kick off loading as soon as the offscreen document exists, so it's likely
// already warm by the time the user actually snips something.
initOCR();

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

  try {
    await initOCR();
  } catch (err) {
    throw new Error("OCR engine failed to load: " + err.message);
  }

  const result = await ocrService.recognize(canvas, { flatten: true, noCache: true });
  const text = extractText(result);

  chrome.runtime.sendMessage({
    type: "SNIPCOPY_OCR_RESULT",
    tabId,
    text
  });
}

// The exact shape of ppu-paddle-ocr's recognize() result with `flatten: true`
// wasn't something I could confirm byte-for-byte from documentation alone —
// handle both a single concatenated `.text` field and a `.results[]` array of
// per-region hits, so this doesn't silently return nothing if the real shape
// is the array form.
function extractText(result) {
  if (result && typeof result.text === "string" && result.text.length) {
    return result.text;
  }
  if (result && Array.isArray(result.results)) {
    return result.results
      .map((r) => r?.text ?? "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

async function cropScreenshot(dataUrl, rect, dpr) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = rect.x * dpr;
  const sy = rect.y * dpr;
  const sw = rect.width * dpr;
  const sh = rect.height * dpr;

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();
  return canvas;
}
