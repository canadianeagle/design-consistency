(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const NUMERIC_METRICS = [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "lineHeightRatio",
    "letterSpacing",
    "borderRadius",
    "borderWidth",
    "left",
    "top",
    "right",
    "bottom",
    "centerX",
    "centerY",
    "width",
    "height",
    "aspectRatio",
    "zIndex",
    "opacity"
  ];

  const TRACE_PROPERTIES = [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "color",
    "background-color",
    "border-radius",
    "border-width",
    "z-index"
  ];

  const INTERACTIVE_SELECTOR =
    "button, a, input, select, textarea, summary, [role='button'], [role='tab'], [role='menuitem'], [tabindex], [onclick]";
  const FORM_SELECTOR = "input:not([type='hidden']), select, textarea";
  const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

  function toPageRect(rect) {
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    return {
      top: rect.top + scrollY,
      left: rect.left + scrollX,
      right: rect.right + scrollX,
      bottom: rect.bottom + scrollY,
      width: rect.width,
      height: rect.height
    };
  }

  function parseZIndex(value) {
    if (!value || value === "auto") {
      return 0;
    }
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseFontWeight(value) {
    if (!value) {
      return 400;
    }
    const normalized = String(value).toLowerCase().trim();
    if (normalized === "normal") {
      return 400;
    }
    if (normalized === "bold") {
      return 700;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 400;
  }

  function isVisible(element, minArea) {
    if (!element || element.nodeType !== 1) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") === 0
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    return rect.width > 0 && rect.height > 0 && area >= minArea;
  }

  function classFingerprint(element, depth) {
    const classes = Array.from(element.classList || []).filter(function (value) {
      return /^[a-z0-9_-]+$/i.test(value) && !/\d{4,}/.test(value);
    });
    if (!classes.length) {
      return "";
    }
    return classes
      .slice(0, depth)
      .sort()
      .join(".");
  }

  function buildGroupKey(element, style, config) {
    const segments = [];
    if (config.grouping.useTag) {
      segments.push(element.tagName.toLowerCase());
    }
    if (config.grouping.useRole) {
      const role = element.getAttribute("role") || "";
      if (role) {
        segments.push("role:" + role);
      }
    }

    if (config.grouping.useClassFingerprint) {
      const fingerprint = classFingerprint(
        element,
        config.grouping.classFingerprintDepth
      );
      if (fingerprint) {
        segments.push("class:" + fingerprint);
      }
    }

    if (!segments.length) {
      segments.push(element.tagName.toLowerCase());
    }

    if (style.display === "inline") {
      segments.push("display:inline");
    }

    return segments.join("|");
  }

  function normalizeFontFamily(fontFamily) {
    if (!fontFamily) {
      return "";
    }
    return fontFamily
      .split(",")
      .map(function (part) {
        return part.replace(/["']/g, "").trim().toLowerCase();
      })
      .filter(Boolean)[0];
  }

  function isTransparentColor(value) {
    const rgba = utils.rgbaFromColor(value);
    return !!(rgba && rgba.a <= 0.01);
  }

  function effectiveBackgroundColor(element) {
    let node = element;
    while (node && node.nodeType === 1) {
      const style = window.getComputedStyle(node);
      const bg = utils.normalizeColor(style.backgroundColor);
      if (!isTransparentColor(bg)) {
        return bg;
      }
      node = node.parentElement;
    }
    return "rgb(255,255,255)";
  }

  function isInteractiveElement(element, style) {
    if (!element || element.nodeType !== 1) {
      return false;
    }

    const tag = element.tagName.toLowerCase();
    if (
      tag === "button" ||
      tag === "summary" ||
      tag === "select" ||
      tag === "textarea"
    ) {
      return true;
    }

    if (tag === "a" && element.hasAttribute("href")) {
      return true;
    }

    if (tag === "input") {
      const type = (element.getAttribute("type") || "text").toLowerCase();
      if (type !== "hidden") {
        return true;
      }
    }

    const role = element.getAttribute("role");
    if (role && /button|tab|menuitem|link|switch|checkbox|radio/i.test(role)) {
      return true;
    }

    if (element.hasAttribute("onclick")) {
      return true;
    }

    if (element.hasAttribute("tabindex")) {
      const tabindex = Number.parseFloat(element.getAttribute("tabindex"));
      if (Number.isFinite(tabindex) && tabindex >= 0) {
        return true;
      }
    }

    if (style && style.cursor === "pointer") {
      return true;
    }

    return false;
  }

  function isPrimaryUiElement(element) {
    const tag = element.tagName.toLowerCase();
    if (
      tag === "button" ||
      tag === "a" ||
      tag === "input" ||
      tag === "select" ||
      tag === "textarea" ||
      tag === "label" ||
      tag === "summary"
    ) {
      return true;
    }
    if (element.hasAttribute("role")) {
      return true;
    }
    if (
      element.hasAttribute("data-component") ||
      element.hasAttribute("data-testid")
    ) {
      return true;
    }
    return false;
  }

  function collectElementSample(element, config) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const fontSize = utils.parsePx(style.fontSize);
    const lineHeight =
      style.lineHeight === "normal"
        ? fontSize * 1.2
        : utils.parsePx(style.lineHeight);

    const fontWeight = parseFontWeight(style.fontWeight);
    const isInteractive = isInteractiveElement(element, style);

    const metrics = {
      paddingTop: utils.parsePx(style.paddingTop),
      paddingRight: utils.parsePx(style.paddingRight),
      paddingBottom: utils.parsePx(style.paddingBottom),
      paddingLeft: utils.parsePx(style.paddingLeft),
      marginTop: utils.parsePx(style.marginTop),
      marginRight: utils.parsePx(style.marginRight),
      marginBottom: utils.parsePx(style.marginBottom),
      marginLeft: utils.parsePx(style.marginLeft),
      fontFamily: normalizeFontFamily(style.fontFamily),
      fontSize: fontSize,
      fontWeight: fontWeight,
      lineHeight: lineHeight,
      lineHeightRatio: fontSize > 0 ? lineHeight / fontSize : 0,
      letterSpacing: utils.parsePx(style.letterSpacing),
      color: utils.normalizeColor(style.color),
      backgroundColor: utils.normalizeColor(style.backgroundColor),
      effectiveBackgroundColor: effectiveBackgroundColor(element),
      borderRadius: utils.parsePx(style.borderTopLeftRadius),
      borderWidth: utils.parsePx(style.borderTopWidth),
      borderStyle: String(style.borderStyle || ""),
      cursor: style.cursor,
      display: style.display,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      left: rect.left + (window.scrollX || 0),
      top: rect.top + (window.scrollY || 0),
      right: rect.right + (window.scrollX || 0),
      bottom: rect.bottom + (window.scrollY || 0),
      centerX: rect.left + rect.width / 2 + (window.scrollX || 0),
      centerY: rect.top + rect.height / 2 + (window.scrollY || 0),
      width: rect.width,
      height: rect.height,
      aspectRatio: rect.height ? rect.width / rect.height : 0,
      zIndex: parseZIndex(style.zIndex),
      opacity: Number.parseFloat(style.opacity || "1") || 1
    };

    const groupKey = buildGroupKey(element, style, config);
    const text = element.textContent ? element.textContent.trim() : "";

    return {
      id: utils.uid("sample"),
      element: element,
      selector: utils.safeSelector(element),
      groupKey: groupKey,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      idAttr: element.id || "",
      metrics: metrics,
      textLength: text.length,
      textPreview: text ? text.slice(0, 120) : "",
      hasInlineStyle: element.hasAttribute("style"),
      isInteractive: isInteractive,
      isFormControl: element.matches(FORM_SELECTOR),
      htmlSnippet: config.reporting.includeHtmlSnippet
        ? utils.htmlSnippet(element, 300)
        : "",
      rect: toPageRect(rect)
    };
  }

  function collectCandidates(config) {
    const include = config.scanning.includeSelectors;
    const exclude = config.scanning.excludeSelectors;
    const all = Array.from(document.querySelectorAll(include));
    const excluded = exclude ? new Set(document.querySelectorAll(exclude)) : null;

    const filtered = [];
    for (let i = 0; i < all.length; i += 1) {
      const element = all[i];
      if (element && element.closest("[data-ui-consistency-overlay='true']")) {
        continue;
      }
      if (excluded && excluded.has(element)) {
        continue;
      }
      if (!isVisible(element, config.scanning.minElementArea)) {
        continue;
      }
      if (!config.scanning.includeTextNodes && !isPrimaryUiElement(element)) {
        continue;
      }
      filtered.push(element);
      if (filtered.length >= config.scanning.maxElements) {
        break;
      }
    }

    return filtered;
  }

  function splitSelectors(selectorText) {
    if (!selectorText || !selectorText.includes(",")) {
      return [selectorText];
    }

    const output = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < selectorText.length; i += 1) {
      const char = selectorText[i];
      if (char === "(" || char === "[") {
        depth += 1;
      }
      if (char === ")" || char === "]") {
        depth = Math.max(0, depth - 1);
      }
      if (char === "," && depth === 0) {
        if (current.trim()) {
          output.push(current.trim());
        }
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) {
      output.push(current.trim());
    }
    return output;
  }

  function selectorComplexity(selector) {
    if (!selector) {
      return 0;
    }

    const cleaned = selector
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "[]");

    const combinators = (cleaned.match(/\s+|>|\+|~/g) || []).length;
    const pseudos = (cleaned.match(/:/g) || []).length;
    const classes = (cleaned.match(/\./g) || []).length;
    const ids = (cleaned.match(/#/g) || []).length;
    const attributes = (selector.match(/\[/g) || []).length;

    return combinators + pseudos * 0.8 + classes * 0.3 + ids * 0.6 + attributes * 0.7;
  }

  function getNestedRules(ruleList, source, bucket) {
    for (let i = 0; i < ruleList.length; i += 1) {
      const rule = ruleList[i];
      if (!rule) {
        continue;
      }

      if (rule.type === CSSRule.STYLE_RULE) {
        bucket.push({
          selectorText: rule.selectorText,
          style: rule.style,
          source: source
        });
      } else if (
        rule.type === CSSRule.MEDIA_RULE ||
        rule.type === CSSRule.SUPPORTS_RULE ||
        rule.type === CSSRule.LAYER_BLOCK_RULE
      ) {
        getNestedRules(rule.cssRules, source, bucket);
      }
    }
  }

  function buildStyleRuleIndex() {
    const propertyIndex = {};
    TRACE_PROPERTIES.forEach(function (property) {
      propertyIndex[property] = [];
    });

    let stylesheetCount = 0;
    let rulesScanned = 0;
    let importantCount = 0;
    let focusSelectorCount = 0;
    let variableDeclarationCount = 0;
    let literalDeclarationCount = 0;
    const complexSelectors = [];
    const gatheredRules = [];

    Array.from(document.styleSheets || []).forEach(function (sheet) {
      let cssRules;
      try {
        cssRules = sheet.cssRules;
      } catch (error) {
        return;
      }

      if (!cssRules) {
        return;
      }

      stylesheetCount += 1;
      const source = sheet.href || "inline-stylesheet";
      getNestedRules(cssRules, source, gatheredRules);
    });

    gatheredRules.forEach(function (entry) {
      const selectors = splitSelectors(entry.selectorText);
      rulesScanned += selectors.length;

      selectors.forEach(function (selector) {
        if (!selector) {
          return;
        }

        if (/:focus|:focus-visible/.test(selector)) {
          focusSelectorCount += 1;
        }

        const complexity = selectorComplexity(selector);
        if (complexity >= 3) {
          complexSelectors.push({
            selector: selector,
            complexity: utils.toFixed(complexity, 2),
            source: entry.source
          });
        }
      });

      for (let i = 0; i < entry.style.length; i += 1) {
        const prop = entry.style[i];
        const value = entry.style.getPropertyValue(prop);
        const priority = entry.style.getPropertyPriority(prop);
        if (priority === "important") {
          importantCount += 1;
        }

        if (value && value.includes("var(")) {
          variableDeclarationCount += 1;
        } else {
          literalDeclarationCount += 1;
        }
      }

      TRACE_PROPERTIES.forEach(function (property) {
        const value = entry.style.getPropertyValue(property);
        if (!value) {
          return;
        }
        selectors.forEach(function (selector) {
          if (!selector) {
            return;
          }
          propertyIndex[property].push({
            selector: selector,
            value: value.trim(),
            source: entry.source
          });
        });
      });
    });

    complexSelectors.sort(function (a, b) {
      return b.complexity - a.complexity;
    });

    return {
      stylesheetsIndexed: stylesheetCount,
      propertyIndex: propertyIndex,
      stats: {
        rulesScanned: rulesScanned,
        importantCount: importantCount,
        focusSelectorCount: focusSelectorCount,
        variableDeclarationCount: variableDeclarationCount,
        literalDeclarationCount: literalDeclarationCount,
        complexSelectors: complexSelectors.slice(0, 80)
      }
    };
  }

  function tracePropertySource(element, cssSourceIndex, property) {
    if (!cssSourceIndex) {
      return null;
    }

    const inlineValue = element.style && element.style.getPropertyValue(property);
    const candidates = cssSourceIndex.propertyIndex[property] || [];
    const matches = [];

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        if (element.matches(candidate.selector)) {
          matches.push({
            selector: candidate.selector,
            value: candidate.value,
            source: candidate.source
          });
          if (matches.length >= 3) {
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    if (!inlineValue && matches.length === 0) {
      return null;
    }

    return {
      property: property,
      inlineValue: inlineValue || "",
      matches: matches
    };
  }

  function buildSyntheticSample() {
    const target = document.body || document.documentElement;
    const rect = target
      ? target.getBoundingClientRect()
      : {
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: 40,
          width: window.innerWidth,
          height: 40
        };

    return {
      id: "synthetic-page-sample",
      element: target,
      selector: "document",
      groupKey: "page",
      tag: "document",
      metrics: {},
      htmlSnippet: "",
      rect: toPageRect(rect)
    };
  }

  function createFinding(params) {
    const sample = params.sample || buildSyntheticSample();

    return {
      id: utils.uid("finding"),
      ruleId: params.ruleId,
      category: params.category,
      severity: params.severity,
      delta: utils.toFixed(params.delta || 0, 3),
      message: params.message,
      expected: params.expected,
      actual: params.actual,
      selector: sample.selector,
      groupKey: sample.groupKey,
      tag: sample.tag,
      rect: sample.rect,
      guides: params.guides || [],
      sourceHint: params.sourceHint || null,
      htmlSnippet: sample.htmlSnippet || "",
      observedAt: utils.nowIso(),
      metadata: params.metadata || null
    };
  }

  function baselineNumeric(samples, metric) {
    const values = samples
      .map(function (sample) {
        return sample.metrics[metric];
      })
      .filter(function (value) {
        return Number.isFinite(value);
      });
    return utils.median(values);
  }

  function baselineCategorical(samples, metric) {
    const values = samples
      .map(function (sample) {
        return sample.metrics[metric];
      })
      .filter(Boolean);
    return utils.mode(values);
  }

  function safeSeverityFromDelta(delta, tolerance) {
    const tol = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : 1;
    return utils.severityFromDelta(delta, tol);
  }

  function pushNumericDeviationFindings(
    samples,
    config,
    output,
    definition,
    cssSourceIndex
  ) {
    const baseline = baselineNumeric(samples, definition.metric);
    if (!Number.isFinite(baseline)) {
      return;
    }

    const tolerance = config.thresholds[definition.thresholdKey];

    samples.forEach(function (sample) {
      const actual = sample.metrics[definition.metric];
      if (!Number.isFinite(actual)) {
        return;
      }

      const delta = Math.abs(actual - baseline);
      if (delta <= tolerance) {
        return;
      }

      const guides = [];
      if (definition.drawRuler) {
        const y = sample.rect.top - 4;
        guides.push({
          type: "line",
          x1: sample.rect.left,
          y1: y,
          x2: sample.rect.right,
          y2: y,
          label: definition.label + " delta " + utils.toFixed(delta, 1) + "px"
        });
      }

      output.push(
        createFinding({
          ruleId: definition.ruleId,
          category: definition.category,
          severity: safeSeverityFromDelta(delta, tolerance),
          delta: delta,
          message:
            definition.label +
            " differs from peer baseline by " +
            utils.toFixed(delta, 1) +
            "px",
          expected: utils.toFixed(baseline, 1) + "px",
          actual: utils.toFixed(actual, 1) + "px",
          sample: sample,
          guides: guides,
          sourceHint: config.reporting.includeSourceHints
            ? tracePropertySource(sample.element, cssSourceIndex, definition.cssProperty)
            : null
        })
      );
    });
  }

  function pushCategoricalFindings(
    samples,
    config,
    output,
    definition,
    cssSourceIndex
  ) {
    const baseline = baselineCategorical(samples, definition.metric);
    if (!baseline) {
      return;
    }

    samples.forEach(function (sample) {
      const actual = sample.metrics[definition.metric];
      if (!actual || actual === baseline) {
        return;
      }

      output.push(
        createFinding({
          ruleId: definition.ruleId,
          category: definition.category,
          severity: definition.severity || "high",
          delta: 1,
          message: definition.label + " mismatches dominant peer style",
          expected: baseline,
          actual: actual,
          sample: sample,
          sourceHint: config.reporting.includeSourceHints
            ? tracePropertySource(sample.element, cssSourceIndex, definition.cssProperty)
            : null
        })
      );
    });
  }

  function pushColorFindings(
    samples,
    config,
    output,
    metric,
    cssProperty,
    ruleId,
    category,
    label,
    cssSourceIndex
  ) {
    const baseline = baselineCategorical(samples, metric);
    if (!baseline) {
      return;
    }

    const tolerance = config.thresholds.colorDistance;

    samples.forEach(function (sample) {
      const actual = sample.metrics[metric];
      if (!actual || actual === baseline) {
        return;
      }

      const delta = utils.colorDistance(actual, baseline);
      if (delta <= tolerance) {
        return;
      }

      output.push(
        createFinding({
          ruleId: ruleId,
          category: category,
          severity: safeSeverityFromDelta(delta, tolerance),
          delta: delta,
          message:
            label +
            " drifts from peer palette (distance " +
            utils.toFixed(delta, 1) +
            ")",
          expected: baseline,
          actual: actual,
          sample: sample,
          sourceHint: config.reporting.includeSourceHints
            ? tracePropertySource(sample.element, cssSourceIndex, cssProperty)
            : null
        })
      );
    });
  }

  function pushEdgeAlignmentFindings(samples, config, output, metric, ruleId, label) {
    const tolerance = config.thresholds.alignmentPx;
    const baseline = baselineNumeric(samples, metric);
    if (!Number.isFinite(baseline)) {
      return;
    }

    samples.forEach(function (sample) {
      const actual = sample.metrics[metric];
      const delta = Math.abs(actual - baseline);
      if (delta <= tolerance) {
        return;
      }

      let guides;
      if (metric === "left" || metric === "right" || metric === "centerX") {
        guides = [
          {
            type: "line",
            x1: baseline,
            y1: sample.rect.top - 10,
            x2: baseline,
            y2: sample.rect.bottom + 10,
            label: "Expected " + label
          }
        ];
      } else {
        guides = [
          {
            type: "line",
            x1: sample.rect.left - 10,
            y1: baseline,
            x2: sample.rect.right + 10,
            y2: baseline,
            label: "Expected " + label
          }
        ];
      }

      output.push(
        createFinding({
          ruleId: ruleId,
          category: "layout",
          severity: safeSeverityFromDelta(delta, tolerance),
          delta: delta,
          message:
            label +
            " alignment drifts by " +
            utils.toFixed(delta, 1) +
            "px",
          expected: utils.toFixed(baseline, 1) + "px",
          actual: utils.toFixed(actual, 1) + "px",
          sample: sample,
          guides: guides
        })
      );
    });
  }

  function pushDimensionRatioFindings(samples, config, output) {
    const tolerance = config.thresholds.dimensionRatioDelta;
    const baselineRatio = baselineNumeric(samples, "aspectRatio");
    if (!Number.isFinite(baselineRatio)) {
      return;
    }

    samples.forEach(function (sample) {
      const delta = Math.abs(sample.metrics.aspectRatio - baselineRatio);
      if (delta <= tolerance) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "layout-dimension-ratio",
          category: "layout",
          severity: safeSeverityFromDelta(delta, tolerance),
          delta: delta,
          message: "Aspect ratio differs from peers by " + utils.toFixed(delta, 2),
          expected: utils.toFixed(baselineRatio, 2),
          actual: utils.toFixed(sample.metrics.aspectRatio, 2),
          sample: sample
        })
      );
    });
  }

  function runGroupRules(groupSamples, config, output, cssSourceIndex) {
    const numericDefinitions = [];

    if (config.rules.checkPadding) {
      numericDefinitions.push(
        {
          metric: "paddingTop",
          thresholdKey: "paddingPx",
          ruleId: "spacing-padding-top",
          category: "spacing",
          label: "Top padding",
          drawRuler: true,
          cssProperty: "padding-top"
        },
        {
          metric: "paddingRight",
          thresholdKey: "paddingPx",
          ruleId: "spacing-padding-right",
          category: "spacing",
          label: "Right padding",
          drawRuler: true,
          cssProperty: "padding-right"
        },
        {
          metric: "paddingBottom",
          thresholdKey: "paddingPx",
          ruleId: "spacing-padding-bottom",
          category: "spacing",
          label: "Bottom padding",
          drawRuler: true,
          cssProperty: "padding-bottom"
        },
        {
          metric: "paddingLeft",
          thresholdKey: "paddingPx",
          ruleId: "spacing-padding-left",
          category: "spacing",
          label: "Left padding",
          drawRuler: true,
          cssProperty: "padding-left"
        }
      );
    }

    if (config.rules.checkMargin) {
      numericDefinitions.push(
        {
          metric: "marginTop",
          thresholdKey: "marginPx",
          ruleId: "spacing-margin-top",
          category: "spacing",
          label: "Top margin",
          drawRuler: true,
          cssProperty: "margin-top"
        },
        {
          metric: "marginRight",
          thresholdKey: "marginPx",
          ruleId: "spacing-margin-right",
          category: "spacing",
          label: "Right margin",
          drawRuler: true,
          cssProperty: "margin-right"
        },
        {
          metric: "marginBottom",
          thresholdKey: "marginPx",
          ruleId: "spacing-margin-bottom",
          category: "spacing",
          label: "Bottom margin",
          drawRuler: true,
          cssProperty: "margin-bottom"
        },
        {
          metric: "marginLeft",
          thresholdKey: "marginPx",
          ruleId: "spacing-margin-left",
          category: "spacing",
          label: "Left margin",
          drawRuler: true,
          cssProperty: "margin-left"
        }
      );
    }

    if (config.rules.checkTypography) {
      numericDefinitions.push(
        {
          metric: "fontSize",
          thresholdKey: "fontSizePx",
          ruleId: "type-font-size",
          category: "typography",
          label: "Font size",
          drawRuler: false,
          cssProperty: "font-size"
        },
        {
          metric: "lineHeight",
          thresholdKey: "lineHeightPx",
          ruleId: "type-line-height",
          category: "typography",
          label: "Line height",
          drawRuler: false,
          cssProperty: "line-height"
        },
        {
          metric: "letterSpacing",
          thresholdKey: "letterSpacingPx",
          ruleId: "type-letter-spacing",
          category: "typography",
          label: "Letter spacing",
          drawRuler: false,
          cssProperty: "letter-spacing"
        }
      );
    }

    if (config.rules.checkBorderRadius) {
      numericDefinitions.push({
        metric: "borderRadius",
        thresholdKey: "borderRadiusPx",
        ruleId: "shape-border-radius",
        category: "shape",
        label: "Border radius",
        drawRuler: false,
        cssProperty: "border-radius"
      });
    }

    if (config.rules.checkBorderWidth) {
      numericDefinitions.push({
        metric: "borderWidth",
        thresholdKey: "borderWidthPx",
        ruleId: "shape-border-width",
        category: "shape",
        label: "Border width",
        drawRuler: false,
        cssProperty: "border-width"
      });
    }

    groupSamples.forEach(function (samples) {
      numericDefinitions.forEach(function (definition) {
        pushNumericDeviationFindings(
          samples,
          config,
          output,
          definition,
          cssSourceIndex
        );
      });

      if (config.rules.checkTypography) {
        pushCategoricalFindings(
          samples,
          config,
          output,
          {
            metric: "fontFamily",
            ruleId: "type-font-family",
            category: "typography",
            label: "Font family",
            cssProperty: "font-family",
            severity: "high"
          },
          cssSourceIndex
        );
      }

      if (config.rules.checkColors) {
        pushColorFindings(
          samples,
          config,
          output,
          "color",
          "color",
          "color-foreground",
          "color",
          "Text color",
          cssSourceIndex
        );

        pushColorFindings(
          samples,
          config,
          output,
          "backgroundColor",
          "background-color",
          "color-background",
          "color",
          "Background color",
          cssSourceIndex
        );
      }

      if (config.rules.checkAlignment) {
        pushEdgeAlignmentFindings(
          samples,
          config,
          output,
          "left",
          "layout-alignment-left",
          "Left edge"
        );
      }

      if (config.rules.checkLayoutAdvanced) {
        pushEdgeAlignmentFindings(
          samples,
          config,
          output,
          "right",
          "layout-alignment-right",
          "Right edge"
        );
        pushEdgeAlignmentFindings(
          samples,
          config,
          output,
          "centerX",
          "layout-alignment-center",
          "Center line"
        );
      }

      if (config.rules.checkDimensionRatios) {
        pushDimensionRatioFindings(samples, config, output);
      }
    });
  }

  function byDocumentOrder(a, b) {
    if (a.rect.top === b.rect.top) {
      return a.rect.left - b.rect.left;
    }
    return a.rect.top - b.rect.top;
  }

  function rowGroups(samples, tolerance) {
    const groups = [];
    samples
      .slice()
      .sort(byDocumentOrder)
      .forEach(function (sample) {
        let placed = false;
        for (let i = 0; i < groups.length; i += 1) {
          const anchor = groups[i][0];
          if (Math.abs(anchor.rect.top - sample.rect.top) <= tolerance) {
            groups[i].push(sample);
            placed = true;
            break;
          }
        }
        if (!placed) {
          groups.push([sample]);
        }
      });
    return groups;
  }

  function groupByParent(samples) {
    const map = new Map();
    samples.forEach(function (sample) {
      const parent = sample.element.parentElement;
      if (!parent) {
        return;
      }
      if (!map.has(parent)) {
        map.set(parent, []);
      }
      map.get(parent).push(sample);
    });
    return map;
  }

  function pushWhitespaceFindings(samples, config, output) {
    const tolerance = config.thresholds.whitespacePx;
    const parentMap = groupByParent(samples);

    parentMap.forEach(function (childSamples) {
      if (childSamples.length < config.scanning.minGroupSize) {
        return;
      }

      const verticalSorted = childSamples.slice().sort(byDocumentOrder);
      const verticalGaps = [];
      for (let i = 1; i < verticalSorted.length; i += 1) {
        const previous = verticalSorted[i - 1];
        const current = verticalSorted[i];
        const gap = current.rect.top - previous.rect.bottom;
        if (gap >= 0 && gap <= 260) {
          verticalGaps.push({
            gap: gap,
            previous: previous,
            current: current
          });
        }
      }

      const baselineV = utils.median(
        verticalGaps.map(function (entry) {
          return entry.gap;
        })
      );

      if (Number.isFinite(baselineV)) {
        verticalGaps.forEach(function (entry) {
          const delta = Math.abs(entry.gap - baselineV);
          if (delta <= tolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "spacing-whitespace-vertical-rhythm",
              category: "spacing",
              severity: safeSeverityFromDelta(delta, tolerance),
              delta: delta,
              message:
                "Vertical whitespace rhythm breaks by " +
                utils.toFixed(delta, 1) +
                "px",
              expected: utils.toFixed(baselineV, 1) + "px gap",
              actual: utils.toFixed(entry.gap, 1) + "px gap",
              sample: entry.current,
              guides: [
                {
                  type: "line",
                  x1: entry.current.rect.left - 8,
                  y1: entry.previous.rect.bottom,
                  x2: entry.current.rect.left - 8,
                  y2: entry.current.rect.top,
                  label: "Observed gap " + utils.toFixed(entry.gap, 1) + "px"
                }
              ]
            })
          );
        });
      }

      const rows = rowGroups(childSamples, 10);
      rows.forEach(function (row) {
        if (row.length < 3) {
          return;
        }

        const horizontal = row.slice().sort(function (a, b) {
          return a.rect.left - b.rect.left;
        });

        const gaps = [];
        for (let i = 1; i < horizontal.length; i += 1) {
          const previous = horizontal[i - 1];
          const current = horizontal[i];
          const gap = current.rect.left - previous.rect.right;
          if (gap >= 0 && gap <= 320) {
            gaps.push({
              gap: gap,
              previous: previous,
              current: current
            });
          }
        }

        const baseline = utils.median(
          gaps.map(function (entry) {
            return entry.gap;
          })
        );

        if (!Number.isFinite(baseline)) {
          return;
        }

        gaps.forEach(function (entry) {
          const delta = Math.abs(entry.gap - baseline);
          if (delta <= tolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "spacing-whitespace-horizontal-rhythm",
              category: "spacing",
              severity: safeSeverityFromDelta(delta, tolerance),
              delta: delta,
              message:
                "Horizontal whitespace rhythm breaks by " +
                utils.toFixed(delta, 1) +
                "px",
              expected: utils.toFixed(baseline, 1) + "px gap",
              actual: utils.toFixed(entry.gap, 1) + "px gap",
              sample: entry.current,
              guides: [
                {
                  type: "line",
                  x1: entry.previous.rect.right,
                  y1: entry.current.rect.top - 8,
                  x2: entry.current.rect.left,
                  y2: entry.current.rect.top - 8,
                  label: "Observed gap " + utils.toFixed(entry.gap, 1) + "px"
                }
              ]
            })
          );
        });
      });
    });
  }

  function pushRowHeightFindings(samples, config, output) {
    const tolerance = config.thresholds.rowHeightPx;
    const parentMap = groupByParent(samples);

    parentMap.forEach(function (childSamples) {
      if (childSamples.length < config.scanning.minGroupSize) {
        return;
      }

      const rows = rowGroups(childSamples, 10);
      rows.forEach(function (row) {
        if (row.length < config.scanning.minGroupSize) {
          return;
        }

        const baseline = baselineNumeric(row, "height");
        if (!Number.isFinite(baseline)) {
          return;
        }

        row.forEach(function (sample) {
          const delta = Math.abs(sample.metrics.height - baseline);
          if (delta <= tolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "layout-row-height-rhythm",
              category: "layout",
              severity: safeSeverityFromDelta(delta, tolerance),
              delta: delta,
              message: "Row height rhythm drifts by " + utils.toFixed(delta, 1) + "px",
              expected: utils.toFixed(baseline, 1) + "px",
              actual: utils.toFixed(sample.metrics.height, 1) + "px",
              sample: sample
            })
          );
        });
      });
    });
  }

  function pushColumnWidthFindings(samples, config, output) {
    const tolerance = config.thresholds.columnWidthPx;
    const parentMap = groupByParent(samples);

    parentMap.forEach(function (childSamples) {
      if (childSamples.length < config.scanning.minGroupSize) {
        return;
      }

      const columns = [];
      childSamples
        .slice()
        .sort(function (a, b) {
          return a.rect.left - b.rect.left;
        })
        .forEach(function (sample) {
          let placed = false;
          for (let i = 0; i < columns.length; i += 1) {
            if (Math.abs(columns[i][0].rect.left - sample.rect.left) <= 10) {
              columns[i].push(sample);
              placed = true;
              break;
            }
          }
          if (!placed) {
            columns.push([sample]);
          }
        });

      columns.forEach(function (column) {
        if (column.length < config.scanning.minGroupSize) {
          return;
        }

        const baseline = baselineNumeric(column, "width");
        if (!Number.isFinite(baseline)) {
          return;
        }

        column.forEach(function (sample) {
          const delta = Math.abs(sample.metrics.width - baseline);
          if (delta <= tolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "layout-column-width-rhythm",
              category: "layout",
              severity: safeSeverityFromDelta(delta, tolerance),
              delta: delta,
              message:
                "Column width drifts by " + utils.toFixed(delta, 1) + "px from peers",
              expected: utils.toFixed(baseline, 1) + "px",
              actual: utils.toFixed(sample.metrics.width, 1) + "px",
              sample: sample
            })
          );
        });
      });
    });
  }

  function intersectionArea(rectA, rectB) {
    const left = Math.max(rectA.left, rectB.left);
    const right = Math.min(rectA.right, rectB.right);
    const top = Math.max(rectA.top, rectB.top);
    const bottom = Math.min(rectA.bottom, rectB.bottom);
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) {
      return 0;
    }
    return width * height;
  }

  function pushOverlapFindings(samples, config, output) {
    const minArea = config.thresholds.overlapAreaPx;
    const maxChecks = config.scanning.maxOverlapChecks;

    const candidates = samples
      .filter(function (sample) {
        return sample.metrics.width > 10 && sample.metrics.height > 10;
      })
      .slice(0, config.scanning.overlapSampleLimit)
      .sort(byDocumentOrder);

    const pairSeen = new Set();
    let checks = 0;

    for (let i = 0; i < candidates.length; i += 1) {
      const a = candidates[i];
      for (let j = i + 1; j < candidates.length; j += 1) {
        const b = candidates[j];
        if (checks >= maxChecks) {
          return;
        }
        checks += 1;

        if (b.rect.top > a.rect.bottom + 20) {
          break;
        }

        if (
          a.element.contains(b.element) ||
          b.element.contains(a.element) ||
          a.element.parentElement === b.element ||
          b.element.parentElement === a.element
        ) {
          continue;
        }

        const key = a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id;
        if (pairSeen.has(key)) {
          continue;
        }
        pairSeen.add(key);

        const area = intersectionArea(a.rect, b.rect);
        if (area < minArea) {
          continue;
        }

        const ratioA = area / (a.rect.width * a.rect.height);
        const ratioB = area / (b.rect.width * b.rect.height);
        const overlapRatio = Math.max(ratioA, ratioB);
        if (overlapRatio < 0.16) {
          continue;
        }

        output.push(
          createFinding({
            ruleId: "layout-overlap-collision",
            category: "layout",
            severity: overlapRatio > 0.45 ? "critical" : "high",
            delta: overlapRatio,
            message:
              "Elements overlap with collision ratio " +
              utils.toFixed(overlapRatio * 100, 1) +
              "%",
            expected: "No unintended overlap",
            actual: "Overlap area " + utils.toFixed(area, 1) + "px2",
            sample: b,
            guides: [
              {
                type: "line",
                x1: Math.max(a.rect.left, b.rect.left),
                y1: Math.max(a.rect.top, b.rect.top),
                x2: Math.min(a.rect.right, b.rect.right),
                y2: Math.max(a.rect.top, b.rect.top),
                label: "Overlap zone"
              }
            ]
          })
        );
      }
    }
  }

  function pushNegativeSpacingFindings(samples, output) {
    const metrics = ["marginTop", "marginRight", "marginBottom", "marginLeft"];

    samples.forEach(function (sample) {
      metrics.forEach(function (metric) {
        const value = sample.metrics[metric];
        if (!Number.isFinite(value) || value >= 0) {
          return;
        }

        output.push(
          createFinding({
            ruleId: "spacing-negative-margin",
            category: "spacing",
            severity: value < -16 ? "high" : "medium",
            delta: Math.abs(value),
            message: "Negative margin detected on " + metric,
            expected: ">= 0px",
            actual: utils.toFixed(value, 1) + "px",
            sample: sample
          })
        );
      });
    });
  }

  function pushLineHeightRatioFindings(samples, config, output) {
    const minRatio = config.thresholds.fontLineRatioMin;
    const maxRatio = config.thresholds.fontLineRatioMax;

    samples.forEach(function (sample) {
      if (sample.textLength < 5 || sample.metrics.fontSize < 10) {
        return;
      }

      const ratio = sample.metrics.lineHeightRatio;
      if (!Number.isFinite(ratio) || ratio === 0) {
        return;
      }

      if (ratio >= minRatio && ratio <= maxRatio) {
        return;
      }

      const delta = ratio < minRatio ? minRatio - ratio : ratio - maxRatio;
      output.push(
        createFinding({
          ruleId: "typography-line-height-ratio",
          category: "typography",
          severity: ratio < 1 ? "critical" : "high",
          delta: delta,
          message: "Line-height ratio is outside readable range",
          expected:
            utils.toFixed(minRatio, 2) + " - " + utils.toFixed(maxRatio, 2),
          actual: utils.toFixed(ratio, 2),
          sample: sample
        })
      );
    });
  }

  function pushContrastFindings(samples, config, output) {
    const normalThreshold = config.thresholds.contrastRatioNormal;
    const largeThreshold = config.thresholds.contrastRatioLarge;

    samples.forEach(function (sample) {
      if (sample.textLength < 2) {
        return;
      }

      const foreground = sample.metrics.color;
      const background = sample.metrics.effectiveBackgroundColor;
      if (isTransparentColor(foreground)) {
        return;
      }

      const ratio = utils.contrastRatio(foreground, background);
      if (!Number.isFinite(ratio)) {
        return;
      }

      const isLargeText =
        sample.metrics.fontSize >= 18 ||
        (sample.metrics.fontSize >= 14 && sample.metrics.fontWeight >= 700);
      const threshold = isLargeText ? largeThreshold : normalThreshold;

      if (ratio >= threshold) {
        return;
      }

      const delta = threshold - ratio;
      output.push(
        createFinding({
          ruleId: "a11y-contrast-low",
          category: "accessibility",
          severity: ratio < threshold * 0.66 ? "critical" : "high",
          delta: delta,
          message:
            "Text contrast ratio " +
            utils.toFixed(ratio, 2) +
            " is below required threshold",
          expected: ">= " + threshold,
          actual: utils.toFixed(ratio, 2),
          sample: sample
        })
      );
    });
  }

  function pushTapTargetFindings(samples, config, output) {
    const minimum = config.thresholds.touchTargetMinPx;

    samples.forEach(function (sample) {
      if (!sample.isInteractive) {
        return;
      }

      const width = sample.metrics.width;
      const height = sample.metrics.height;
      if (width >= minimum && height >= minimum) {
        return;
      }

      const widthGap = Math.max(0, minimum - width);
      const heightGap = Math.max(0, minimum - height);
      const delta = Math.max(widthGap, heightGap);

      output.push(
        createFinding({
          ruleId: "a11y-touch-target-size",
          category: "accessibility",
          severity: delta > 16 ? "high" : "medium",
          delta: delta,
          message: "Interactive target is below minimum touch size",
          expected: minimum + "x" + minimum + "px",
          actual: utils.toFixed(width, 1) + "x" + utils.toFixed(height, 1) + "px",
          sample: sample,
          guides: [
            {
              type: "line",
              x1: sample.rect.left,
              y1: sample.rect.top - 6,
              x2: sample.rect.left + minimum,
              y2: sample.rect.top - 6,
              label: "Target width " + minimum + "px"
            },
            {
              type: "line",
              x1: sample.rect.left - 6,
              y1: sample.rect.top,
              x2: sample.rect.left - 6,
              y2: sample.rect.top + minimum,
              label: "Target height " + minimum + "px"
            }
          ]
        })
      );
    });
  }

  function pushHeadingHierarchyFindings(samples, config, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    const headings = Array.from(document.querySelectorAll(HEADING_SELECTOR)).filter(
      function (element) {
        return isVisible(element, 1);
      }
    );

    if (!headings.length) {
      return;
    }

    const firstLevel = Number.parseFloat(headings[0].tagName.slice(1));
    if (firstLevel > 1) {
      output.push(
        createFinding({
          ruleId: "a11y-heading-start-level",
          category: "accessibility",
          severity: "high",
          delta: firstLevel - 1,
          message: "Heading structure starts below h1",
          expected: "h1",
          actual: "h" + firstLevel,
          sample: sampleByElement.get(headings[0]) || buildSyntheticSample()
        })
      );
    }

    const h1Count = headings.filter(function (heading) {
      return heading.tagName.toLowerCase() === "h1";
    }).length;
    if (h1Count > 1) {
      output.push(
        createFinding({
          ruleId: "a11y-heading-multiple-h1",
          category: "accessibility",
          severity: "medium",
          delta: h1Count,
          message: "Multiple h1 headings detected",
          expected: "1",
          actual: String(h1Count),
          sample: sampleByElement.get(headings[0]) || buildSyntheticSample()
        })
      );
    }

    const jumpTolerance = config.thresholds.headingLevelJump;
    let previousLevel = firstLevel;

    for (let i = 1; i < headings.length; i += 1) {
      const heading = headings[i];
      const level = Number.parseFloat(heading.tagName.slice(1));
      if (!Number.isFinite(level)) {
        continue;
      }

      if (level - previousLevel > jumpTolerance) {
        output.push(
          createFinding({
            ruleId: "a11y-heading-level-jump",
            category: "accessibility",
            severity: "high",
            delta: level - previousLevel,
            message: "Heading level jumps without intermediate step",
            expected: "h" + (previousLevel + 1) + " or less",
            actual: "h" + level,
            sample: sampleByElement.get(heading) || buildSyntheticSample()
          })
        );
      }

      previousLevel = level;
    }
  }

  function hasAccessibleName(control) {
    if (!control || control.nodeType !== 1) {
      return false;
    }

    const labelText = control.getAttribute("aria-label") || "";
    if (labelText.trim()) {
      return true;
    }

    const labelledBy = control.getAttribute("aria-labelledby") || "";
    if (labelledBy.trim()) {
      return true;
    }

    const title = control.getAttribute("title") || "";
    if (title.trim()) {
      return true;
    }

    if (control.labels && control.labels.length > 0) {
      return true;
    }

    return false;
  }

  function pushFormLabelFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll(FORM_SELECTOR)).forEach(function (control) {
      if (!isVisible(control, 1)) {
        return;
      }
      if (hasAccessibleName(control)) {
        return;
      }

      const placeholder = (control.getAttribute("placeholder") || "").trim();
      const sample = sampleByElement.get(control) || buildSyntheticSample();

      output.push(
        createFinding({
          ruleId: "forms-missing-accessible-label",
          category: "forms",
          severity: placeholder ? "medium" : "high",
          delta: 1,
          message: "Form control is missing a robust accessible label",
          expected: "label, aria-label, or aria-labelledby",
          actual: placeholder ? "placeholder-only" : "none",
          sample: sample
        })
      );
    });
  }

  function pushDuplicateIdFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    const idMap = new Map();
    Array.from(document.querySelectorAll("[id]")).forEach(function (element) {
      const id = element.id;
      if (!id) {
        return;
      }
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id).push(element);
    });

    idMap.forEach(function (elements, id) {
      if (elements.length < 2) {
        return;
      }

      elements.slice(1).forEach(function (element) {
        output.push(
          createFinding({
            ruleId: "semantics-duplicate-id",
            category: "semantics",
            severity: "high",
            delta: elements.length,
            message: "Duplicate id detected",
            expected: "Unique id",
            actual: id,
            sample: sampleByElement.get(element) || buildSyntheticSample()
          })
        );
      });
    });
  }

  function pushCursorAffordanceFindings(samples, output) {
    samples.forEach(function (sample) {
      if (!sample.isInteractive) {
        return;
      }

      if (sample.tag === "button" || sample.tag === "a") {
        return;
      }

      const cursor = String(sample.metrics.cursor || "").toLowerCase();
      if (cursor === "pointer") {
        return;
      }

      output.push(
        createFinding({
          ruleId: "interaction-cursor-affordance",
          category: "interaction",
          severity: "medium",
          delta: 1,
          message: "Interactive element lacks pointer affordance",
          expected: "cursor:pointer",
          actual: cursor || "default",
          sample: sample
        })
      );
    });
  }

  function pushRoleButtonKeyboardFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("[role='button']")).forEach(function (element) {
      if (!isVisible(element, 1)) {
        return;
      }
      const tag = element.tagName.toLowerCase();
      if (tag === "button" || tag === "input") {
        return;
      }

      const tabindex = element.getAttribute("tabindex");
      if (tabindex != null && Number.parseFloat(tabindex) >= 0) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "interaction-role-button-keyboard",
          category: "interaction",
          severity: "high",
          delta: 1,
          message: "role='button' element is not keyboard focusable",
          expected: "tabindex=0",
          actual: tabindex == null ? "missing" : String(tabindex),
          sample: sampleByElement.get(element) || buildSyntheticSample()
        })
      );
    });
  }

  function pushAnchorHrefFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("a")).forEach(function (anchor) {
      if (!isVisible(anchor, 1)) {
        return;
      }
      if (anchor.hasAttribute("href")) {
        return;
      }
      if ((anchor.getAttribute("role") || "") === "button") {
        return;
      }

      output.push(
        createFinding({
          ruleId: "interaction-anchor-without-href",
          category: "interaction",
          severity: "medium",
          delta: 1,
          message: "Anchor without href behaves inconsistently",
          expected: "href or semantic button",
          actual: "no href",
          sample: sampleByElement.get(anchor) || buildSyntheticSample()
        })
      );
    });
  }

  function pushTextOverflowFindings(samples, output) {
    samples.forEach(function (sample) {
      if (sample.textLength < 8) {
        return;
      }

      const element = sample.element;
      const clippedX = element.scrollWidth - element.clientWidth > 2;
      const clippedY = element.scrollHeight - element.clientHeight > 2;
      if (!clippedX && !clippedY) {
        return;
      }

      const overflowX = String(sample.metrics.overflowX || "");
      const overflowY = String(sample.metrics.overflowY || "");
      const textOverflow = String(sample.metrics.textOverflow || "");
      const hasEllipsis = textOverflow.includes("ellipsis");

      if (
        clippedX &&
        (overflowX === "visible" || overflowX === "clip" || overflowX === "hidden") &&
        !hasEllipsis
      ) {
        output.push(
          createFinding({
            ruleId: "content-text-overflow-clip",
            category: "content",
            severity: "high",
            delta: element.scrollWidth - element.clientWidth,
            message: "Text appears clipped without ellipsis",
            expected: "Visible or explicitly truncated text",
            actual: "scrollWidth > clientWidth",
            sample: sample
          })
        );
      }

      if (clippedY && overflowY !== "visible") {
        output.push(
          createFinding({
            ruleId: "content-text-vertical-clip",
            category: "content",
            severity: "medium",
            delta: element.scrollHeight - element.clientHeight,
            message: "Vertical text clipping detected",
            expected: "No vertical clipping",
            actual: "scrollHeight > clientHeight",
            sample: sample
          })
        );
      }
    });
  }

  function pushZIndexFindings(samples, config, output, cssSourceIndex) {
    const max = config.thresholds.maxZIndex;

    samples.forEach(function (sample) {
      const z = sample.metrics.zIndex;
      if (!Number.isFinite(z) || z <= max) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "layer-z-index-outlier",
          category: "layering",
          severity: z > max * 3 ? "critical" : "high",
          delta: z - max,
          message: "z-index value is unusually high",
          expected: "<= " + max,
          actual: String(z),
          sample: sample,
          sourceHint: tracePropertySource(sample.element, cssSourceIndex, "z-index")
        })
      );
    });
  }

  function pushTokenScaleFindings(samples, config, output) {
    const spacingScale = config.designTokens.spacingScale || [];
    const radiusScale = config.designTokens.radiusScale || [];
    const fontScale = config.designTokens.fontScale || [];
    const tolerance = config.thresholds.tokenOffscalePx;

    samples.forEach(function (sample) {
      const candidates = [
        {
          metric: "paddingTop",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "padding-top"
        },
        {
          metric: "paddingRight",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "padding-right"
        },
        {
          metric: "paddingBottom",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "padding-bottom"
        },
        {
          metric: "paddingLeft",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "padding-left"
        },
        {
          metric: "marginTop",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "margin-top"
        },
        {
          metric: "marginRight",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "margin-right"
        },
        {
          metric: "marginBottom",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "margin-bottom"
        },
        {
          metric: "marginLeft",
          ruleId: "token-spacing-scale",
          scale: spacingScale,
          label: "margin-left"
        },
        {
          metric: "borderRadius",
          ruleId: "token-radius-scale",
          scale: radiusScale,
          label: "border-radius"
        },
        {
          metric: "fontSize",
          ruleId: "token-font-scale",
          scale: fontScale,
          label: "font-size"
        }
      ];

      const violations = [];
      candidates.forEach(function (candidate) {
        const value = sample.metrics[candidate.metric];
        if (!Number.isFinite(value) || value === 0) {
          return;
        }

        const nearest = utils.nearestValue(value, candidate.scale);
        if (!nearest || nearest.delta <= tolerance) {
          return;
        }

        violations.push({
          ruleId: candidate.ruleId,
          delta: nearest.delta,
          label: candidate.label,
          expected: nearest.value,
          actual: value
        });
      });

      violations
        .sort(function (a, b) {
          return b.delta - a.delta;
        })
        .slice(0, 2)
        .forEach(function (violation) {
          output.push(
            createFinding({
              ruleId: violation.ruleId,
              category: "design-system",
              severity: safeSeverityFromDelta(violation.delta, tolerance),
              delta: violation.delta,
              message:
                violation.label + " is off the configured design-token scale",
              expected: utils.toFixed(violation.expected, 2) + "px",
              actual: utils.toFixed(violation.actual, 2) + "px",
              sample: sample
            })
          );
        });
    });
  }

  function pushTokenDiversityFindings(samples, config, output) {
    const colorSet = new Set();
    const fontSet = new Set();
    const radiusSet = new Set();

    samples.forEach(function (sample) {
      if (sample.metrics.color && !isTransparentColor(sample.metrics.color)) {
        colorSet.add(sample.metrics.color);
      }
      if (
        sample.metrics.backgroundColor &&
        !isTransparentColor(sample.metrics.backgroundColor)
      ) {
        colorSet.add(sample.metrics.backgroundColor);
      }
      if (sample.metrics.fontFamily) {
        fontSet.add(sample.metrics.fontFamily);
      }
      if (Number.isFinite(sample.metrics.borderRadius) && sample.metrics.borderRadius >= 0) {
        radiusSet.add(Math.round(sample.metrics.borderRadius * 10) / 10);
      }
    });

    if (colorSet.size > config.thresholds.maxUniqueColors) {
      output.push(
        createFinding({
          ruleId: "token-color-diversity",
          category: "design-system",
          severity: "medium",
          delta: colorSet.size,
          message: "Large number of unique colors may indicate token drift",
          expected: "<= " + config.thresholds.maxUniqueColors,
          actual: String(colorSet.size)
        })
      );
    }

    if (fontSet.size > config.thresholds.maxUniqueFonts) {
      output.push(
        createFinding({
          ruleId: "token-font-diversity",
          category: "design-system",
          severity: "high",
          delta: fontSet.size,
          message: "Too many font families detected",
          expected: "<= " + config.thresholds.maxUniqueFonts,
          actual: String(fontSet.size)
        })
      );
    }

    if (radiusSet.size > config.thresholds.maxUniqueRadii) {
      output.push(
        createFinding({
          ruleId: "token-radius-diversity",
          category: "design-system",
          severity: "medium",
          delta: radiusSet.size,
          message: "Too many unique border-radius values detected",
          expected: "<= " + config.thresholds.maxUniqueRadii,
          actual: String(radiusSet.size)
        })
      );
    }
  }

  function pushInlineStyleFindings(samples, config, output) {
    const inlineSamples = samples.filter(function (sample) {
      return sample.hasInlineStyle;
    });

    if (inlineSamples.length <= config.thresholds.inlineStyleCount) {
      return;
    }

    output.push(
      createFinding({
        ruleId: "css-inline-style-overuse",
        category: "css-quality",
        severity: "medium",
        delta: inlineSamples.length,
        message: "Inline styles are heavily used",
        expected: "<= " + config.thresholds.inlineStyleCount,
        actual: String(inlineSamples.length),
        sample: inlineSamples[0]
      })
    );
  }

  function pushCssStatsFindings(samples, cssSourceIndex, config, output) {
    if (!cssSourceIndex || !cssSourceIndex.stats) {
      return;
    }

    const stats = cssSourceIndex.stats;

    if (stats.importantCount > config.thresholds.importantUsageCount) {
      output.push(
        createFinding({
          ruleId: "css-important-overuse",
          category: "css-quality",
          severity: "medium",
          delta: stats.importantCount,
          message: "Excessive !important usage detected",
          expected: "<= " + config.thresholds.importantUsageCount,
          actual: String(stats.importantCount),
          sample: samples[0] || buildSyntheticSample()
        })
      );
    }

    const minComplexity = config.thresholds.selectorComplexity;
    stats.complexSelectors
      .filter(function (item) {
        return item.complexity > minComplexity;
      })
      .slice(0, 10)
      .forEach(function (item) {
        output.push(
          createFinding({
            ruleId: "css-selector-complexity",
            category: "css-quality",
            severity: item.complexity > minComplexity + 2 ? "high" : "medium",
            delta: item.complexity,
            message: "Complex selector can increase style fragility",
            expected: "<= " + minComplexity,
            actual: item.selector,
            sample: samples[0] || buildSyntheticSample(),
            metadata: {
              source: item.source
            }
          })
        );
      });

    const declarationTotal =
      stats.variableDeclarationCount + stats.literalDeclarationCount;
    if (declarationTotal > 0) {
      const varRatio = stats.variableDeclarationCount / declarationTotal;
      if (varRatio < config.thresholds.minVarUsageRatio) {
        output.push(
          createFinding({
            ruleId: "css-token-var-usage",
            category: "css-quality",
            severity: "medium",
            delta: config.thresholds.minVarUsageRatio - varRatio,
            message: "Low CSS variable usage ratio in declarations",
            expected: ">= " + utils.toFixed(config.thresholds.minVarUsageRatio, 2),
            actual: utils.toFixed(varRatio, 2),
            sample: samples[0] || buildSyntheticSample()
          })
        );
      }
    }

    const interactiveCount = samples.filter(function (sample) {
      return sample.isInteractive;
    }).length;

    if (interactiveCount > 5 && stats.focusSelectorCount === 0) {
      output.push(
        createFinding({
          ruleId: "interaction-focus-style-coverage",
          category: "interaction",
          severity: "high",
          delta: interactiveCount,
          message: "No explicit :focus or :focus-visible selectors found",
          expected: ">= 1 focus style rule",
          actual: "0",
          sample: samples[0] || buildSyntheticSample()
        })
      );
    }
  }

  function pushStyleEntropyFindings(groupSamples, config, output) {
    const threshold = config.thresholds.styleEntropy;

    groupSamples.forEach(function (group) {
      if (group.length < 4) {
        return;
      }

      const signatures = group.map(function (sample) {
        return [
          sample.metrics.fontFamily,
          sample.metrics.fontSize,
          sample.metrics.fontWeight,
          sample.metrics.paddingTop,
          sample.metrics.paddingRight,
          sample.metrics.paddingBottom,
          sample.metrics.paddingLeft,
          sample.metrics.borderRadius,
          sample.metrics.color,
          sample.metrics.backgroundColor
        ].join("|");
      });

      const unique = new Set(signatures).size;
      const entropyRatio = unique / group.length;
      if (entropyRatio <= threshold) {
        return;
      }

      const countBySignature = new Map();
      signatures.forEach(function (signature) {
        countBySignature.set(signature, (countBySignature.get(signature) || 0) + 1);
      });

      group
        .filter(function (sample, index) {
          const sig = signatures[index];
          return (countBySignature.get(sig) || 0) <= 1;
        })
        .slice(0, 3)
        .forEach(function (sample) {
          output.push(
            createFinding({
              ruleId: "consistency-style-entropy",
              category: "consistency",
              severity: entropyRatio > threshold * 1.5 ? "high" : "medium",
              delta: entropyRatio,
              message: "Component group has high style entropy",
              expected: "<= " + utils.toFixed(threshold, 2),
              actual: utils.toFixed(entropyRatio, 2),
              sample: sample
            })
          );
        });
    });
  }

  function readCustomRuleValue(sample, rule) {
    const source = String(rule.source || "metric").toLowerCase();
    const property = String(rule.property || "");

    if (!property) {
      return null;
    }

    if (source === "metric") {
      return sample.metrics[property];
    }

    if (source === "style") {
      return window
        .getComputedStyle(sample.element)
        .getPropertyValue(property)
        .trim();
    }

    if (source === "attr") {
      return sample.element.getAttribute(property);
    }

    if (source === "dataset") {
      return sample.element.dataset ? sample.element.dataset[property] : null;
    }

    if (source === "rect") {
      return sample.rect[property];
    }

    if (source === "text") {
      return sample.textPreview || "";
    }

    return null;
  }

  function evaluateCustomOperator(actual, rule) {
    const operator = String(rule.operator || "eq").toLowerCase();
    const expected = rule.value;

    if (operator === "exists") {
      return actual != null && String(actual).trim() !== "";
    }

    if (operator === "notempty") {
      return actual != null && String(actual).trim().length > 0;
    }

    if (operator === "includes") {
      return String(actual || "").includes(String(expected || ""));
    }

    if (operator === "regex") {
      try {
        const regex = new RegExp(String(rule.pattern || expected || ""));
        return regex.test(String(actual || ""));
      } catch (error) {
        return true;
      }
    }

    const actualNum = Number.parseFloat(actual);
    const expectedNum = Number.parseFloat(expected);
    const tolerance = Number.parseFloat(rule.tolerance || 0);

    if (operator === "near") {
      if (!Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) {
        return false;
      }
      return Math.abs(actualNum - expectedNum) <= tolerance;
    }

    if (operator === "gt") {
      return Number.isFinite(actualNum) && Number.isFinite(expectedNum) && actualNum > expectedNum;
    }

    if (operator === "gte") {
      return Number.isFinite(actualNum) && Number.isFinite(expectedNum) && actualNum >= expectedNum;
    }

    if (operator === "lt") {
      return Number.isFinite(actualNum) && Number.isFinite(expectedNum) && actualNum < expectedNum;
    }

    if (operator === "lte") {
      return Number.isFinite(actualNum) && Number.isFinite(expectedNum) && actualNum <= expectedNum;
    }

    if (operator === "neq") {
      return String(actual) !== String(expected);
    }

    if (operator === "oneof") {
      if (!Array.isArray(expected)) {
        return false;
      }
      return expected.map(String).includes(String(actual));
    }

    return String(actual) === String(expected);
  }

  function parseCustomRules(config, output) {
    if (!config.customRules || !config.customRules.enabled) {
      return [];
    }

    const raw = (config.customRules.json || "[]").trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        output.push(
          createFinding({
            ruleId: "custom-rules-invalid-shape",
            category: "custom-rules",
            severity: "high",
            delta: 1,
            message: "Custom rules JSON must be an array",
            expected: "[]",
            actual: typeof parsed
          })
        );
        return [];
      }
      return parsed;
    } catch (error) {
      output.push(
        createFinding({
          ruleId: "custom-rules-parse-error",
          category: "custom-rules",
          severity: "high",
          delta: 1,
          message: "Custom rules JSON could not be parsed",
          expected: "Valid JSON array",
          actual: String(error.message || error)
        })
      );
      return [];
    }
  }

  function pushCustomRuleFindings(samples, config, output) {
    const rules = parseCustomRules(config, output);
    if (!rules.length) {
      return {
        parsed: rules.length,
        executed: 0
      };
    }

    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    let executed = 0;
    rules.slice(0, 80).forEach(function (rule, index) {
      if (!rule || typeof rule !== "object") {
        return;
      }

      const selector = rule.selector;
      if (!selector) {
        return;
      }

      let matchedElements;
      try {
        matchedElements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        output.push(
          createFinding({
            ruleId: "custom-rules-selector-invalid",
            category: "custom-rules",
            severity: "high",
            delta: 1,
            message: "Custom rule selector is invalid",
            expected: "Valid selector",
            actual: String(selector)
          })
        );
        return;
      }

      const type = String(rule.type || "assert").toLowerCase();
      const severity =
        String(rule.severity || "medium").toLowerCase() === "critical"
          ? "critical"
          : String(rule.severity || "medium").toLowerCase() === "high"
            ? "high"
            : String(rule.severity || "medium").toLowerCase() === "low"
              ? "low"
              : "medium";

      if (type === "consistency") {
        const subset = matchedElements
          .slice(0, config.customRules.maxMatchedElements)
          .map(function (element) {
            return sampleByElement.get(element) || collectElementSample(element, config);
          });

        const property = String(rule.property || "");
        const values = subset
          .map(function (sample) {
            return Number.parseFloat(readCustomRuleValue(sample, {
              source: rule.source || "metric",
              property: property
            }));
          })
          .filter(function (value) {
            return Number.isFinite(value);
          });

        if (values.length < 2) {
          return;
        }

        const baseline =
          String(rule.baseline || "median").toLowerCase() === "mode"
            ? utils.mode(values)
            : utils.median(values);
        const tolerance = Number.parseFloat(rule.tolerance || 0);

        subset.forEach(function (sample) {
          const actual = Number.parseFloat(
            readCustomRuleValue(sample, {
              source: rule.source || "metric",
              property: property
            })
          );
          if (!Number.isFinite(actual)) {
            return;
          }
          const delta = Math.abs(actual - baseline);
          if (delta <= tolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: rule.id || "custom-consistency-" + index,
              category: "custom-rules",
              severity: severity,
              delta: delta,
              message:
                rule.message ||
                "Custom consistency rule failed for " + (rule.property || "metric"),
              expected: String(baseline),
              actual: String(actual),
              sample: sample
            })
          );
        });

        executed += 1;
        return;
      }

      matchedElements
        .slice(0, config.customRules.maxMatchedElements)
        .forEach(function (element) {
          const sample = sampleByElement.get(element) || collectElementSample(element, config);
          const actual = readCustomRuleValue(sample, rule);
          const pass = evaluateCustomOperator(actual, rule);
          if (pass) {
            return;
          }

          output.push(
            createFinding({
              ruleId: rule.id || "custom-rule-" + index,
              category: "custom-rules",
              severity: severity,
              delta: Number.parseFloat(rule.delta || 1) || 1,
              message: rule.message || "Custom rule assertion failed",
              expected: rule.expected != null ? String(rule.expected) : String(rule.value),
              actual: String(actual),
              sample: sample
            })
          );
        });

      executed += 1;
    });

    return {
      parsed: rules.length,
      executed: executed
    };
  }

  function categoryBreakdown(findings) {
    const counts = {};
    findings.forEach(function (finding) {
      counts[finding.category] = (counts[finding.category] || 0) + 1;
    });
    return counts;
  }

  function ruleBreakdown(findings) {
    const counts = {};
    findings.forEach(function (finding) {
      counts[finding.ruleId] = (counts[finding.ruleId] || 0) + 1;
    });
    return counts;
  }

  function scoreFromFindings(findings) {
    const critical = findings.filter(function (finding) {
      return finding.severity === "critical";
    }).length;
    const high = findings.filter(function (finding) {
      return finding.severity === "high";
    }).length;
    const medium = findings.filter(function (finding) {
      return finding.severity === "medium";
    }).length;
    const low = findings.filter(function (finding) {
      return finding.severity === "low";
    }).length;

    const weightedPenalty = critical * 5 + high * 2.4 + medium * 1 + low * 0.35;
    const score = Math.max(0, 100 - weightedPenalty - findings.length * 0.1);

    return {
      critical: critical,
      high: high,
      medium: medium,
      low: low,
      total: findings.length,
      consistencyScore: utils.toFixed(score, 1)
    };
  }

  function dedupeFindings(findings) {
    const seen = new Set();
    return findings.filter(function (finding) {
      const key = [
        finding.ruleId,
        finding.selector,
        finding.expected,
        finding.actual,
        finding.message
      ].join("|");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function runScan(config) {
    const startedAt = performance.now();

    const elements = collectCandidates(config);
    const samples = elements.map(function (element) {
      return collectElementSample(element, config);
    });

    const grouped = new Map();
    samples.forEach(function (sample) {
      if (!grouped.has(sample.groupKey)) {
        grouped.set(sample.groupKey, []);
      }
      grouped.get(sample.groupKey).push(sample);
    });

    const analyzableGroups = Array.from(grouped.values()).filter(function (group) {
      return group.length >= config.scanning.minGroupSize;
    });

    const cssSourceIndex = config.scanning.traceCSS ? buildStyleRuleIndex() : null;

    const findings = [];

    runGroupRules(analyzableGroups, config, findings, cssSourceIndex);

    if (config.rules.checkWhitespaceRhythm) {
      pushWhitespaceFindings(samples, config, findings);
    }

    if (config.rules.checkTypographyAdvanced) {
      pushLineHeightRatioFindings(samples, config, findings);
    }

    if (config.rules.checkLayoutAdvanced) {
      pushRowHeightFindings(samples, config, findings);
      pushColumnWidthFindings(samples, config, findings);
      pushOverlapFindings(samples, config, findings);
      pushNegativeSpacingFindings(samples, findings);
    }

    if (config.rules.checkAccessibility) {
      pushContrastFindings(samples, config, findings);
      pushTapTargetFindings(samples, config, findings);
      pushHeadingHierarchyFindings(samples, config, findings);
      pushFormLabelFindings(samples, findings);
      pushDuplicateIdFindings(samples, findings);
    }

    if (config.rules.checkInteraction) {
      pushCursorAffordanceFindings(samples, findings);
      pushRoleButtonKeyboardFindings(samples, findings);
      pushAnchorHrefFindings(samples, findings);
    }

    if (config.rules.checkContent) {
      pushTextOverflowFindings(samples, findings);
    }

    if (config.rules.checkDesignTokens) {
      pushTokenScaleFindings(samples, config, findings);
      pushTokenDiversityFindings(samples, config, findings);
    }

    if (config.rules.checkCssQuality) {
      pushInlineStyleFindings(samples, config, findings);
      pushCssStatsFindings(samples, cssSourceIndex, config, findings);
      pushStyleEntropyFindings(analyzableGroups, config, findings);
      pushZIndexFindings(samples, config, findings, cssSourceIndex);
    }

    let customRulesMeta = { parsed: 0, executed: 0 };
    if (config.rules.checkCustomRules) {
      customRulesMeta = pushCustomRuleFindings(samples, config, findings);
    }

    const severityOrder = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    const deduped = dedupeFindings(findings);

    deduped.sort(function (a, b) {
      if (severityOrder[b.severity] !== severityOrder[a.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      if (b.delta !== a.delta) {
        return b.delta - a.delta;
      }
      return a.ruleId.localeCompare(b.ruleId);
    });

    const limitedFindings = deduped.slice(0, config.reporting.maxFindings);
    const summary = scoreFromFindings(limitedFindings);

    const elapsedMs = performance.now() - startedAt;

    return {
      meta: {
        runAt: utils.nowIso(),
        elapsedMs: utils.toFixed(elapsedMs, 1),
        inspectedElements: samples.length,
        groupsAnalyzed: analyzableGroups.length,
        stylesheetsIndexed: cssSourceIndex ? cssSourceIndex.stylesheetsIndexed : 0,
        cssRulesIndexed:
          cssSourceIndex && cssSourceIndex.stats
            ? cssSourceIndex.stats.rulesScanned
            : 0,
        truncated: deduped.length > limitedFindings.length,
        totalFindingsBeforeLimit: deduped.length,
        numericMetricsTracked: NUMERIC_METRICS.length,
        customRulesParsed: customRulesMeta.parsed,
        customRulesExecuted: customRulesMeta.executed
      },
      summary: summary,
      breakdown: {
        byCategory: categoryBreakdown(limitedFindings),
        byRule: ruleBreakdown(limitedFindings)
      },
      findings: limitedFindings
    };
  }

  root.scanner = {
    runScan: runScan
  };
})();
