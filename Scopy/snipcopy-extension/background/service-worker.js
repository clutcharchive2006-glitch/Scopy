// SnipCopy — background service worker
//
// Responsibilities:
//  1. Start "snip mode" when the toolbar icon is clicked or the keyboard
//     shortcut fires (both are user gestures, so activeTab is available).
//  2. When the content script reports a selected region, capture a
//     screenshot of the visible tab and hand it off to the offscreen
//     document for cropping + OCR.
//  3. Relay the OCR result (or an error) back to the tab that asked for it.
//
// No state is kept in module-level variables between these steps — every
// piece of data the flow needs (tabId, rect, dpr, requestId) travels inside
// the messages themselves, so a service-worker restart mid-flow can't lose
// anything mid-air except the one in-flight request, which just times out
// silently. See the "service workers are ephemeral" rule.

const OFFSCREEN_URL = "offscreen/offscreen.html";

async function ensureOffscreenDocument() {
  // hasDocument() is available Chrome 116+. Fall back to a try/catch for
  // older Chrome, since createDocument() throws if one already exists.
  if (chrome.offscreen.hasDocument) {
    const exists = await chrome.offscreen.hasDocument();
    if (exists) return;
  }
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["WORKERS"],
      justification: "Run on-device OCR (Tesseract.js, which uses Web Workers) on a cropped screenshot."
    });
  } catch (err) {
    // "Only a single offscreen document may be created" — fine, it already exists.
    if (!String(err).includes("single offscreen document")) throw err;
  }
}

async function startSnip(tab) {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SNIPCOPY_START_SNIP" });
  } catch (err) {
    // Content script probably isn't injected yet (page loaded before the
    // extension was installed/updated, or it's a page Chrome protects).
    // Try to inject it on demand — this only works because we're still
    // inside the click/shortcut gesture (activeTab).
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/main.js"]
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content/main.css"]
      });
      await chrome.tabs.sendMessage(tab.id, { type: "SNIPCOPY_START_SNIP" });
    } catch (err2) {
      console.warn("SnipCopy: couldn't start snip mode on this page:", err2.message);
    }
  }
}

chrome.action.onClicked.addListener((tab) => {
  startSnip(tab);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "snip-text") startSnip(tab);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "SNIPCOPY_REGION_SELECTED") {
    return handleRegionSelected(message, sender);
  }
  if (message?.type === "SNIPCOPY_OCR_RESULT" || message?.type === "SNIPCOPY_OCR_ERROR") {
    // Coming from the offscreen document — relay to the tab that asked.
    return relayToTab(message);
  }
  // Not for us — let other listeners (if any) handle it.
});

async function handleRegionSelected(message, sender) {
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;
  if (!tabId || windowId == null) return;

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    await ensureOffscreenDocument();
    // Fire-and-forget: the offscreen document sends its result back through
    // chrome.runtime.onMessage (SNIPCOPY_OCR_RESULT / SNIPCOPY_OCR_ERROR),
    // carrying tabId along so we know where to relay it.
    chrome.runtime.sendMessage({
      target: "offscreen",
      type: "SNIPCOPY_RUN_OCR",
      dataUrl,
      rect: message.rect,
      dpr: message.dpr,
      tabId
    });
  } catch (err) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SNIPCOPY_SHOW_ERROR",
        error: "Couldn't capture the page: " + err.message
      });
    } catch (_) {
      /* tab may have closed */
    }
  }
}

async function relayToTab(message) {
  if (!message.tabId) return;
  try {
    if (message.type === "SNIPCOPY_OCR_RESULT") {
      await chrome.tabs.sendMessage(message.tabId, {
        type: "SNIPCOPY_SHOW_RESULT",
        text: message.text
      });
    } else {
      await chrome.tabs.sendMessage(message.tabId, {
        type: "SNIPCOPY_SHOW_ERROR",
        error: message.error
      });
    }
  } catch (_) {
    /* tab may have closed or navigated away */
  }
}
