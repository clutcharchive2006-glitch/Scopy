# Chrome Web Store Listing — SnipCopy — Copy Text From Any Page

> Last Updated: 2026-09-11

## Store Listing

**Extension Name**
SnipCopy — Copy Text From Any Page

**Short Description**
Copy text even from pages that block it, or scan any on-screen text into a copyable box.

**Detailed Description**
SnipCopy lets you copy text from webpages that try to stop you — sites that disable
right-click, block text selection, or override Ctrl+C.

It works two ways. On most pages, SnipCopy quietly restores normal copying and text
selection the moment the page loads — no setup needed. For text that isn't real selectable
text at all (an image, a canvas drawing, a scrambled font), press the keyboard shortcut or
click the toolbar icon to drag-select that area of the screen; SnipCopy reads the text in
that area and drops it into a box you can copy from.

All text recognition happens on your own device — nothing you snip is sent to any server.

To use it: click the SnipCopy icon or press the keyboard shortcut, drag a box around the
text you want, and copy it from the results box that appears. Turn the automatic part off,
or exclude specific sites, from the extension's settings page.

SnipCopy does not collect, store, or transmit any of your browsing activity or the content
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
| Store Icon | 128×128 PNG | ✅ Ready | icons/icon-128.png (placeholder — swap for real artwork before submitting) |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile | 440×280 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: the drag-select overlay mid-selection on a real page.
- Screenshot 2: the result panel showing recognized text with the Copy button.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| activeTab | permissions | Lets the extension capture a screenshot of and inject the snip overlay into the current tab only when the user clicks the toolbar icon or presses the keyboard shortcut — never in the background. |
| scripting | permissions | Injects the content script on demand if a page was already open before SnipCopy was installed or updated. |
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

**Privacy Policy URL** [REQUIRED — not yet created]
<!-- See references/webstore/privacy-policy.md in the chrome-extensions skill for a template.
     Since this extension truly does zero data collection, the policy can be short: state
     plainly that no browsing data, page content, or snipped text ever leaves the device. -->

## Distribution

**Visibility**: [DECIDE — Public / Unlisted / Private]
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED — add before submitting]

**Contact Email** [REQUIRED — add before submitting]

**Support URL / Email** [RECOMMENDED]

**Homepage URL** [RECOMMENDED]

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-09-11 | Initial build: copy-unlock content script, drag-select snip tool, on-device OCR pipeline (Tesseract.js not yet bundled — see vendor/tesseract/README.md), options page. | Draft |

## Review Notes

### Known Issues / Limitations
- Tesseract.js is not bundled yet — `vendor/tesseract/` is empty except for setup
  instructions. The snip tool will show an error until those files are added locally
  (requires normal internet/npm access, unavailable in the sandbox this was built in).
- Copy-unlock only runs in the page's top frame (`all_frames: false`), so it won't reach
  text inside an `<iframe>` yet. The OCR snip tool works regardless, since it works on
  pixels, not the DOM.
- Copy-unlock handles the common cases (event listeners, inline attributes, CSS
  `user-select`) but not sites that patch `document.oncopy` via a defineProperty trick or
  swap clipboard contents through the Clipboard API directly — flag this as a possible
  Web Store review question and a candidate for a v0.2 fix if it comes up in testing.
- Icons are placeholder art (a plain "S" mark) — replace with real branding before
  submitting.

### Rejection History
(none yet)
