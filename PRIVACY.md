# Scopy Privacy Policy

_Last updated: 2026-09-11_

Scopy is a Chrome extension that restores text copying on pages that block it,
and lets you extract text from images/screenshots on any webpage using
on-device text recognition (OCR).

## What Scopy does with your data

**Nothing leaves your device.** Scopy does not have a server, does not make
any network requests with your data, and does not collect, store, transmit,
or sell any information about you or your browsing.

Specifically:

- **Page content you interact with** (the page you're on, text you select,
  or the screen region you snip) is processed entirely on your device, in
  memory, for the sole purpose of showing you the result. It is never sent
  anywhere, saved to disk, or logged.
- **The on-device text recognition (OCR) engine** runs fully inside your
  browser using WebAssembly. No image, screenshot, or recognized text is
  ever uploaded to any server, by Scopy or by any third party.
- **Settings** (whether the automatic copy-unlock feature is on, and any
  sites you've chosen to exclude from it) are stored locally in your
  browser's own extension storage (`chrome.storage`) and are never
  transmitted anywhere. They stay on your device and, if you're signed into
  Chrome with sync enabled, sync only through Google's own Chrome Sync — the
  same mechanism Chrome uses for your bookmarks and other extension settings.
- Scopy does not use analytics, telemetry, tracking pixels, or any
  third-party service of any kind.

## Permissions

Scopy requests the following browser permissions, each used only for what's
described:

- **activeTab** — to capture a screenshot of and read the current tab only
  when you click the toolbar icon or press the keyboard shortcut.
- **scripting** — to inject Scopy's functionality into a page if it was
  already open before Scopy was installed or updated.
- **storage** — to save your on/off preference and excluded-sites list,
  locally, as described above.
- **offscreen** — to run the on-device OCR engine, which needs a browser
  environment the extension's background script doesn't otherwise have.
- **Access to all websites** — the copy-restoring feature needs to work on
  any site, since any site could be the one blocking copying; it doesn't
  read or store page content beyond what's needed to restore normal
  copy/selection behavior in that moment.

## Changes to this policy

If this policy ever changes, the update will be reflected here with a new
"Last updated" date.

## Contact

Questions about this policy or Scopy's data practices: [ADD YOUR CONTACT
EMAIL HERE BEFORE PUBLISHING].
