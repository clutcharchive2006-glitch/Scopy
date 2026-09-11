const enabledEl = document.getElementById("enabled");
const disabledSitesEl = document.getElementById("disabledSites");
const statusEl = document.getElementById("status");

async function load() {
  const { enabled, disabledSites } = await chrome.storage.sync.get({
    enabled: true,
    disabledSites: []
  });
  enabledEl.checked = enabled;
  disabledSitesEl.value = disabledSites.join("\n");
}

document.getElementById("save").addEventListener("click", async () => {
  const disabledSites = disabledSitesEl.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await chrome.storage.sync.set({
    enabled: enabledEl.checked,
    disabledSites
  });

  statusEl.textContent = "Saved";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

load();
