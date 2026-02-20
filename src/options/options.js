(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const status = document.getElementById("status");

  const builderState = {
    rules: [],
    editIndex: -1
  };

  const builderEls = {
    ruleId: document.getElementById("builderRuleId"),
    type: document.getElementById("builderType"),
    severity: document.getElementById("builderSeverity"),
    selector: document.getElementById("builderSelector"),
    source: document.getElementById("builderSource"),
    property: document.getElementById("builderProperty"),
    operator: document.getElementById("builderOperator"),
    value: document.getElementById("builderValue"),
    tolerance: document.getElementById("builderTolerance"),
    baseline: document.getElementById("builderBaseline"),
    message: document.getElementById("builderMessage"),
    addBtn: document.getElementById("builderAddBtn"),
    clearBtn: document.getElementById("builderClearBtn"),
    syncBtn: document.getElementById("builderSyncToJsonBtn"),
    loadBtn: document.getElementById("builderLoadFromJsonBtn"),
    mode: document.getElementById("builderMode"),
    list: document.getElementById("ruleBuilderList")
  };

  const textFields = [
    { id: "includeSelectors", path: "scanning.includeSelectors" },
    { id: "excludeSelectors", path: "scanning.excludeSelectors" },
    { id: "customRulesJson", path: "customRules.json" }
  ];

  const scaleFields = [
    { id: "spacingScale", path: "designTokens.spacingScale" },
    { id: "radiusScale", path: "designTokens.radiusScale" },
    { id: "fontScale", path: "designTokens.fontScale" }
  ];

  const selectFields = [{ id: "severityFilter", path: "overlay.severityFilter" }];

  const numberFields = [
    { id: "minElementArea", path: "scanning.minElementArea" },
    { id: "minGroupSize", path: "scanning.minGroupSize" },
    { id: "maxElements", path: "scanning.maxElements" },
    { id: "overlapSampleLimit", path: "scanning.overlapSampleLimit" },
    { id: "maxOverlapChecks", path: "scanning.maxOverlapChecks" },
    { id: "autoRescanDebounceMs", path: "scanning.autoRescanDebounceMs" },
    { id: "classFingerprintDepth", path: "grouping.classFingerprintDepth" },
    { id: "paddingPx", path: "thresholds.paddingPx" },
    { id: "marginPx", path: "thresholds.marginPx" },
    { id: "fontSizePx", path: "thresholds.fontSizePx" },
    { id: "lineHeightPx", path: "thresholds.lineHeightPx" },
    { id: "letterSpacingPx", path: "thresholds.letterSpacingPx" },
    { id: "borderRadiusPx", path: "thresholds.borderRadiusPx" },
    { id: "borderWidthPx", path: "thresholds.borderWidthPx" },
    { id: "colorDistance", path: "thresholds.colorDistance" },
    { id: "alignmentPx", path: "thresholds.alignmentPx" },
    { id: "whitespacePx", path: "thresholds.whitespacePx" },
    { id: "dimensionRatioDelta", path: "thresholds.dimensionRatioDelta" },
    { id: "rowHeightPx", path: "thresholds.rowHeightPx" },
    { id: "columnWidthPx", path: "thresholds.columnWidthPx" },
    { id: "overlapAreaPx", path: "thresholds.overlapAreaPx" },
    { id: "contrastRatioNormal", path: "thresholds.contrastRatioNormal" },
    { id: "contrastRatioLarge", path: "thresholds.contrastRatioLarge" },
    { id: "touchTargetMinPx", path: "thresholds.touchTargetMinPx" },
    { id: "headingLevelJump", path: "thresholds.headingLevelJump" },
    { id: "tokenOffscalePx", path: "thresholds.tokenOffscalePx" },
    { id: "fontLineRatioMin", path: "thresholds.fontLineRatioMin" },
    { id: "fontLineRatioMax", path: "thresholds.fontLineRatioMax" },
    { id: "maxZIndex", path: "thresholds.maxZIndex" },
    { id: "maxUniqueColors", path: "thresholds.maxUniqueColors" },
    { id: "maxUniqueFonts", path: "thresholds.maxUniqueFonts" },
    { id: "maxUniqueRadii", path: "thresholds.maxUniqueRadii" },
    { id: "inlineStyleCount", path: "thresholds.inlineStyleCount" },
    { id: "importantUsageCount", path: "thresholds.importantUsageCount" },
    { id: "selectorComplexity", path: "thresholds.selectorComplexity" },
    { id: "styleEntropy", path: "thresholds.styleEntropy" },
    { id: "minVarUsageRatio", path: "thresholds.minVarUsageRatio" },
    { id: "maxMatchedElements", path: "customRules.maxMatchedElements" },
    { id: "fixMaxRules", path: "fixes.maxRules" },
    { id: "maxVisibleFindings", path: "overlay.maxVisibleFindings" },
    { id: "maxFindings", path: "reporting.maxFindings" }
  ];

  const checkFields = [
    { id: "traceCSS", path: "scanning.traceCSS" },
    { id: "includeTextNodes", path: "scanning.includeTextNodes" },
    { id: "autoRescanOnResize", path: "scanning.autoRescanOnResize" },
    { id: "useTag", path: "grouping.useTag" },
    { id: "useRole", path: "grouping.useRole" },
    { id: "useClassFingerprint", path: "grouping.useClassFingerprint" },
    { id: "checkPadding", path: "rules.checkPadding" },
    { id: "checkMargin", path: "rules.checkMargin" },
    { id: "checkTypography", path: "rules.checkTypography" },
    { id: "checkColors", path: "rules.checkColors" },
    { id: "checkBorderRadius", path: "rules.checkBorderRadius" },
    { id: "checkBorderWidth", path: "rules.checkBorderWidth" },
    { id: "checkAlignment", path: "rules.checkAlignment" },
    { id: "checkWhitespaceRhythm", path: "rules.checkWhitespaceRhythm" },
    { id: "checkDimensionRatios", path: "rules.checkDimensionRatios" },
    { id: "checkTypographyAdvanced", path: "rules.checkTypographyAdvanced" },
    { id: "checkLayoutAdvanced", path: "rules.checkLayoutAdvanced" },
    { id: "checkAccessibility", path: "rules.checkAccessibility" },
    { id: "checkInteraction", path: "rules.checkInteraction" },
    { id: "checkContent", path: "rules.checkContent" },
    { id: "checkCssQuality", path: "rules.checkCssQuality" },
    { id: "checkDesignTokens", path: "rules.checkDesignTokens" },
    { id: "checkCustomRules", path: "rules.checkCustomRules" },
    { id: "customRulesEnabled", path: "customRules.enabled" },
    { id: "generateFixes", path: "fixes.generateFixes" },
    { id: "fixUseImportant", path: "fixes.useImportant" },
    { id: "fixIncludeComments", path: "fixes.includeComments" },
    { id: "showHighlights", path: "overlay.showHighlights" },
    { id: "showRulers", path: "overlay.showRulers" },
    { id: "showLabels", path: "overlay.showLabels" },
    { id: "showPanel", path: "overlay.showPanel" },
    { id: "includeHtmlSnippet", path: "reporting.includeHtmlSnippet" },
    { id: "includeSourceHints", path: "reporting.includeSourceHints" },
    { id: "includeComputedSnapshot", path: "reporting.includeComputedSnapshot" }
  ];

  const BUILDER_INPUT_IDS = [
    "builderRuleId",
    "builderType",
    "builderSeverity",
    "builderSelector",
    "builderSource",
    "builderProperty",
    "builderOperator",
    "builderValue",
    "builderTolerance",
    "builderBaseline",
    "builderMessage"
  ];

  function setStatus(text, isError) {
    status.textContent = text;
    status.style.color = isError ? "#b83a31" : "#55656f";
  }

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && acc[key] != null ? acc[key] : undefined;
    }, obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[parts[parts.length - 1]] = value;
  }

  function parseScale(text) {
    return String(text || "")
      .split(/[\s,]+/)
      .map(function (entry) {
        return Number.parseFloat(entry.trim());
      })
      .filter(function (value) {
        return Number.isFinite(value);
      });
  }

  function formatScale(scale) {
    return Array.isArray(scale) ? scale.join(", ") : "";
  }

  function parseMaybeNumber(value) {
    const trimmed = String(value == null ? "" : value).trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed === "true") {
      return true;
    }
    if (trimmed === "false") {
      return false;
    }
    if (trimmed === "null") {
      return null;
    }
    const number = Number.parseFloat(trimmed);
    if (Number.isFinite(number) && String(number) === trimmed) {
      return number;
    }
    return trimmed;
  }

  function parseRuleValue(raw, operator) {
    const op = String(operator || "eq").toLowerCase();
    if (op === "exists" || op === "notempty") {
      return undefined;
    }

    if (op === "oneof") {
      return String(raw || "")
        .split(",")
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean)
        .map(parseMaybeNumber);
    }

    return parseMaybeNumber(raw);
  }

  function formatRuleValue(rule) {
    if (Array.isArray(rule.value)) {
      return rule.value.join(", ");
    }
    if (rule.value == null) {
      return "";
    }
    return String(rule.value);
  }

  function getConfig() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(root.CONFIG_KEYS.sync, function (data) {
        const stored = data && data[root.CONFIG_KEYS.sync] ? data[root.CONFIG_KEYS.sync] : {};
        resolve(utils.deepMerge(root.DEFAULT_CONFIG, stored));
      });
    });
  }

  function putConfig(config) {
    return new Promise(function (resolve) {
      chrome.storage.sync.set({ [root.CONFIG_KEYS.sync]: config }, function () {
        resolve();
      });
    });
  }

  function safeJsonRules(text) {
    try {
      const parsed = JSON.parse(String(text || "[]"));
      if (!Array.isArray(parsed)) {
        return { ok: false, error: "Custom rules JSON must be an array." };
      }
      return { ok: true, rules: parsed };
    } catch (error) {
      return {
        ok: false,
        error: "Custom rules JSON parse error: " + String(error.message || error)
      };
    }
  }

  function sanitizeRuleForBuilder(rule, index) {
    const type = String(rule.type || "assert").toLowerCase();
    const clean = {
      id:
        String(rule.id || "").trim() ||
        "custom-rule-" + (index + 1),
      type: type === "consistency" ? "consistency" : "assert",
      selector: String(rule.selector || "").trim(),
      source: String(rule.source || "metric").trim() || "metric",
      property: String(rule.property || "").trim(),
      severity: String(rule.severity || "medium").toLowerCase(),
      message: String(rule.message || "").trim()
    };

    if (clean.type === "consistency") {
      clean.baseline = String(rule.baseline || "median").toLowerCase() === "mode"
        ? "mode"
        : "median";
      const tolerance = Number.parseFloat(rule.tolerance);
      if (Number.isFinite(tolerance)) {
        clean.tolerance = tolerance;
      }
      return clean;
    }

    clean.operator = String(rule.operator || "eq");
    if (rule.value !== undefined) {
      clean.value = rule.value;
    }
    if (rule.pattern && clean.operator === "regex" && clean.value === undefined) {
      clean.value = rule.pattern;
    }
    const tolerance = Number.parseFloat(rule.tolerance);
    if (Number.isFinite(tolerance)) {
      clean.tolerance = tolerance;
    }

    return clean;
  }

  function normalizeRuleFromForm(rawRule) {
    const clean = {
      id: rawRule.id || "",
      selector: rawRule.selector,
      type: rawRule.type,
      source: rawRule.source,
      property: rawRule.property,
      severity: rawRule.severity,
      message: rawRule.message
    };

    if (clean.type === "consistency") {
      clean.baseline = rawRule.baseline;
      if (Number.isFinite(rawRule.tolerance)) {
        clean.tolerance = rawRule.tolerance;
      }
    } else {
      clean.operator = rawRule.operator;
      if (rawRule.value !== undefined) {
        clean.value = rawRule.value;
      }
      if (Number.isFinite(rawRule.tolerance)) {
        clean.tolerance = rawRule.tolerance;
      }
    }

    Object.keys(clean).forEach(function (key) {
      if (clean[key] === "" || clean[key] == null) {
        delete clean[key];
      }
    });

    return clean;
  }

  function updateBuilderMode() {
    if (builderState.editIndex >= 0) {
      builderEls.mode.textContent =
        "Builder mode: Edit rule #" + (builderState.editIndex + 1);
      builderEls.addBtn.textContent = "Update Rule";
      return;
    }

    builderEls.mode.textContent = "Builder mode: Add";
    builderEls.addBtn.textContent = "Add Rule";
  }

  function clearBuilderForm(resetEditIndex) {
    builderEls.ruleId.value = "";
    builderEls.type.value = "assert";
    builderEls.severity.value = "medium";
    builderEls.selector.value = "";
    builderEls.source.value = "metric";
    builderEls.property.value = "";
    builderEls.operator.value = "eq";
    builderEls.value.value = "";
    builderEls.tolerance.value = "";
    builderEls.baseline.value = "median";
    builderEls.message.value = "";

    if (resetEditIndex) {
      builderState.editIndex = -1;
      updateBuilderMode();
    }
  }

  function renderRuleList() {
    builderEls.list.innerHTML = "";

    if (!builderState.rules.length) {
      const empty = document.createElement("div");
      empty.className = "rule-card";
      const line = document.createElement("div");
      line.className = "rule-line";
      line.textContent = "No builder rules yet. Add one, then sync to JSON.";
      empty.appendChild(line);
      builderEls.list.appendChild(empty);
      return;
    }

    builderState.rules.forEach(function (rule, index) {
      const card = document.createElement("article");
      card.className = "rule-card";

      const head = document.createElement("div");
      head.className = "rule-card-head";
      const id = document.createElement("div");
      id.className = "rule-id";
      id.textContent = String(rule.id || "custom-rule-" + (index + 1));

      const meta = document.createElement("div");
      meta.className = "rule-meta";
      meta.textContent =
        String(rule.type || "assert") +
        " | " +
        String(rule.severity || "medium") +
        " | " +
        String(rule.selector || "(no selector)");

      head.appendChild(id);
      head.appendChild(meta);
      card.appendChild(head);

      const line1 = document.createElement("div");
      line1.className = "rule-line";
      if (rule.type === "consistency") {
        line1.textContent =
          "Consistency: " +
          String(rule.source || "metric") +
          "." +
          String(rule.property || "") +
          " baseline=" +
          String(rule.baseline || "median") +
          " tolerance=" +
          String(rule.tolerance == null ? 0 : rule.tolerance);
      } else {
        line1.textContent =
          "Assert: " +
          String(rule.source || "metric") +
          "." +
          String(rule.property || "") +
          " " +
          String(rule.operator || "eq") +
          " " +
          String(formatRuleValue(rule));
      }
      card.appendChild(line1);

      if (rule.message) {
        const line2 = document.createElement("div");
        line2.className = "rule-line";
        line2.textContent = "Message: " + String(rule.message);
        card.appendChild(line2);
      }

      const actions = document.createElement("div");
      actions.className = "rule-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        loadRuleIntoBuilder(rule, index);
      });

      const cloneBtn = document.createElement("button");
      cloneBtn.type = "button";
      cloneBtn.textContent = "Clone";
      cloneBtn.addEventListener("click", function () {
        const cloned = utils.deepClone(rule);
        cloned.id = String(cloned.id || "rule") + "-copy";
        builderState.rules.push(cloned);
        syncBuilderToJson(false);
        renderRuleList();
        setStatus("Rule cloned.", false);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Delete";
      removeBtn.addEventListener("click", function () {
        builderState.rules.splice(index, 1);
        if (builderState.editIndex === index) {
          clearBuilderForm(true);
        } else if (builderState.editIndex > index) {
          builderState.editIndex -= 1;
          updateBuilderMode();
        }
        syncBuilderToJson(false);
        renderRuleList();
        setStatus("Rule deleted.", false);
      });

      actions.appendChild(editBtn);
      actions.appendChild(cloneBtn);
      actions.appendChild(removeBtn);
      card.appendChild(actions);

      builderEls.list.appendChild(card);
    });
  }

  function syncBuilderToJson(showStatus) {
    const json = JSON.stringify(builderState.rules, null, 2);
    document.getElementById("customRulesJson").value = json;
    if (showStatus) {
      setStatus("Builder synced to JSON.", false);
    }
  }

  function loadBuilderFromJson(showStatus) {
    const source = document.getElementById("customRulesJson").value;
    const parsed = safeJsonRules(source);
    if (!parsed.ok) {
      if (showStatus) {
        setStatus(parsed.error, true);
      }
      return false;
    }

    builderState.rules = parsed.rules
      .filter(function (rule) {
        return rule && typeof rule === "object";
      })
      .map(sanitizeRuleForBuilder);

    builderState.editIndex = -1;
    updateBuilderMode();
    renderRuleList();

    if (showStatus) {
      setStatus("Loaded " + builderState.rules.length + " rule(s) from JSON.", false);
    }

    return true;
  }

  function loadRuleIntoBuilder(rule, index) {
    builderEls.ruleId.value = String(rule.id || "");
    builderEls.type.value = String(rule.type || "assert");
    builderEls.severity.value = String(rule.severity || "medium");
    builderEls.selector.value = String(rule.selector || "");
    builderEls.source.value = String(rule.source || "metric");
    builderEls.property.value = String(rule.property || "");
    builderEls.operator.value = String(rule.operator || "eq");
    builderEls.value.value = formatRuleValue(rule);
    builderEls.tolerance.value =
      rule.tolerance == null ? "" : String(rule.tolerance);
    builderEls.baseline.value = String(rule.baseline || "median");
    builderEls.message.value = String(rule.message || "");

    builderState.editIndex = index;
    updateBuilderMode();
    setStatus("Loaded rule into form for editing.", false);
  }

  function collectBuilderRuleFromForm() {
    const type = String(builderEls.type.value || "assert").toLowerCase();
    const selector = String(builderEls.selector.value || "").trim();
    const property = String(builderEls.property.value || "").trim();
    const source = String(builderEls.source.value || "metric").trim();
    const severity = String(builderEls.severity.value || "medium").toLowerCase();
    const message = String(builderEls.message.value || "").trim();

    if (!selector) {
      return { ok: false, error: "Selector is required for builder rule." };
    }
    if (!property && source !== "text") {
      return { ok: false, error: "Property is required for non-text sources." };
    }

    const draft = {
      id: String(builderEls.ruleId.value || "").trim(),
      type: type === "consistency" ? "consistency" : "assert",
      selector: selector,
      source: source,
      property: property,
      severity: severity,
      message: message
    };

    const tolerance = Number.parseFloat(builderEls.tolerance.value);

    if (draft.type === "consistency") {
      draft.baseline = String(builderEls.baseline.value || "median").toLowerCase();
      if (Number.isFinite(tolerance)) {
        draft.tolerance = tolerance;
      }
      return { ok: true, rule: normalizeRuleFromForm(draft) };
    }

    draft.operator = String(builderEls.operator.value || "eq");
    const value = parseRuleValue(builderEls.value.value, draft.operator);
    if (value !== undefined) {
      draft.value = value;
    }
    if (draft.operator === "near" && !Number.isFinite(tolerance)) {
      return { ok: false, error: "Tolerance is required for near operator." };
    }
    if (Number.isFinite(tolerance)) {
      draft.tolerance = tolerance;
    }

    return { ok: true, rule: normalizeRuleFromForm(draft) };
  }

  function addOrUpdateBuilderRule() {
    const result = collectBuilderRuleFromForm();
    if (!result.ok) {
      setStatus(result.error, true);
      return;
    }

    if (builderState.editIndex >= 0) {
      builderState.rules[builderState.editIndex] = result.rule;
      setStatus("Rule updated in builder.", false);
    } else {
      builderState.rules.push(result.rule);
      setStatus("Rule added to builder.", false);
    }

    syncBuilderToJson(false);
    renderRuleList();
    clearBuilderForm(true);
  }

  function fillForm(config) {
    textFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      node.value = String(getPath(config, field.path) || "");
    });

    selectFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      node.value = String(getPath(config, field.path) || "");
    });

    numberFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      const value = getPath(config, field.path);
      node.value = value != null ? value : "";
    });

    checkFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      node.checked = !!getPath(config, field.path);
    });

    scaleFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      node.value = formatScale(getPath(config, field.path));
    });

    loadBuilderFromJson(false);
    clearBuilderForm(true);
    updateBuilderMode();
  }

  function readNumber(nodeId, fallback) {
    const raw = document.getElementById(nodeId).value;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readConfigFromForm() {
    const defaults = utils.deepClone(root.DEFAULT_CONFIG);
    const next = utils.deepClone(defaults);

    textFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      const fallback = getPath(defaults, field.path) || "";
      setPath(next, field.path, node.value.trim() || fallback);
    });

    selectFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      const fallback = getPath(defaults, field.path) || "";
      setPath(next, field.path, node.value || fallback);
    });

    numberFields.forEach(function (field) {
      const fallback = getPath(defaults, field.path);
      setPath(next, field.path, readNumber(field.id, fallback));
    });

    checkFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      setPath(next, field.path, !!node.checked);
    });

    scaleFields.forEach(function (field) {
      const node = document.getElementById(field.id);
      const parsed = parseScale(node.value);
      const fallback = getPath(defaults, field.path) || [];
      setPath(next, field.path, parsed.length ? parsed : fallback);
    });

    return next;
  }

  function exportConfig() {
    const config = readConfigFromForm();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json"
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "ui-consistency-config.json";
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Config exported.", false);
  }

  async function importConfig() {
    const json = window.prompt("Paste config JSON");
    if (!json) {
      return;
    }

    try {
      const parsed = JSON.parse(json);
      const merged = utils.deepMerge(root.DEFAULT_CONFIG, parsed);
      await putConfig(merged);
      fillForm(merged);
      setStatus("Config imported.", false);
    } catch (error) {
      setStatus("Invalid JSON: " + error.message, true);
    }
  }

  function bindUnsavedHandlers() {
    const ids = textFields
      .concat(numberFields)
      .concat(checkFields)
      .concat(selectFields)
      .concat(scaleFields)
      .map(function (field) {
        return field.id;
      })
      .concat(BUILDER_INPUT_IDS);

    ids.forEach(function (id) {
      const node = document.getElementById(id);
      if (!node) {
        return;
      }
      const eventType =
        node.type === "checkbox" || node.tagName === "SELECT" ? "change" : "input";
      node.addEventListener(eventType, function () {
        setStatus("Unsaved changes.", false);
      });
    });
  }

  function bindBuilderActions() {
    builderEls.addBtn.addEventListener("click", addOrUpdateBuilderRule);

    builderEls.clearBtn.addEventListener("click", function () {
      clearBuilderForm(true);
      setStatus("Builder form cleared.", false);
    });

    builderEls.syncBtn.addEventListener("click", function () {
      syncBuilderToJson(true);
      setStatus("Unsaved changes.", false);
    });

    builderEls.loadBtn.addEventListener("click", function () {
      if (loadBuilderFromJson(true)) {
        setStatus("Unsaved changes.", false);
      }
    });
  }

  async function init() {
    if (
      globalThis.UIConsistencyUI &&
      typeof globalThis.UIConsistencyUI.enhanceFormControls === "function"
    ) {
      globalThis.UIConsistencyUI.enhanceFormControls(document);
    }

    const config = await getConfig();
    fillForm(config);

    document.getElementById("saveBtn").addEventListener("click", async function () {
      try {
        const next = readConfigFromForm();
        await putConfig(next);
        setStatus("Config saved.", false);
      } catch (error) {
        setStatus("Save failed: " + error.message, true);
      }
    });

    document.getElementById("resetBtn").addEventListener("click", async function () {
      try {
        const defaults = utils.deepClone(root.DEFAULT_CONFIG);
        await putConfig(defaults);
        fillForm(defaults);
        setStatus("Reset to defaults.", false);
      } catch (error) {
        setStatus("Reset failed: " + error.message, true);
      }
    });

    document.getElementById("exportBtn").addEventListener("click", exportConfig);
    document.getElementById("importBtn").addEventListener("click", importConfig);

    bindBuilderActions();
    bindUnsavedHandlers();
    setStatus("Ready.", false);
  }

  init();
})();
