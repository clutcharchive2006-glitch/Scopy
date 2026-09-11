# SnipCopy — dev setup

## Load it unpacked (works right now, minus OCR)

1. Open `chrome://extensions`, turn on **Developer mode** (top right).
2. Click **Load unpacked**, select this `snipcopy-extension/` folder.
3. Visit any page that blocks copying/right-click — selection and copy should just work.
4. Press **Ctrl+Shift+S** (or click the toolbar icon) to try the snip tool — it'll capture your
   drag-selection and show an error, because Tesseract.js isn't bundled yet (see below).

## Finish the OCR piece

`vendor/tesseract/README.md` has the exact steps — you'll need `npm install tesseract.js@5`
on your own machine and to copy a few dist files + the English language data into
`vendor/tesseract/`. I couldn't do this from the cloud sandbox I built this in — it has no
npm/CDN access by policy — but it's a 5-minute job with normal internet access. Once those
files are in place, reload the extension and the snip tool will actually recognize text.

## What's built vs. what's left

**Working now:** copy-unlock (event-listener + CSS + inline-attribute stripping), the
drag-select overlay, screenshot capture, the crop-to-canvas step, the settings page
(global on/off + per-site exclusions), and all the message-passing plumbing between the
content script, background worker, and offscreen document.

**Needs your machine:** bundling Tesseract.js locally (see above) — that's the only piece
blocked by the sandbox.

**Worth deciding before you publish** (tracked in `CHROMEWEBSTORE.md`):
- Real icon artwork (current icons are a placeholder "S" mark)
- A privacy policy URL (the extension collects nothing, so this can be short — template
  pointer is in `CHROMEWEBSTORE.md`)
- Screenshots for the store listing
- Publisher name / contact email for the Developer Dashboard

## One thing worth knowing before you publish

What this does — restoring copy/selection that a page's own JavaScript or CSS turned off —
is a well-established, legal extension category; "Copyfish" (OCR-based, same idea as your
snip tool) and several "Enable Copy/Right-Click" extensions have been on the Chrome Web
Store for years. It's a different situation from circumventing actual DRM (e.g., video
protection) — that's covered by anti-circumvention law and is not something to build toward
if this idea expands later. Text-selection blocking is just a page-level UI restriction, not
DRM, so you're on solid ground here.

## Architecture, in one paragraph

Clicking the icon or pressing the shortcut tells the content script (already running on
every page) to show a drag-select overlay. On mouseup, it sends the selected rectangle to
the background service worker, which screenshots the visible tab
(`chrome.tabs.captureVisibleTab`) and hands the screenshot + rectangle to an offscreen
document (the only place with a real Canvas/Worker environment outside a visible tab). The
offscreen document crops the image and runs Tesseract.js on the crop, then the result
travels back through the background worker to the content script, which shows it in an
on-page box with a Copy button. No step sends anything off your device.
