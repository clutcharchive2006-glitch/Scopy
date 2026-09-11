# Chrome Web Store Listing — Scopy — Copy Text From Any Page

> Last Updated: 2026-09-11

## Store Listing

**Extension Name**
Scopy — Copy Text From Any Page

**Short Description**
Copy text even from pages that block it, or scan any on-screen text into a copyable box.

**Detailed Description**
Scopy lets you copy text from webpages that try to stop you — sites that disable
right-click, block text selection, or override Ctrl+C.

It works two ways. On most pages, Scopy quietly restores normal copying and text
selection the moment the page loads — no setup needed. For text that isn't real selectable
text at all (an image, a canvas drawing, a scrambled font), press the keyboard shortcut or
click the toolbar icon to drag-select that area of the screen; Scopy reads the text in
that area and drops it into a box you can copy from.

All text recognition happens on your own device — nothing you snip is sent to any server.

To use it: click the Scopy icon or press the keyboard shortcut, drag a box around the
text you want, and copy it from the results box that appears. Turn the automatic part off,
or exclude specific sites, from the extension's settings page.

Scopy does not collect, store, or transmit any of your browsing activity or the content
of any page you visit.

Questions or issues: [ADD SUPPORT EMAIL OR GITHUB ISSUES LINK]

**Category**
Productivity

**Single Purpose**
Restores copying on pages that block it, and lets you copy on-screen text that isn't
selectable at all.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile | 440×280 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: the drag-select overlay mid-selection on a real page.
- Screenshot 2: the result panel showing recognized text with the Copy button — the Pearson
  math example you already tested would make a good, honest one (shows a real, slightly
  imperfect result rather than a cherry-picked easy case).

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| activeTab | permissions | Lets the extension capture a screenshot of and inject the snip overlay into the current tab only when the user clicks the toolbar icon or presses the keyboard shortcut — never in the background. |
| scripting | permissions | Injects the content script on demand if a page was already open before Scopy was installed or updated. |
| storage | permissions | Saves the on/off toggle and the list of sites the user has excluded from automatic copy-unlock. |
| offscreen | permissions | Runs the on-device OCR engine in an offscreen document, since that work needs a full Canvas/Worker environment the background service worker doesn't have. |
| `<all_urls>` (content script `matches`) | host_permissions | The copy-unlock feature needs to run on every page, since any site — not a predictable list — might block copying. It only reads the page's own copy/selection behavior; it does not read page content or send anything off the device. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Website content | No (processed transiently, on-device, for OCR only — not stored or transmitted) | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
`PRIVACY.md` is written and in the repo root. Simplest way to get a URL for the submission
form right now: use its GitHub-rendered page —
`https://github.com/clutcharchive2006-glitch/Scopy/blob/main/PRIVACY.md`
— that's publicly readable and fine to submit with. A cleaner option if you want it later:
turn on GitHub Pages for this repo (Settings → Pages → Deploy from branch → main → /root),
which would serve it at `https://clutcharchive2006-glitch.github.io/Scopy/PRIVACY.md`
instead — same content, nicer URL, not required to launch.

Before submitting: open `PRIVACY.md` and fill in the contact email placeholder near the
bottom — it's currently a bracketed reminder, not a real address.

## Distribution

**Visibility**: [DECIDE — Public / Unlisted / Private]
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED — add before submitting]

**Contact Email** [REQUIRED — add before submitting]

**Support URL / Email** [RECOMMENDED]

**Homepage URL** [RECOMMENDED] — `https://github.com/clutcharchive2006-glitch/Scopy` works fine for this.

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.2.0 | 2026-09-11 | Swapped OCR engine from Tesseract.js to PaddleOCR (via ppu-paddle-ocr + onnxruntime-web) for better real-world accuracy and a smaller bundle. Added a build step (esbuild). Renamed to Scopy, replaced placeholder icons with real (simple) artwork, added PRIVACY.md. Confirmed working on real-world content (Google Overview text, a Pearson textbook math example). | Draft |
| 0.1.0 | 2026-09-11 | Initial build: copy-unlock content script, drag-select snip tool, on-device OCR pipeline (Tesseract.js), options page. | Draft |

## Review Notes

### Known Issues / Limitations
- OCR doesn't preserve mathematical notation structure (subscripts, limit notation, etc.) —
  confirmed on a real Pearson textbook example: it correctly reads the actual characters but
  linearizes them (e.g. a subscript below "lim" comes out appended after, not attached).
  This is a general-OCR limitation, not a bug — worth stating plainly in the listing
  description so it doesn't read as a broken promise to students who try it on math content.
- Copy-unlock only runs in the page's top frame (`all_frames: false`), so it won't reach
  text inside an `<iframe>` yet. The OCR snip tool works regardless, since it works on
  pixels, not the DOM.
- Copy-unlock handles the common cases (event listeners, inline attributes, CSS
  `user-select`) but not sites that patch `document.oncopy` via a defineProperty trick or
  swap clipboard contents through the Clipboard API directly — flag this as a possible
  Web Store review question and a candidate for a v0.3 fix if it comes up in testing.
- Ships PaddleOCR's model weights (Apache 2.0, from PaddlePaddle/PaddleOCR) — add a
  credit/NOTICE before publishing; see `vendor/paddleocr/README.md`.

### Rejection History
(none yet)
