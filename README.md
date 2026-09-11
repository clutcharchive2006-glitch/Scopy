# SnipCopy — dev setup

## OCR engine: PaddleOCR (swapped from Tesseract.js)

The snip tool now runs PP-OCR (PaddlePaddle/PaddleOCR, via the `ppu-paddle-ocr`
browser SDK + ONNX Runtime Web) instead of Tesseract.js — meaningfully better
accuracy on real-world text, and a smaller bundle. Everything still runs
on-device; nothing is sent anywhere. The old Tesseract code is gone from the
active build but still sits in git history if you ever want to compare or
revert.

Unlike everything else in this extension, `offscreen/offscreen.js` is a
**built file**. It pulls in npm packages (`ppu-paddle-ocr`, `onnxruntime-web`)
that a browser can't resolve without a bundler, so `offscreen/offscreen.src.js`
is the real source — edit that, then rebuild:

```bash
npm install
npm run build
```

That regenerates `offscreen/offscreen.js` and refreshes the ONNX WASM runtime
files in `vendor/paddleocr/`. Then reload the extension in `chrome://extensions`.

## Load it unpacked

1. Open `chrome://extensions`, turn on **Developer mode** (top right).
2. Click **Load unpacked**, select this folder.
3. Copy-unlock runs automatically on every page — try selecting/copying on a
   site that normally blocks it.
4. Press **Ctrl+Shift+S** (or click the toolbar icon), drag a box around some
   text, and you should get a result panel with recognized text a few seconds
   later. The very first snip after loading the extension may be slower —
   that's the model loading and warming up.

## What's built vs. what's left

**Working:** copy-unlock, the drag-select overlay, screenshot capture and
cropping, the PaddleOCR pipeline (model load → warmup → recognize), the
settings page (global on/off + per-site exclusions), and the message-passing
between content script, background worker, and offscreen document.

**Worth deciding before you publish** (tracked in `CHROMEWEBSTORE.md`):
- Real icon artwork (current icons are a placeholder "S" mark)
- A privacy policy URL (the extension collects nothing, so this can be short)
- Screenshots for the store listing
- Publisher name / contact email for the Developer Dashboard
- A NOTICE/credit line for PaddleOCR's Apache 2.0-licensed models — see
  `vendor/paddleocr/README.md`

## One thing worth knowing before you publish

What this does — restoring copy/selection that a page's own JavaScript or CSS
turned off — is a well-established, legal extension category; "Copyfish"
(OCR-based, same idea as your snip tool) and several "Enable Copy/Right-Click"
extensions have been on the Chrome Web Store for years. It's a different
situation from circumventing actual DRM (e.g., video protection) — that's
covered by anti-circumvention law and isn't something to build toward if this
idea expands later. Text-selection blocking is a page-level UI restriction,
not DRM, so you're on solid ground here.

## Architecture, in one paragraph

Clicking the icon or pressing the shortcut tells the content script (already
running on every page) to show a drag-select overlay. On mouseup, it sends the
selected rectangle to the background service worker, which screenshots the
visible tab (`chrome.tabs.captureVisibleTab`) and hands the screenshot +
rectangle to an offscreen document (the only place with a real
Canvas/Worker/WASM environment outside a visible tab). The offscreen document
crops the image and runs it through PaddleOCR, then the result travels back
through the background worker to the content script, which shows it in an
on-page box with a Copy button. No step sends anything off your device.
