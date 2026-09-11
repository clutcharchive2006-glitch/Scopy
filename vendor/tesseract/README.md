# Bundling Tesseract.js (do this on your own machine, not in a sandbox)

The Chrome Web Store does not allow an extension to download and execute
code from a remote server — everything the extension runs has to ship
inside the package. Tesseract.js normally fetches its worker script, WASM
core, and language data from a CDN by default, so those files need to be
copied into this folder instead and pointed at locally (already done in
`offscreen/offscreen.js` via `chrome.runtime.getURL(...)`).

## Steps

1. In a normal Node project (this doesn't need to be inside the extension
   folder), install the library:

   ```bash
   npm install tesseract.js@5
   ```

2. Copy these files from `node_modules/tesseract.js/dist/` (and
   `node_modules/tesseract.js-core/`) into this `vendor/tesseract/` folder:

   - `tesseract.min.js`
   - `worker.min.js`
   - all four core files: `tesseract-core.wasm.js`, `tesseract-core-simd.wasm.js`,
     `tesseract-core-lstm.wasm.js`, `tesseract-core-simd-lstm.wasm.js`

   Tesseract.js's own docs specifically warn against pointing `corePath` at just
   one of these — it picks the right one itself at runtime based on the device's
   SIMD support and which OCR engine mode is active, so `offscreen.js` points
   `corePath` at this whole folder rather than a single file. Skipping any of
   the four just means that particular code path falls back to fetching from
   the CDN, which is exactly what we're avoiding.

3. Get the English trained-data file and put it under
   `vendor/tesseract/lang-data/`:

   - Download `eng.traineddata.gz` from the `tessdata_fast` repo
     (search "tessdata_fast eng.traineddata" — it's a few MB) and place it
     at `vendor/tesseract/lang-data/eng.traineddata.gz`.
   - Add more languages the same way if you want them; `Tesseract.recognize`
     takes a language code as its second argument (e.g. `"eng+fra"`).

4. Double check the exact option names Tesseract.js expects for
   `workerPath` / `corePath` / `langPath` against whatever version you
   installed — these have moved around across major versions of the
   library. `offscreen.js` has a comment flagging this; the library's own
   README/CHANGELOG is the source of truth for your installed version.

5. Reload the unpacked extension in `chrome://extensions` and test the
   snip tool on a page.

## Why this can't be done from here

This step was written by an AI assistant working in a sandboxed cloud
environment with no access to the npm registry or any CDN (blocked by the
environment's own security policy) — that's a constraint of the sandbox,
not of your machine. Doing this step locally, where you have normal
internet access, takes a few minutes.
