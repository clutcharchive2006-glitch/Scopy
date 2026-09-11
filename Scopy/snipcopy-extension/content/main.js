// SnipCopy — content script (runs on every page, top frame only)
//
// Two independent features live here:
//   1. Copy-unlock: runs immediately, tries to neutralize the JS/CSS tricks
//      sites use to block selection, right-click and Ctrl+C.
//   2. Snip tool: dormant until the background script tells us to start —
//      draws a drag-select overlay, reports the picked rectangle back to
//      the background script, and later shows whatever text OCR found.

(() => {
  const BLOCKED_EVENTS = ["copy", "cut", "contextmenu", "selectstart", "dragstart"];

  // ---------------------------------------------------------------------
  // 1. Copy-unlock
  // ---------------------------------------------------------------------

  function injectSelectableCss() {
    const style = document.createElement("style");
    style.id = "snipcopy-force-selectable";
    style.textContent = `
      * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function installEventUnlock() {
    // Capturing-phase listeners run before any listener the page itself
    // attaches in the bubble phase (or later in the capture phase, since
    // we're attaching this before the page's own scripts have run, at
    // document_start). stopImmediatePropagation prevents the page's own
    // blocking handlers from ever firing, without us calling
    // preventDefault — so the browser's native copy/paste/selection still
    // goes through normally.
    for (const type of BLOCKED_EVENTS) {
      document.addEventListener(type, (e) => e.stopImmediatePropagation(), true);
      window.addEventListener(type, (e) => e.stopImmediatePropagation(), true);
    }
  }

  function stripBlockingAttributes(root) {
    const attrs = ["oncopy", "oncontextmenu", "onselectstart", "ondragstart", "oncut"];
    const strip = (el) => {
      for (const attr of attrs) {
        if (el.hasAttribute?.(attr)) el.removeAttribute(attr);
      }
    };
    strip(root);
    root.querySelectorAll?.(attrs.map((a) => `[${a}]`).join(",")).forEach(strip);
    // Some sites set these as direct DOM properties rather than attributes.
    for (const target of [document, document.body, document.documentElement]) {
      if (!target) continue;
      for (const prop of ["oncopy", "oncontextmenu", "onselectstart", "ondragstart", "oncut"]) {
        if (target[prop]) target[prop] = null;
      }
    }
  }

  function watchForNewBlockers() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) stripBlockingAttributes(node);
          });
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          stripBlockingAttributes(m.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["oncopy", "oncontextmenu", "onselectstart", "ondragstart", "oncut"]
    });
  }

  async function initCopyUnlock() {
    let settings;
    try {
      settings = await chrome.storage.sync.get({ enabled: true, disabledSites: [] });
    } catch (_) {
      settings = { enabled: true, disabledSites: [] };
    }
    if (!settings.enabled) return;
    if (settings.disabledSites.includes(location.hostname)) return;

    injectSelectableCss();
    installEventUnlock();

    const runAttributeSweep = () => {
      stripBlockingAttributes(document.documentElement);
      watchForNewBlockers();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runAttributeSweep, { once: true });
    } else {
      runAttributeSweep();
    }
  }

  initCopyUnlock();

  // ---------------------------------------------------------------------
  // 2. Snip tool (drag-select → background does capture+OCR → show result)
  // ---------------------------------------------------------------------

  let overlayEl = null;
  let selectionBoxEl = null;
  let dragStart = null;

  function removeOverlay() {
    overlayEl?.remove();
    overlayEl = null;
    selectionBoxEl = null;
    dragStart = null;
    document.removeEventListener("keydown", onOverlayKeydown, true);
  }

  function onOverlayKeydown(e) {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      removeOverlay();
    }
  }

  function startSnipMode() {
    if (overlayEl) return; // already active

    overlayEl = document.createElement("div");
    overlayEl.id = "snipcopy-overlay";

    const hint = document.createElement("div");
    hint.className = "snipcopy-hint";
    hint.textContent = "Drag to select the text to scan · Esc to cancel";
    overlayEl.appendChild(hint);

    overlayEl.addEventListener("mousedown", (e) => {
      dragStart = { x: e.clientX, y: e.clientY };
      selectionBoxEl = document.createElement("div");
      selectionBoxEl.id = "snipcopy-selection-box";
      selectionBoxEl.style.left = dragStart.x + "px";
      selectionBoxEl.style.top = dragStart.y + "px";
      selectionBoxEl.style.width = "0px";
      selectionBoxEl.style.height = "0px";
      overlayEl.appendChild(selectionBoxEl);
    });

    overlayEl.addEventListener("mousemove", (e) => {
      if (!dragStart || !selectionBoxEl) return;
      const x = Math.min(e.clientX, dragStart.x);
      const y = Math.min(e.clientY, dragStart.y);
      const width = Math.abs(e.clientX - dragStart.x);
      const height = Math.abs(e.clientY - dragStart.y);
      Object.assign(selectionBoxEl.style, {
        left: x + "px",
        top: y + "px",
        width: width + "px",
        height: height + "px"
      });
    });

    overlayEl.addEventListener("mouseup", (e) => {
      if (!dragStart) return;
      const x = Math.min(e.clientX, dragStart.x);
      const y = Math.min(e.clientY, dragStart.y);
      const width = Math.abs(e.clientX - dragStart.x);
      const height = Math.abs(e.clientY - dragStart.y);
      removeOverlay();

      if (width < 4 || height < 4) return; // treat as an accidental click, not a selection

      chrome.runtime.sendMessage({
        type: "SNIPCOPY_REGION_SELECTED",
        rect: { x, y, width, height },
        dpr: window.devicePixelRatio || 1
      });
      showToast("Scanning selection…");
    });

    document.addEventListener("keydown", onOverlayKeydown, true);
    document.body.appendChild(overlayEl);
  }

  // ---------------------------------------------------------------------
  // Result panel + toast
  // ---------------------------------------------------------------------

  function removeExistingPanel() {
    document.querySelector(".snipcopy-panel")?.remove();
  }

  function showResultPanel(text) {
    removeExistingPanel();
    const panel = document.createElement("div");
    panel.className = "snipcopy-panel";

    const header = document.createElement("div");
    header.className = "snipcopy-panel-header";
    header.innerHTML = `<span>Snipped text</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "snipcopy-panel-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => panel.remove());
    header.appendChild(closeBtn);

    const textarea = document.createElement("textarea");
    textarea.readOnly = true;
    textarea.value = text?.trim()
      ? text.trim()
      : "No text detected — try a larger or clearer selection.";

    const actions = document.createElement("div");
    actions.className = "snipcopy-panel-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "snipcopy-btn snipcopy-btn-primary";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        showToast("Copied to clipboard");
      } catch (_) {
        textarea.select();
        document.execCommand("copy");
        showToast("Copied to clipboard");
      }
    });

    const closeBtn2 = document.createElement("button");
    closeBtn2.className = "snipcopy-btn snipcopy-btn-secondary";
    closeBtn2.textContent = "Close";
    closeBtn2.addEventListener("click", () => panel.remove());

    actions.append(copyBtn, closeBtn2);
    panel.append(header, textarea, actions);
    document.body.appendChild(panel);
  }

  function showErrorPanel(message) {
    removeExistingPanel();
    const panel = document.createElement("div");
    panel.className = "snipcopy-panel";
    panel.innerHTML = `
      <div class="snipcopy-panel-header"><span>SnipCopy couldn't read that</span></div>
      <div style="margin-bottom:8px;color:#6b7280;">${message}</div>
    `;
    const closeBtn = document.createElement("button");
    closeBtn.className = "snipcopy-btn snipcopy-btn-secondary";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => panel.remove());
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);
  }

  let toastTimer = null;
  function showToast(message) {
    let toast = document.querySelector(".snipcopy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "snipcopy-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add("snipcopy-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("snipcopy-visible");
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }

  // ---------------------------------------------------------------------
  // Messages from the background script
  // ---------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SNIPCOPY_START_SNIP") {
      startSnipMode();
    } else if (message?.type === "SNIPCOPY_SHOW_RESULT") {
      showResultPanel(message.text);
    } else if (message?.type === "SNIPCOPY_SHOW_ERROR") {
      showErrorPanel(message.error);
    }
  });
})();
