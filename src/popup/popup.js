(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const state = {
    activeTab: null,
    config: utils.deepClone(root.DEFAULT_CONFIG),
    currentResult: null,
    currentFixCss: "",
    history: [],
    progress: {
      value: 0,
      stage: "Idle",
      detail: "Ready for scan",
      active: false,
      updatedAt: 0
    }
  };

  const el = {
    scanBtn: document.getElementById("scanBtn"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    optionsBtn: document.getElementById("optionsBtn"),
    exportBtn: document.getElementById("exportBtn"),
    refreshHistoryBtn: document.getElementById("refreshHistoryBtn"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    applyFixesBtn: document.getElementById("applyFixesBtn"),
    copyFixesBtn: document.getElementById("copyFixesBtn"),
    downloadFixesBtn: document.getElementById("downloadFixesBtn"),
    clearFixesBtn: document.getElementById("clearFixesBtn"),
    fixCssPreview: document.getElementById("fixCssPreview"),
    fixRuleCount: document.getElementById("fixRuleCount"),
    findingsList: document.getElementById("findingsList"),
    categoryList: document.getElementById("categoryList"),
    historyList: document.getElementById("historyList"),
    status: document.getElementById("status"),
    score: document.getElementById("score"),
    findingsTotal: document.getElementById("findingsTotal"),
    elementsTotal: document.getElementById("elementsTotal"),
    scanLed: document.getElementById("scanLed"),
    scanProgressBar: document.getElementById("scanProgressBar"),
    scanProgressValue: document.getElementById("scanProgressValue"),
    scanStageLabel: document.getElementById("scanStageLabel"),
    scanDetailLabel: document.getElementById("scanDetailLabel"),
    toggleHighlights: document.getElementById("toggleHighlights"),
    toggleRulers: document.getElementById("toggleRulers"),
    toggleLabels: document.getElementById("toggleLabels"),
    togglePanel: document.getElementById("togglePanel"),
    severityFilter: document.getElementById("severityFilter"),
    maxVisibleFindingsQuick: document.getElementById("maxVisibleFindingsQuick"),
    maxVisibleFindingsValue: document.getElementById("maxVisibleFindingsValue")
  };

  function setStatus(text, isError) {
    el.status.textContent = text;
    el.status.style.color = isError ? "#ffd1cc" : "#afbad1";
  }

  function toProgressLabel(stage) {
    const map = {
      start: "Boot",
      prepare: "Prep",
      collect: "Collect",
      group: "Group",
      "css-index": "CSS Index",
      rules: "Rules",
      normalize: "Rank",
      fixes: "Fix Synth",
      complete: "Complete",
      done: "Complete",
      error: "Error"
    };
    return map[stage] || stage || "Idle";
  }

  function setScanProgress(value, stage, detail, active) {
    const numeric = Number.parseFloat(value);
    const bounded = Number.isFinite(numeric)
      ? Math.max(0, Math.min(100, numeric))
      : 0;

    state.progress.value = bounded;
    state.progress.stage = toProgressLabel(stage);
    state.progress.detail = detail || "";
    state.progress.active = !!active;
    state.progress.updatedAt = Date.now();

    el.scanProgressBar.style.width = bounded + "%";
    el.scanProgressValue.textContent = Math.round(bounded) + "%";
    el.scanStageLabel.textContent = state.progress.stage;
    el.scanDetailLabel.textContent = state.progress.detail || "Ready for scan";
    el.scanLed.classList.toggle("active", !!active);
  }

  function getActiveTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function loadConfig() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(root.CONFIG_KEYS.sync, function (data) {
        const stored = data && data[root.CONFIG_KEYS.sync] ? data[root.CONFIG_KEYS.sync] : {};
        state.config = utils.deepMerge(root.DEFAULT_CONFIG, stored);
        resolve(state.config);
      });
    });
  }

  function sendToTab(message) {
    if (!state.activeTab || !state.activeTab.id) {
      return Promise.reject(new Error("No active tab available."));
    }

    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(state.activeTab.id, message, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response || {});
      });
    });
  }

  function sendToRuntime(message) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(message, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response || {});
      });
    });
  }

  function overlayPatchFromUI() {
    const maxVisible = Number.parseFloat(el.maxVisibleFindingsQuick.value);
    return {
      showHighlights: !!el.toggleHighlights.checked,
      showRulers: !!el.toggleRulers.checked,
      showLabels: !!el.toggleLabels.checked,
      showPanel: !!el.togglePanel.checked,
      severityFilter: el.severityFilter.value || "all",
      maxVisibleFindings: Number.isFinite(maxVisible) ? Math.round(maxVisible) : 250
    };
  }

  function shouldOverlayBeVisible(overlay) {
    if (!overlay) {
      return false;
    }
    return !!(
      overlay.showHighlights ||
      overlay.showRulers ||
      overlay.showLabels ||
      overlay.showPanel
    );
  }

  function setOverlayUI(overlay) {
    el.toggleHighlights.checked = !!overlay.showHighlights;
    el.toggleRulers.checked = !!overlay.showRulers;
    el.toggleLabels.checked = !!overlay.showLabels;
    el.togglePanel.checked = !!overlay.showPanel;
    el.severityFilter.value = overlay.severityFilter || "all";
    const maxVisible =
      Number.isFinite(Number.parseFloat(overlay.maxVisibleFindings))
        ? Math.round(Number.parseFloat(overlay.maxVisibleFindings))
        : 250;
    el.maxVisibleFindingsQuick.value = String(maxVisible);
    el.maxVisibleFindingsValue.textContent = String(maxVisible);
  }

  function renderSummary(result) {
    const summary = result && result.summary
      ? result.summary
      : { consistencyScore: "-", total: "-", critical: 0, high: 0, medium: 0, low: 0 };
    const meta = result && result.meta ? result.meta : { inspectedElements: "-" };

    el.score.textContent = summary.consistencyScore;
    el.findingsTotal.textContent = summary.total;
    el.elementsTotal.textContent = meta.inspectedElements;
  }

  function renderFixes(result) {
    const fixes = result && result.fixes
      ? result.fixes
      : { cssText: "", rules: [], disabled: false };
    state.currentFixCss = String(fixes.cssText || "");

    const ruleCount = Array.isArray(fixes.rules) ? fixes.rules.length : 0;
    el.fixRuleCount.textContent = ruleCount + " rule" + (ruleCount === 1 ? "" : "s");
    el.fixCssPreview.value = fixes.disabled
      ? "Fix generation is disabled in Advanced Config > Auto Fix Generator."
      : state.currentFixCss;

    const hasFixes = state.currentFixCss.trim().length > 0;
    el.applyFixesBtn.disabled = !hasFixes;
    el.copyFixesBtn.disabled = !hasFixes;
    el.downloadFixesBtn.disabled = !hasFixes;
  }

  function renderCategoryBreakdown(result) {
    el.categoryList.innerHTML = "";

    if (!result || !result.breakdown || !result.breakdown.byCategory) {
      const empty = document.createElement("div");
      empty.className = "history-card";
      empty.textContent = "No category data yet.";
      el.categoryList.appendChild(empty);
      return;
    }

    const entries = Object.entries(result.breakdown.byCategory)
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 8);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "history-card";
      empty.textContent = "No category findings.";
      el.categoryList.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      const card = document.createElement("article");
      card.className = "history-card";

      const title = document.createElement("div");
      title.className = "meta";
      title.textContent = entry[0];

      const count = document.createElement("div");
      count.className = "title";
      count.textContent = String(entry[1]) + " findings";

      card.appendChild(title);
      card.appendChild(count);
      el.categoryList.appendChild(card);
    });
  }

  function renderFindings(result) {
    el.findingsList.innerHTML = "";

    if (!result || !Array.isArray(result.findings) || result.findings.length === 0) {
      const clean = document.createElement("div");
      clean.className = "card";
      clean.dataset.severity = "low";

      const cleanMeta = document.createElement("div");
      cleanMeta.className = "meta";
      cleanMeta.textContent = "No Findings";

      const cleanTitle = document.createElement("div");
      cleanTitle.className = "title";
      cleanTitle.textContent = "No major inconsistencies detected with current thresholds.";

      clean.appendChild(cleanMeta);
      clean.appendChild(cleanTitle);
      el.findingsList.appendChild(clean);
      return;
    }

    result.findings.slice(0, 30).forEach(function (finding) {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.severity = String(finding.severity || "medium");

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent =
        String(finding.severity || "medium").toUpperCase() +
        " | " +
        String(finding.ruleId || "");

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = String(finding.message || "");

      const delta = document.createElement("div");
      delta.className = "delta";
      delta.textContent =
        "Expected: " + String(finding.expected) + " | Actual: " + String(finding.actual);

      const selector = document.createElement("div");
      selector.className = "delta";
      selector.textContent = "Target: " + String(finding.selector || "(unknown)");

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(delta);
      card.appendChild(selector);

      if (finding.sourceHint && finding.sourceHint.property) {
        const hint = document.createElement("div");
        hint.className = "delta";
        const firstMatch =
          Array.isArray(finding.sourceHint.matches) && finding.sourceHint.matches.length
            ? finding.sourceHint.matches[0]
            : null;

        if (firstMatch) {
          hint.textContent =
            "Source: " +
            finding.sourceHint.property +
            " via " +
            firstMatch.selector +
            " (" +
            firstMatch.source +
            ")";
        } else {
          hint.textContent = "Source: " + finding.sourceHint.property + " (inline/computed)";
        }

        card.appendChild(hint);
      }

      if (
        finding.metadata &&
        Array.isArray(finding.metadata.suggestedFixes) &&
        finding.metadata.suggestedFixes.length
      ) {
        const contextual = document.createElement("div");
        contextual.className = "delta";
        contextual.textContent =
          "Context fixes: " +
          finding.metadata.suggestedFixes
            .slice(0, 2)
            .map(function (hint) {
              return String(hint.property || "") + "=" + String(hint.value || "");
            })
            .join(" | ");
        card.appendChild(contextual);
      }

      el.findingsList.appendChild(card);
    });
  }

  async function saveHistory(packaged) {
    try {
      await sendToRuntime({
        type: "ui-consistency:save-history",
        payload: packaged
      });
    } catch (error) {
      setStatus("History save failed: " + error.message, true);
    }
  }

  function formatTime(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return String(value || "");
    }
  }

  async function loadHistory() {
    try {
      const response = await sendToRuntime({ type: "ui-consistency:get-history" });
      if (!response.ok) {
        throw new Error(response.error || "Unable to load history");
      }
      state.history = response.payload || [];
      renderHistory();
    } catch (error) {
      setStatus("History load failed: " + error.message, true);
    }
  }

  function normalizeUrlForMatch(value) {
    if (!value) {
      return "";
    }
    try {
      const parsed = new URL(value);
      return parsed.origin + parsed.pathname;
    } catch (error) {
      return String(value);
    }
  }

  function handleProgressMessage(payload) {
    const data = payload || {};
    const activeUrl = normalizeUrlForMatch(state.activeTab && state.activeTab.url);
    const payloadUrl = normalizeUrlForMatch(data.url);
    if (activeUrl && payloadUrl && activeUrl !== payloadUrl) {
      return;
    }

    const stage = String(data.stage || "").toLowerCase();
    const active = stage !== "complete" && stage !== "done" && stage !== "error";
    setScanProgress(data.value, stage, data.detail, active);
  }

  function createHistoryCard(entry) {
    const node = document.createElement("article");
    node.className = "history-card";

    const url = entry.url ? entry.url.replace(/^https?:\/\//, "") : "";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatTime(entry.scannedAt);

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = entry.title || "Untitled";

    const compactUrl = document.createElement("div");
    compactUrl.className = "delta";
    compactUrl.textContent = url.slice(0, 72);

    const score = document.createElement("div");
    score.className = "delta";
    score.textContent =
      "Score: " +
      String(entry.summary.consistencyScore) +
      " | Findings: " +
      String(entry.summary.total);

    node.appendChild(meta);
    node.appendChild(title);
    node.appendChild(compactUrl);
    node.appendChild(score);

    const button = document.createElement("button");
    button.className = "ghost-btn";
    button.textContent = "Show This Scan Overlay";
    button.addEventListener("click", function () {
      showHistoryEntry(entry);
    });
    node.appendChild(button);

    return node;
  }

  function renderHistory() {
    el.historyList.innerHTML = "";

    const currentUrl = state.activeTab && state.activeTab.url ? state.activeTab.url : "";
    const preferred = state.history
      .filter(function (entry) {
        return entry.url === currentUrl;
      })
      .slice(0, 4);

    const fallback = state.history
      .filter(function (entry) {
        return entry.url !== currentUrl;
      })
      .slice(0, 6);

    const combined = preferred.concat(fallback);
    if (!combined.length) {
      const empty = document.createElement("div");
      empty.className = "history-card";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = "No scan history yet.";
      empty.appendChild(title);
      el.historyList.appendChild(empty);
      return;
    }

    combined.forEach(function (entry) {
      el.historyList.appendChild(createHistoryCard(entry));
    });
  }

  function applyResultToUI(result) {
    renderSummary(result);
    renderFindings(result);
    renderCategoryBreakdown(result);
    renderFixes(result);
  }

  async function showHistoryEntry(entry) {
    try {
      if (!state.activeTab) {
        throw new Error("No active tab found.");
      }

      if (entry.url && state.activeTab.url !== entry.url) {
        setStatus("Open the page for this history entry to overlay it.", true);
        return;
      }

      await sendToTab({
        type: "ui-consistency:show-result",
        payload: { result: entry.result }
      });

      await sendToTab({
        type: "ui-consistency:overlay",
        payload: {
          overlay: overlayPatchFromUI(),
          visible: shouldOverlayBeVisible(overlayPatchFromUI())
        }
      });

      applyResultToUI(entry.result);
      state.currentResult = { result: entry.result };
      setStatus("Loaded history overlay.", false);
    } catch (error) {
      setStatus("Could not show history overlay: " + error.message, true);
    }
  }

  async function runScan() {
    try {
      el.scanBtn.disabled = true;
      el.scanBtn.textContent = "Scanning...";
      setScanProgress(2, "start", "Initializing scan", true);
      setStatus("Scanning current page. Large pages can take a few seconds.", false);

      const overlayPatch = overlayPatchFromUI();
      state.config.overlay = utils.deepMerge(state.config.overlay, overlayPatch);

      const response = await sendToTab({
        type: "ui-consistency:run-scan",
        config: {
          overlay: overlayPatch
        }
      });

      if (!response.ok || !response.payload || !response.payload.result) {
        throw new Error(response.error || "Scan failed.");
      }

      const packaged = response.payload;
      state.currentResult = packaged;
      applyResultToUI(packaged.result);

      await saveHistory(packaged);
      await loadHistory();

      setStatus(
        "Scan complete: " +
          packaged.result.summary.total +
          " findings | score " +
          packaged.result.summary.consistencyScore,
        false
      );
      setScanProgress(100, "complete", "Scan complete", false);
    } catch (error) {
      setStatus("Scan failed: " + error.message, true);
      setScanProgress(100, "error", error.message, false);
    } finally {
      el.scanBtn.disabled = false;
      el.scanBtn.textContent = "Run Granular Scan";
    }
  }

  async function updateOverlay() {
    try {
      await sendToTab({
        type: "ui-consistency:overlay",
        payload: {
          overlay: overlayPatchFromUI(),
          visible: shouldOverlayBeVisible(overlayPatchFromUI())
        }
      });
      setStatus("Overlay settings updated.", false);
    } catch (error) {
      setStatus("Overlay update failed: " + error.message, true);
    }
  }

  async function applyFixes() {
    if (!state.currentFixCss.trim()) {
      setStatus("No generated CSS fixes available. Run a scan first.", true);
      return;
    }

    try {
      const response = await sendToTab({
        type: "ui-consistency:apply-fixes",
        payload: {
          cssText: state.currentFixCss
        }
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to apply fixes.");
      }

      setStatus("Injected generated CSS fixes into the current page.", false);
    } catch (error) {
      setStatus("Apply fixes failed: " + error.message, true);
    }
  }

  async function clearInjectedFixes() {
    try {
      const response = await sendToTab({ type: "ui-consistency:clear-fixes" });
      if (!response.ok) {
        throw new Error(response.error || "Failed to clear fixes.");
      }
      setStatus("Cleared injected fix CSS from the page.", false);
    } catch (error) {
      setStatus("Clear fixes failed: " + error.message, true);
    }
  }

  async function resetView() {
    try {
      const response = await sendToTab({ type: "ui-consistency:reset-view" });
      if (!response.ok) {
        throw new Error(response.error || "Failed to reset view.");
      }

      state.currentResult = null;
      state.currentFixCss = "";
      applyResultToUI(null);
      setScanProgress(0, "idle", "View reset", false);
      setStatus("Overlay hidden and page state reset for this tab.", false);
    } catch (error) {
      setStatus("Reset view failed: " + error.message, true);
    }
  }

  async function copyFixes() {
    if (!state.currentFixCss.trim()) {
      setStatus("No CSS to copy yet.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(state.currentFixCss);
      setStatus("Copied generated CSS fixes to clipboard.", false);
    } catch (error) {
      setStatus("Clipboard write failed: " + error.message, true);
    }
  }

  function downloadFixes() {
    if (!state.currentFixCss.trim()) {
      setStatus("No CSS to download yet.", true);
      return;
    }

    const blob = new Blob([state.currentFixCss], {
      type: "text/css;charset=utf-8"
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "ui-consistency-fixes-" + Date.now() + ".css";
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Downloaded CSS fixes file.", false);
  }

  function exportJson() {
    if (!state.currentResult) {
      setStatus("Run a scan first to export results.", true);
      return;
    }

    const blob = new Blob([JSON.stringify(state.currentResult, null, 2)], {
      type: "application/json"
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "ui-consistency-scan-" + Date.now() + ".json";
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Exported JSON report.", false);
  }

  async function clearHistory() {
    try {
      await sendToRuntime({ type: "ui-consistency:clear-history" });
      state.history = [];
      renderHistory();
      setStatus("History cleared.", false);
    } catch (error) {
      setStatus("Could not clear history: " + error.message, true);
    }
  }

  async function init() {
    if (globalThis.UIConsistencyUI && typeof globalThis.UIConsistencyUI.enhanceFormControls === "function") {
      globalThis.UIConsistencyUI.enhanceFormControls(document);
    }

    state.activeTab = await getActiveTab();
    await loadConfig();
    setOverlayUI(state.config.overlay);
    setScanProgress(0, "idle", "Ready for scan", false);
    applyResultToUI(null);
    await loadHistory();

    el.scanBtn.addEventListener("click", runScan);
    el.resetViewBtn.addEventListener("click", resetView);
    el.optionsBtn.addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });
    el.exportBtn.addEventListener("click", exportJson);
    el.refreshHistoryBtn.addEventListener("click", loadHistory);
    el.clearHistoryBtn.addEventListener("click", clearHistory);

    el.applyFixesBtn.addEventListener("click", applyFixes);
    el.copyFixesBtn.addEventListener("click", copyFixes);
    el.downloadFixesBtn.addEventListener("click", downloadFixes);
    el.clearFixesBtn.addEventListener("click", clearInjectedFixes);

    [
      el.toggleHighlights,
      el.toggleRulers,
      el.toggleLabels,
      el.togglePanel,
      el.severityFilter
    ].forEach(function (node) {
      node.addEventListener("change", updateOverlay);
    });

    el.maxVisibleFindingsQuick.addEventListener("input", function () {
      el.maxVisibleFindingsValue.textContent = String(
        Math.round(Number.parseFloat(el.maxVisibleFindingsQuick.value) || 0)
      );
    });
    el.maxVisibleFindingsQuick.addEventListener("change", updateOverlay);

    chrome.runtime.onMessage.addListener(function (message) {
      if (!message || message.type !== "ui-consistency:scan-progress") {
        return;
      }
      handleProgressMessage(message.payload || {});
    });

    setStatus("Ready. Run a scan to generate findings and fix CSS.", false);
  }

  init();
})();
