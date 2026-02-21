(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  /* ================================================================
     State
     ================================================================ */

  const state = {
    activeTab: null,
    config: utils.deepClone(root.DEFAULT_CONFIG),
    currentResult: null,
    currentFixCss: "",
    history: [],
    appliedIndividualFixes: {},
    progress: {
      value: 0,
      stage: "Idle",
      detail: "Ready for scan",
      active: false,
      updatedAt: 0
    }
  };

  /* ================================================================
     Element References
     ================================================================ */

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
    maxVisibleFindingsValue: document.getElementById("maxVisibleFindingsValue"),
    frameworkPrimaryChip: document.getElementById("frameworkPrimaryChip"),
    frameworkList: document.getElementById("frameworkList"),
    recommendationCount: document.getElementById("recommendationCount"),
    recommendationList: document.getElementById("recommendationList"),
    frameworkOverride: document.getElementById("frameworkOverride"),
    frameworkOverrideStatus: document.getElementById("frameworkOverrideStatus")
  };

  /* ================================================================
     Status
     ================================================================ */

  function setStatus(text, isError) {
    el.status.textContent = text;
    el.status.style.color = isError ? "#ffd1cc" : "#afbad1";
  }

  /* ================================================================
     Scan Progress
     ================================================================ */

  function toProgressLabel(stage) {
    var map = {
      start: "Boot",
      prepare: "Prep",
      collect: "Collect",
      group: "Group",
      framework: "Framework",
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
    var numeric = Number.parseFloat(value);
    var bounded = Number.isFinite(numeric)
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

  /* ================================================================
     Chrome Helpers
     ================================================================ */

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
        var stored = data && data[root.CONFIG_KEYS.sync] ? data[root.CONFIG_KEYS.sync] : {};
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

  /* ================================================================
     Overlay Helpers
     ================================================================ */

  function overlayPatchFromUI() {
    var maxVisible = Number.parseFloat(el.maxVisibleFindingsQuick.value);
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
    var maxVisible =
      Number.isFinite(Number.parseFloat(overlay.maxVisibleFindings))
        ? Math.round(Number.parseFloat(overlay.maxVisibleFindings))
        : 250;
    el.maxVisibleFindingsQuick.value = String(maxVisible);
    el.maxVisibleFindingsValue.textContent = String(maxVisible);
  }

  /* ================================================================
     Framework Override
     ================================================================ */

  function getFrameworkOverrideConfig() {
    var selected = el.frameworkOverride.value;
    var isAuto = selected === "auto";
    return {
      enabled: !isAuto,
      primaryFramework: selected,
      preferredChannels: []
    };
  }

  function syncFrameworkOverrideStatus() {
    var selected = el.frameworkOverride.value;
    if (selected === "auto") {
      el.frameworkOverrideStatus.textContent = "Override: off (auto-detect active)";
      el.frameworkOverrideStatus.style.color = "#9ea8bf";
    } else {
      var label = el.frameworkOverride.options[el.frameworkOverride.selectedIndex].text;
      el.frameworkOverrideStatus.textContent = "Override: " + label + " (manual)";
      el.frameworkOverrideStatus.style.color = "#c6f8f0";
    }
  }

  function restoreFrameworkOverride() {
    var overrideCfg = state.config.frameworkOverride;
    if (overrideCfg && overrideCfg.enabled && overrideCfg.primaryFramework !== "auto") {
      el.frameworkOverride.value = overrideCfg.primaryFramework;
    } else {
      el.frameworkOverride.value = "auto";
    }
    syncFrameworkOverrideStatus();
  }

  function saveFrameworkOverrideToConfig() {
    var overrideCfg = getFrameworkOverrideConfig();
    state.config.frameworkOverride = overrideCfg;

    var payload = {};
    payload[root.CONFIG_KEYS.sync] = state.config;
    chrome.storage.sync.set(payload);
  }

  /* ================================================================
     Collapsible Section State Persistence
     ================================================================ */

  var SECTION_STATE_KEY = "uiConsistencySidepanelSections";

  function persistCollapsibleState() {
    var sections = document.querySelectorAll(".section-collapsible[data-section]");
    var sectionState = {};
    sections.forEach(function (details) {
      sectionState[details.dataset.section] = details.open;
    });
    var storageObj = {};
    storageObj[SECTION_STATE_KEY] = sectionState;
    chrome.storage.local.set(storageObj);
  }

  function restoreCollapsibleState() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(SECTION_STATE_KEY, function (data) {
        var sectionState = data && data[SECTION_STATE_KEY] ? data[SECTION_STATE_KEY] : null;
        if (!sectionState) {
          resolve();
          return;
        }
        var sections = document.querySelectorAll(".section-collapsible[data-section]");
        sections.forEach(function (details) {
          var key = details.dataset.section;
          if (key in sectionState) {
            details.open = !!sectionState[key];
          }
        });
        resolve();
      });
    });
  }

  function bindCollapsibleToggle() {
    var sections = document.querySelectorAll(".section-collapsible[data-section]");
    sections.forEach(function (details) {
      details.addEventListener("toggle", function () {
        persistCollapsibleState();
      });
    });
  }

  /* ================================================================
     Render: Summary
     ================================================================ */

  function renderSummary(result) {
    var summary = result && result.summary
      ? result.summary
      : { consistencyScore: "-", total: "-", critical: 0, high: 0, medium: 0, low: 0 };
    var meta = result && result.meta ? result.meta : { inspectedElements: "-" };

    el.score.textContent = summary.consistencyScore;
    el.findingsTotal.textContent = summary.total;
    el.elementsTotal.textContent = meta.inspectedElements;
  }

  /* ================================================================
     Render: Fixes
     ================================================================ */

  function renderFixes(result) {
    var fixes = result && result.fixes
      ? result.fixes
      : { cssText: "", rules: [], disabled: false };
    state.currentFixCss = String(fixes.cssText || "");

    var ruleCount = Array.isArray(fixes.rules) ? fixes.rules.length : 0;
    el.fixRuleCount.textContent = ruleCount + " rule" + (ruleCount === 1 ? "" : "s");
    el.fixCssPreview.value = fixes.disabled
      ? "Fix generation is disabled in Advanced Config > Auto Fix Generator."
      : state.currentFixCss;

    var hasFixes = state.currentFixCss.trim().length > 0;
    el.applyFixesBtn.disabled = !hasFixes;
    el.copyFixesBtn.disabled = !hasFixes;
    el.downloadFixesBtn.disabled = !hasFixes;
  }

  /* ================================================================
     Render: Framework Profile
     ================================================================ */

  function frameworkReportFromResult(result) {
    var fromResult = result && result.frameworks ? result.frameworks : null;
    var fromFixes = result && result.fixes && result.fixes.frameworkProfile
      ? result.fixes.frameworkProfile
      : null;
    var report = fromResult || fromFixes || null;
    if (!report) {
      return {
        primary: null,
        detected: [],
        caveats: []
      };
    }
    return {
      primary: report.primary || null,
      detected: Array.isArray(report.detected) ? report.detected : [],
      caveats: Array.isArray(report.caveats) ? report.caveats : []
    };
  }

  function clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  function renderFrameworkProfile(result) {
    var report = frameworkReportFromResult(result);
    clearContainer(el.frameworkList);

    var overrideCfg = getFrameworkOverrideConfig();

    if (!report.primary && !report.detected.length) {
      el.frameworkPrimaryChip.textContent = overrideCfg.enabled
        ? el.frameworkOverride.options[el.frameworkOverride.selectedIndex].text + " (override)"
        : "Unknown";

      var empty = document.createElement("article");
      empty.className = "framework-card";
      var title = document.createElement("div");
      title.className = "framework-name";
      title.textContent = overrideCfg.enabled
        ? "Manual override active: " + el.frameworkOverride.options[el.frameworkOverride.selectedIndex].text
        : "No strong framework signature";
      var meta = document.createElement("div");
      meta.className = "framework-meta";
      meta.textContent = overrideCfg.enabled
        ? "Recommendations will target " + el.frameworkOverride.options[el.frameworkOverride.selectedIndex].text + " patterns."
        : "Scan a richer surface or increase selector coverage in Advanced Config.";
      empty.appendChild(title);
      empty.appendChild(meta);
      el.frameworkList.appendChild(empty);
      return;
    }

    var primaryLabel = report.primary
      ? String(report.primary.name || report.primary.id || "Unknown")
      : "Unknown";
    var primaryConfidence = report.primary
      ? Number.parseFloat(report.primary.confidence) || 0
      : 0;

    if (overrideCfg.enabled) {
      el.frameworkPrimaryChip.textContent =
        el.frameworkOverride.options[el.frameworkOverride.selectedIndex].text + " (override)";
    } else {
      el.frameworkPrimaryChip.textContent =
        primaryLabel + " " + Math.round(primaryConfidence * 100) + "%";
    }

    report.detected.slice(0, 5).forEach(function (framework) {
      var card = document.createElement("article");
      card.className = "framework-card";

      var head = document.createElement("div");
      head.className = "framework-head";

      var name = document.createElement("div");
      name.className = "framework-name";
      name.textContent = String(framework.name || framework.id || "Unknown");

      var confidence = document.createElement("div");
      confidence.className = "framework-confidence";
      confidence.textContent =
        Math.round((Number.parseFloat(framework.confidence) || 0) * 100) + "%";

      head.appendChild(name);
      head.appendChild(confidence);

      var fwMeta = document.createElement("div");
      fwMeta.className = "framework-meta";
      var channelText = Array.isArray(framework.preferredChannels)
        ? framework.preferredChannels.slice(0, 2).join(" | ")
        : "scoped-css";
      fwMeta.textContent = "Preferred channels: " + channelText;

      var caveat = document.createElement("div");
      caveat.className = "framework-caveat";
      caveat.textContent = String(
        framework.caveat || "No caveat captured for this framework."
      );

      card.appendChild(head);
      card.appendChild(fwMeta);
      card.appendChild(caveat);

      if (Array.isArray(framework.evidence) && framework.evidence.length) {
        var evidence = document.createElement("div");
        evidence.className = "framework-meta";
        evidence.textContent =
          "Evidence: " + framework.evidence.slice(0, 2).join(" | ");
        card.appendChild(evidence);
      }

      el.frameworkList.appendChild(card);
    });
  }

  /* ================================================================
     Render: Recommendations (Enhanced)
     ================================================================ */

  function buildCssSnippetForRec(rec) {
    var selector = String(rec.selector || "/* unknown */");
    var declarations = Array.isArray(rec.declarations) ? rec.declarations : [];
    if (!declarations.length) {
      return "";
    }
    var lines = [selector + " {"];
    declarations.forEach(function (decl) {
      lines.push("  " + String(decl.property || "") + ": " + String(decl.value || "") + ";");
    });
    lines.push("}");
    return lines.join("\n");
  }

  function buildIndividualFixCss(rec) {
    var selector = String(rec.selector || "");
    var declarations = Array.isArray(rec.declarations) ? rec.declarations : [];
    if (!selector || !declarations.length) {
      return "";
    }
    var lines = [selector + " {"];
    declarations.forEach(function (decl) {
      var prop = String(decl.property || "");
      var val = String(decl.value || "");
      if (prop && val) {
        lines.push("  " + prop + ": " + val + " !important;");
      }
    });
    lines.push("}");
    return lines.join("\n");
  }

  function renderRecommendations(result) {
    var recommendations =
      result &&
      result.fixes &&
      result.fixes.recommendations &&
      Array.isArray(result.fixes.recommendations.top)
        ? result.fixes.recommendations
        : {
            total: 0,
            top: [],
            channelDistribution: []
          };
    var top = recommendations.top.slice(0, 10);
    clearContainer(el.recommendationList);
    el.recommendationCount.textContent = String(top.length);

    if (!top.length) {
      var emptyCard = document.createElement("div");
      emptyCard.className = "card";
      emptyCard.dataset.severity = "low";
      var emptyTitle = document.createElement("div");
      emptyTitle.className = "title";
      emptyTitle.textContent = "No fix recommendations available yet.";
      var emptyDetail = document.createElement("div");
      emptyDetail.className = "delta";
      emptyDetail.textContent = "Run a scan with Auto CSS Fixes enabled.";
      emptyCard.appendChild(emptyTitle);
      emptyCard.appendChild(emptyDetail);
      el.recommendationList.appendChild(emptyCard);
      return;
    }

    top.forEach(function (rec, index) {
      var card = document.createElement("article");
      card.className = "card recommendation-card";
      card.dataset.severity = String(rec.severity || "medium");

      /* Meta line */
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent =
        String(rec.severity || "medium").toUpperCase() +
        " | " +
        String(rec.framework || "generic") +
        " | score " +
        String(rec.priority || "-");

      /* Selector title */
      var title = document.createElement("div");
      title.className = "title";
      title.textContent = String(rec.selector || "(selector unavailable)");

      /* Chip row: risk, channel, confidence */
      var chipRow = document.createElement("div");
      chipRow.className = "recommendation-chip-row";

      var riskChip = document.createElement("span");
      riskChip.className = "mini-chip risk-" + String(rec.risk || "medium");
      riskChip.textContent = "risk " + String(rec.risk || "medium");
      chipRow.appendChild(riskChip);

      var channelChip = document.createElement("span");
      channelChip.className = "mini-chip";
      var firstChannel =
        Array.isArray(rec.channels) && rec.channels.length
          ? rec.channels[0]
          : "scoped-css";
      channelChip.textContent = firstChannel;
      chipRow.appendChild(channelChip);

      var confidenceChip = document.createElement("span");
      confidenceChip.className = "mini-chip";
      confidenceChip.textContent =
        "conf " + String(rec.confidence || 0) + " | stable " + String(rec.stability || 0);
      chipRow.appendChild(confidenceChip);

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(chipRow);

      /* Before/After property values */
      var declarations = Array.isArray(rec.declarations) ? rec.declarations : [];
      if (declarations.length) {
        var propDelta = document.createElement("div");
        propDelta.className = "rec-property-delta";

        declarations.slice(0, 4).forEach(function (decl) {
          var propLabel = document.createElement("span");
          propLabel.className = "prop-label";
          propLabel.textContent = String(decl.property || "");

          var beforeVal = document.createElement("span");
          beforeVal.className = "prop-value prop-before";
          beforeVal.textContent = String(decl.actual || decl.from || "n/a");

          var afterLabel = document.createElement("span");
          afterLabel.className = "prop-label";
          afterLabel.textContent = "";

          var afterVal = document.createElement("span");
          afterVal.className = "prop-value prop-after";
          afterVal.textContent = String(decl.value || "");

          propDelta.appendChild(propLabel);
          propDelta.appendChild(beforeVal);
          propDelta.appendChild(afterLabel);
          propDelta.appendChild(afterVal);
        });

        card.appendChild(propDelta);
      }

      /* Declarations summary */
      var decl = document.createElement("div");
      decl.className = "delta";
      var declarationPreview = declarations
        .slice(0, 3)
        .map(function (item) {
          return String(item.property || "") + ": " + String(item.value || "");
        })
        .join("; ");
      decl.textContent =
        "Patch: " +
        (declarationPreview || "No declaration preview") +
        " | issues " +
        String(rec.issueCount || 0);
      card.appendChild(decl);

      /* Code snippet */
      var snippet = buildCssSnippetForRec(rec);
      if (snippet) {
        var codeBlock = document.createElement("div");
        codeBlock.className = "rec-code-snippet";
        codeBlock.textContent = snippet;
        card.appendChild(codeBlock);
      }

      /* Guidance */
      if (rec.guidance) {
        var guidance = document.createElement("div");
        guidance.className = "rec-guidance";
        guidance.textContent = String(rec.guidance);
        card.appendChild(guidance);
      }

      /* Framework-specific implementation guidance */
      if (rec.implementationHint) {
        var implHint = document.createElement("div");
        implHint.className = "rec-guidance";
        implHint.textContent = "Implementation: " + String(rec.implementationHint);
        card.appendChild(implHint);
      }

      /* Caveat */
      if (rec.caveat) {
        var caveatEl = document.createElement("div");
        caveatEl.className = "rec-caveat";
        caveatEl.textContent = "Caveat: " + String(rec.caveat);
        card.appendChild(caveatEl);
      }

      /* Apply This Fix button */
      var fixId = "rec-fix-" + index;
      var applyBtn = document.createElement("button");
      applyBtn.className = "apply-fix-btn";
      applyBtn.dataset.fixId = fixId;
      applyBtn.dataset.recIndex = String(index);

      if (state.appliedIndividualFixes[fixId]) {
        applyBtn.textContent = "Applied";
        applyBtn.classList.add("applied");
        applyBtn.disabled = true;
      } else {
        applyBtn.textContent = "Apply This Fix";
      }

      applyBtn.addEventListener("click", function () {
        applyIndividualFix(rec, fixId, applyBtn);
      });

      card.appendChild(applyBtn);

      el.recommendationList.appendChild(card);
    });
  }

  /* ================================================================
     Apply Individual Fix
     ================================================================ */

  async function applyIndividualFix(rec, fixId, buttonEl) {
    var cssText = buildIndividualFixCss(rec);
    if (!cssText) {
      setStatus("No CSS could be generated for this recommendation.", true);
      return;
    }

    try {
      var response = await sendToTab({
        type: "ui-consistency:apply-fixes",
        payload: {
          cssText: cssText
        }
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to apply individual fix.");
      }

      state.appliedIndividualFixes[fixId] = true;
      buttonEl.textContent = "Applied";
      buttonEl.classList.add("applied");
      buttonEl.disabled = true;
      setStatus("Applied individual fix: " + String(rec.selector || fixId), false);
    } catch (error) {
      setStatus("Failed to apply fix: " + error.message, true);
    }
  }

  /* ================================================================
     Render: Category Breakdown
     ================================================================ */

  function renderCategoryBreakdown(result) {
    clearContainer(el.categoryList);

    if (!result || !result.breakdown || !result.breakdown.byCategory) {
      var empty = document.createElement("div");
      empty.className = "history-card";
      empty.textContent = "No category data yet.";
      el.categoryList.appendChild(empty);
      return;
    }

    var entries = Object.entries(result.breakdown.byCategory)
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 8);

    if (!entries.length) {
      var emptyCard = document.createElement("div");
      emptyCard.className = "history-card";
      emptyCard.textContent = "No category findings.";
      el.categoryList.appendChild(emptyCard);
      return;
    }

    entries.forEach(function (entry) {
      var card = document.createElement("article");
      card.className = "history-card";

      var title = document.createElement("div");
      title.className = "meta";
      title.textContent = entry[0];

      var count = document.createElement("div");
      count.className = "title";
      count.textContent = String(entry[1]) + " findings";

      card.appendChild(title);
      card.appendChild(count);
      el.categoryList.appendChild(card);
    });
  }

  /* ================================================================
     Render: Findings
     ================================================================ */

  function renderFindings(result) {
    clearContainer(el.findingsList);

    if (!result || !Array.isArray(result.findings) || result.findings.length === 0) {
      var clean = document.createElement("div");
      clean.className = "card";
      clean.dataset.severity = "low";

      var cleanMeta = document.createElement("div");
      cleanMeta.className = "meta";
      cleanMeta.textContent = "No Findings";

      var cleanTitle = document.createElement("div");
      cleanTitle.className = "title";
      cleanTitle.textContent = "No major inconsistencies detected with current thresholds.";

      clean.appendChild(cleanMeta);
      clean.appendChild(cleanTitle);
      el.findingsList.appendChild(clean);
      return;
    }

    result.findings.slice(0, 30).forEach(function (finding) {
      var card = document.createElement("article");
      card.className = "card";
      card.dataset.severity = String(finding.severity || "medium");

      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent =
        String(finding.severity || "medium").toUpperCase() +
        " | " +
        String(finding.ruleId || "");

      var title = document.createElement("div");
      title.className = "title";
      title.textContent = String(finding.message || "");

      var delta = document.createElement("div");
      delta.className = "delta";
      delta.textContent =
        "Expected: " + String(finding.expected) + " | Actual: " + String(finding.actual);

      var selector = document.createElement("div");
      selector.className = "delta";
      selector.textContent = "Target: " + String(finding.selector || "(unknown)");

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(delta);
      card.appendChild(selector);

      if (finding.sourceHint && finding.sourceHint.property) {
        var hint = document.createElement("div");
        hint.className = "delta";
        var firstMatch =
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
        var contextual = document.createElement("div");
        contextual.className = "delta";
        contextual.textContent =
          "Context fixes: " +
          finding.metadata.suggestedFixes
            .slice(0, 2)
            .map(function (fixHint) {
              return String(fixHint.property || "") + "=" + String(fixHint.value || "");
            })
            .join(" | ");
        card.appendChild(contextual);
      }

      el.findingsList.appendChild(card);
    });
  }

  /* ================================================================
     History
     ================================================================ */

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
      var response = await sendToRuntime({ type: "ui-consistency:get-history" });
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
      var parsed = new URL(value);
      return parsed.origin + parsed.pathname;
    } catch (error) {
      return String(value);
    }
  }

  function handleProgressMessage(payload) {
    var data = payload || {};
    var activeUrl = normalizeUrlForMatch(state.activeTab && state.activeTab.url);
    var payloadUrl = normalizeUrlForMatch(data.url);
    if (activeUrl && payloadUrl && activeUrl !== payloadUrl) {
      return;
    }

    var stage = String(data.stage || "").toLowerCase();
    var active = stage !== "complete" && stage !== "done" && stage !== "error";
    setScanProgress(data.value, stage, data.detail, active);
  }

  function createHistoryCard(entry) {
    var node = document.createElement("article");
    node.className = "history-card";

    var url = entry.url ? entry.url.replace(/^https?:\/\//, "") : "";

    var meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatTime(entry.scannedAt);

    var title = document.createElement("div");
    title.className = "title";
    title.textContent = entry.title || "Untitled";

    var compactUrl = document.createElement("div");
    compactUrl.className = "delta";
    compactUrl.textContent = url.slice(0, 72);

    var score = document.createElement("div");
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

    var button = document.createElement("button");
    button.className = "ghost-btn";
    button.textContent = "Show This Scan Overlay";
    button.addEventListener("click", function () {
      showHistoryEntry(entry);
    });
    node.appendChild(button);

    return node;
  }

  function renderHistory() {
    clearContainer(el.historyList);

    var currentUrl = state.activeTab && state.activeTab.url ? state.activeTab.url : "";
    var preferred = state.history
      .filter(function (entry) {
        return entry.url === currentUrl;
      })
      .slice(0, 4);

    var fallback = state.history
      .filter(function (entry) {
        return entry.url !== currentUrl;
      })
      .slice(0, 6);

    var combined = preferred.concat(fallback);
    if (!combined.length) {
      var empty = document.createElement("div");
      empty.className = "history-card";
      var emptyTitle = document.createElement("div");
      emptyTitle.className = "title";
      emptyTitle.textContent = "No scan history yet.";
      empty.appendChild(emptyTitle);
      el.historyList.appendChild(empty);
      return;
    }

    combined.forEach(function (entry) {
      el.historyList.appendChild(createHistoryCard(entry));
    });
  }

  /* ================================================================
     Composite Render
     ================================================================ */

  function applyResultToUI(result) {
    renderSummary(result);
    renderFrameworkProfile(result);
    renderRecommendations(result);
    renderFindings(result);
    renderCategoryBreakdown(result);
    renderFixes(result);
  }

  /* ================================================================
     Show History Entry
     ================================================================ */

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

  /* ================================================================
     Actions: Run Scan
     ================================================================ */

  async function runScan() {
    try {
      el.scanBtn.disabled = true;
      el.scanBtn.textContent = "Scanning...";
      setScanProgress(2, "start", "Initializing scan", true);
      setStatus("Scanning current page. Large pages can take a few seconds.", false);

      /* Reset individual fix tracking for new scan */
      state.appliedIndividualFixes = {};

      var overlayPatch = overlayPatchFromUI();
      state.config.overlay = utils.deepMerge(state.config.overlay, overlayPatch);

      /* Build framework override config */
      var frameworkOverrideCfg = getFrameworkOverrideConfig();
      state.config.frameworkOverride = frameworkOverrideCfg;

      var response = await sendToTab({
        type: "ui-consistency:run-scan",
        config: {
          overlay: overlayPatch,
          frameworkOverride: frameworkOverrideCfg
        }
      });

      if (!response.ok || !response.payload || !response.payload.result) {
        throw new Error(response.error || "Scan failed.");
      }

      var packaged = response.payload;
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

  /* ================================================================
     Actions: Overlay
     ================================================================ */

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

  /* ================================================================
     Actions: Apply / Copy / Download / Clear Fixes
     ================================================================ */

  async function applyFixes() {
    if (!state.currentFixCss.trim()) {
      setStatus("No generated CSS fixes available. Run a scan first.", true);
      return;
    }

    try {
      var response = await sendToTab({
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
      var response = await sendToTab({ type: "ui-consistency:clear-fixes" });
      if (!response.ok) {
        throw new Error(response.error || "Failed to clear fixes.");
      }

      /* Reset applied individual fixes tracking */
      state.appliedIndividualFixes = {};
      setStatus("Cleared injected fix CSS from the page.", false);

      /* Re-render recommendations to reset button states */
      if (state.currentResult && state.currentResult.result) {
        renderRecommendations(state.currentResult.result);
      }
    } catch (error) {
      setStatus("Clear fixes failed: " + error.message, true);
    }
  }

  async function resetView() {
    try {
      var response = await sendToTab({ type: "ui-consistency:reset-view" });
      if (!response.ok) {
        throw new Error(response.error || "Failed to reset view.");
      }

      state.currentResult = null;
      state.currentFixCss = "";
      state.appliedIndividualFixes = {};
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

    var blob = new Blob([state.currentFixCss], {
      type: "text/css;charset=utf-8"
    });
    var href = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
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

    var blob = new Blob([JSON.stringify(state.currentResult, null, 2)], {
      type: "application/json"
    });
    var href = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
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

  /* ================================================================
     Tab Change Listener (side panel stays open across tabs)
     ================================================================ */

  function listenForTabChanges() {
    if (chrome.tabs && chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(async function () {
        state.activeTab = await getActiveTab();
        await loadHistory();
      });
    }
  }

  /* ================================================================
     Init
     ================================================================ */

  async function init() {
    /* Enhance form controls with custom elements */
    if (globalThis.UIConsistencyUI && typeof globalThis.UIConsistencyUI.enhanceFormControls === "function") {
      globalThis.UIConsistencyUI.enhanceFormControls(document);
    }

    /* Restore collapsible section state */
    await restoreCollapsibleState();
    bindCollapsibleToggle();

    /* Get active tab and config */
    state.activeTab = await getActiveTab();
    await loadConfig();

    /* Restore UI from config */
    setOverlayUI(state.config.overlay);
    restoreFrameworkOverride();
    setScanProgress(0, "idle", "Ready for scan", false);
    applyResultToUI(null);
    await loadHistory();

    /* ---- Event Bindings ---- */

    /* Scan controls */
    el.scanBtn.addEventListener("click", runScan);
    el.resetViewBtn.addEventListener("click", resetView);
    el.optionsBtn.addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });

    /* Export / History */
    el.exportBtn.addEventListener("click", exportJson);
    el.refreshHistoryBtn.addEventListener("click", loadHistory);
    el.clearHistoryBtn.addEventListener("click", clearHistory);

    /* Fix actions */
    el.applyFixesBtn.addEventListener("click", applyFixes);
    el.copyFixesBtn.addEventListener("click", copyFixes);
    el.downloadFixesBtn.addEventListener("click", downloadFixes);
    el.clearFixesBtn.addEventListener("click", clearInjectedFixes);

    /* Overlay toggles */
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

    /* Framework override dropdown */
    el.frameworkOverride.addEventListener("change", function () {
      syncFrameworkOverrideStatus();
      saveFrameworkOverrideToConfig();
    });

    /* Progress messages from background/content scripts */
    chrome.runtime.onMessage.addListener(function (message) {
      if (!message || message.type !== "ui-consistency:scan-progress") {
        return;
      }
      handleProgressMessage(message.payload || {});
    });

    /* Tab change awareness */
    listenForTabChanges();

    setStatus("Ready. Run a scan to generate findings and fix CSS.", false);
  }

  init();
})();
