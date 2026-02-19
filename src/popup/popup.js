(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const state = {
    activeTab: null,
    config: utils.deepClone(root.DEFAULT_CONFIG),
    currentResult: null,
    history: []
  };

  const el = {
    scanBtn: document.getElementById("scanBtn"),
    optionsBtn: document.getElementById("optionsBtn"),
    exportBtn: document.getElementById("exportBtn"),
    refreshHistoryBtn: document.getElementById("refreshHistoryBtn"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    findingsList: document.getElementById("findingsList"),
    categoryList: document.getElementById("categoryList"),
    historyList: document.getElementById("historyList"),
    status: document.getElementById("status"),
    score: document.getElementById("score"),
    findingsTotal: document.getElementById("findingsTotal"),
    elementsTotal: document.getElementById("elementsTotal"),
    toggleHighlights: document.getElementById("toggleHighlights"),
    toggleRulers: document.getElementById("toggleRulers"),
    toggleLabels: document.getElementById("toggleLabels"),
    togglePanel: document.getElementById("togglePanel"),
    severityFilter: document.getElementById("severityFilter")
  };

  function setStatus(text, isError) {
    el.status.textContent = text;
    el.status.style.color = isError ? "#ff998d" : "#b0b8c4";
  }

  function severityColor(severity) {
    if (severity === "critical") {
      return "#de5a48";
    }
    if (severity === "high") {
      return "#ef9b2c";
    }
    if (severity === "low") {
      return "#79c27a";
    }
    return "#f0c35c";
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
    return {
      showHighlights: !!el.toggleHighlights.checked,
      showRulers: !!el.toggleRulers.checked,
      showLabels: !!el.toggleLabels.checked,
      showPanel: !!el.togglePanel.checked,
      severityFilter: el.severityFilter.value || "all"
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
      count.style.marginTop = "2px";
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
      clean.style.borderLeftColor = "#63bb86";
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
      card.style.borderLeftColor = severityColor(finding.severity);

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
        "Expected: " +
        String(finding.expected) +
        " | Actual: " +
        String(finding.actual);

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
      const response = await sendToRuntime({
        type: "ui-consistency:get-history"
      });
      if (!response.ok) {
        throw new Error(response.error || "Unable to load history");
      }
      state.history = response.payload || [];
      renderHistory();
    } catch (error) {
      setStatus("History load failed: " + error.message, true);
    }
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
    title.style.marginTop = "4px";
    title.style.fontSize = "12px";
    title.style.lineHeight = "1.3";
    title.textContent = entry.title || "Untitled";

    const compactUrl = document.createElement("div");
    compactUrl.className = "delta";
    compactUrl.style.marginTop = "3px";
    compactUrl.textContent = url.slice(0, 72);

    const score = document.createElement("div");
    score.className = "delta";
    score.style.marginTop = "6px";
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
      empty.innerHTML = '<div class="title">No scan history yet.</div>';
      el.historyList.appendChild(empty);
      return;
    }

    combined.forEach(function (entry) {
      el.historyList.appendChild(createHistoryCard(entry));
    });
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

      setStatus("Loaded history overlay.", false);
    } catch (error) {
      setStatus("Could not show history overlay: " + error.message, true);
    }
  }

  async function runScan() {
    try {
      el.scanBtn.disabled = true;
      el.scanBtn.textContent = "Scanning...";
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

      renderSummary(packaged.result);
      renderFindings(packaged.result);
      renderCategoryBreakdown(packaged.result);

      await saveHistory(packaged);
      await loadHistory();

      setStatus(
        "Scan complete: " +
          packaged.result.summary.total +
          " findings | score " +
          packaged.result.summary.consistencyScore,
        false
      );
    } catch (error) {
      setStatus("Scan failed: " + error.message, true);
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

  function exportJson() {
    if (!state.currentResult) {
      setStatus("Run a scan first to export results.", true);
      return;
    }

    const blob = new Blob([
      JSON.stringify(state.currentResult, null, 2)
    ], {
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
    state.activeTab = await getActiveTab();
    await loadConfig();
    setOverlayUI(state.config.overlay);
    renderSummary(null);
    renderFindings(null);
    renderCategoryBreakdown(null);
    await loadHistory();

    el.scanBtn.addEventListener("click", runScan);
    el.optionsBtn.addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });
    el.exportBtn.addEventListener("click", exportJson);
    el.refreshHistoryBtn.addEventListener("click", loadHistory);
    el.clearHistoryBtn.addEventListener("click", clearHistory);

    [
      el.toggleHighlights,
      el.toggleRulers,
      el.toggleLabels,
      el.togglePanel,
      el.severityFilter
    ].forEach(function (node) {
      node.addEventListener("change", updateOverlay);
    });

    setStatus("Ready.", false);
  }

  init();
})();
