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
  const FOCUSABLE_SELECTOR =
    "a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable='true']";
  const FIXABLE_RULE_PROPERTY_MAP = {
    "spacing-padding-top": "padding-top",
    "spacing-padding-right": "padding-right",
    "spacing-padding-bottom": "padding-bottom",
    "spacing-padding-left": "padding-left",
    "spacing-margin-top": "margin-top",
    "spacing-margin-right": "margin-right",
    "spacing-margin-bottom": "margin-bottom",
    "spacing-margin-left": "margin-left",
    "type-font-size": "font-size",
    "type-line-height": "line-height",
    "type-letter-spacing": "letter-spacing",
    "type-font-family": "font-family",
    "color-foreground": "color",
    "color-background": "background-color",
    "shape-border-radius": "border-radius",
    "shape-border-width": "border-width",
    "layer-z-index-outlier": "z-index",
    "interaction-cursor-affordance": "cursor"
  };

  const PIXEL_PROPERTY_SET = new Set([
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "font-size",
    "line-height",
    "letter-spacing",
    "border-radius",
    "border-width",
    "min-width",
    "min-height"
  ]);

  const PROPERTY_TO_METRIC = {
    "padding-top": "paddingTop",
    "padding-right": "paddingRight",
    "padding-bottom": "paddingBottom",
    "padding-left": "paddingLeft",
    "margin-top": "marginTop",
    "margin-right": "marginRight",
    "margin-bottom": "marginBottom",
    "margin-left": "marginLeft",
    "font-size": "fontSize",
    "line-height": "lineHeight",
    "letter-spacing": "letterSpacing",
    "border-radius": "borderRadius",
    "border-width": "borderWidth"
  };

  const FRAMEWORK_LIBRARY_MAP = {
    mui: {
      id: "mui",
      name: "Material UI",
      family: "component-library",
      caveat:
        "MUI hash classes (for example .css-*) are unstable across builds. Prefer .Mui* slot classes or theme styleOverrides.",
      preferredChannels: ["theme-styleOverrides", "sx-token", "scoped-css"]
    },
    tailwind: {
      id: "tailwind",
      name: "Tailwind CSS",
      family: "utility-first",
      caveat:
        "Tailwind fixes should generally be className utility updates or token updates rather than broad stylesheet overrides.",
      preferredChannels: ["utility-class", "design-token", "scoped-css"]
    },
    bootstrap: {
      id: "bootstrap",
      name: "Bootstrap",
      family: "component-library",
      caveat:
        "Bootstrap components often rely on CSS variables and utility classes. Prefer variable/utility adjustments before direct component overrides.",
      preferredChannels: ["css-variable", "utility-class", "scoped-css"]
    },
    chakra: {
      id: "chakra",
      name: "Chakra UI",
      family: "component-library",
      caveat:
        "Chakra fixes are safer via style props or theme extension, not direct CSS against generated classes.",
      preferredChannels: ["theme-extension", "style-prop", "scoped-css"]
    },
    antd: {
      id: "antd",
      name: "Ant Design",
      family: "component-library",
      caveat:
        "Ant Design recommends token/theming APIs first; raw .ant-* overrides can be brittle without scope guards.",
      preferredChannels: ["theme-token", "component-token", "scoped-css"]
    },
    mantine: {
      id: "mantine",
      name: "Mantine",
      family: "component-library",
      caveat:
        "Mantine styles are commonly controlled via props/styles API. Prefer theme-level overrides or component-level style props.",
      preferredChannels: ["theme-override", "styles-prop", "scoped-css"]
    },
    emotion: {
      id: "emotion",
      name: "Emotion",
      family: "css-in-js",
      caveat:
        "Emotion generated class names can be build-sensitive. Prefer stable parent selectors or component-level style definitions.",
      preferredChannels: ["component-style", "stable-scope-css"]
    },
    "styled-components": {
      id: "styled-components",
      name: "Styled Components",
      family: "css-in-js",
      caveat:
        "Styled-components class hashes can vary by build. Prefer editing styled definitions or using stable wrapper hooks.",
      preferredChannels: ["component-style", "stable-scope-css"]
    }
  };

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

  function classTokenInventory(samples, sampleLimit) {
    const limit = Number.isFinite(sampleLimit) ? sampleLimit : 1500;
    const classTokens = [];
    let totalElements = 0;

    for (let i = 0; i < samples.length; i += 1) {
      if (totalElements >= limit) {
        break;
      }
      const sample = samples[i];
      if (!sample || !sample.element || !sample.element.classList) {
        totalElements += 1;
        continue;
      }
      const classes = Array.from(sample.element.classList).slice(0, 32);
      classes.forEach(function (token) {
        const normalized = String(token || "").trim();
        if (normalized) {
          classTokens.push(normalized);
        }
      });
      totalElements += 1;
    }

    return {
      tokens: classTokens,
      elementsScanned: totalElements
    };
  }

  function countTokens(tokens, matcher) {
    let count = 0;
    for (let i = 0; i < tokens.length; i += 1) {
      if (matcher(tokens[i])) {
        count += 1;
      }
    }
    return count;
  }

  function countDomMatches(selector, cap) {
    const max = Number.isFinite(cap) ? cap : 1000;
    try {
      const nodes = document.querySelectorAll(selector);
      return Math.min(nodes.length, max);
    } catch (error) {
      return 0;
    }
  }

  function sourceInventoryFromNodeList(nodeList, field) {
    return Array.from(nodeList || [])
      .map(function (node) {
        return (node && node[field] ? String(node[field]) : "").toLowerCase();
      })
      .filter(Boolean);
  }

  function sourceInventoryFromStyleSheets() {
    return Array.from(document.styleSheets || [])
      .map(function (sheet) {
        return (sheet && sheet.href ? String(sheet.href) : "").toLowerCase();
      })
      .filter(Boolean);
  }

  function customPropertyPrefixCount(prefix) {
    const style = window.getComputedStyle(document.documentElement);
    let count = 0;
    for (let i = 0; i < style.length; i += 1) {
      const prop = style[i];
      if (prop && String(prop).toLowerCase().startsWith(prefix)) {
        count += 1;
      }
    }
    return count;
  }

  function pushFrameworkDetection(output, id, score, evidence, extra) {
    if (score < 14) {
      return;
    }

    const framework = FRAMEWORK_LIBRARY_MAP[id] || {
      id: id,
      name: id,
      family: "unknown",
      caveat: "",
      preferredChannels: ["scoped-css"]
    };

    const confidence = utils.clamp(score / 100, 0, 0.99);
    output.push({
      id: framework.id,
      name: framework.name,
      family: framework.family,
      score: utils.toFixed(score, 1),
      confidence: utils.toFixed(confidence, 2),
      evidence: (evidence || []).slice(0, 8),
      caveat: framework.caveat,
      preferredChannels: framework.preferredChannels || ["scoped-css"],
      metadata: extra || null
    });
  }

  function detectFrameworks(samples) {
    const inventory = classTokenInventory(samples, 1800);
    const tokens = inventory.tokens;
    const styleSources = sourceInventoryFromStyleSheets();
    const scriptSources = sourceInventoryFromNodeList(
      document.querySelectorAll("script[src]"),
      "src"
    );

    const output = [];

    const muiClassCount = countTokens(tokens, function (token) {
      return /^Mui[A-Z]/.test(token);
    });
    const muiRootLikeCount = countTokens(tokens, function (token) {
      return /^Mui[A-Z][A-Za-z0-9-]+-root$/.test(token);
    });
    const muiEmotionHashCount = countTokens(tokens, function (token) {
      return /^css-[a-z0-9]{4,}$/i.test(token);
    });
    const muiDataCount = countDomMatches("[data-mui-test], [data-mui-color-scheme]", 160);
    const muiSourceHints = styleSources.filter(function (source) {
      return source.includes("mui");
    }).length;
    const muiScore =
      Math.min(58, muiClassCount * 1.2) +
      Math.min(18, muiRootLikeCount * 1.4) +
      Math.min(12, muiEmotionHashCount * 0.16) +
      Math.min(8, muiDataCount * 2) +
      Math.min(12, muiSourceHints * 5);
    pushFrameworkDetection(
      output,
      "mui",
      muiScore,
      [
        "Mui classes: " + muiClassCount,
        "Mui root slots: " + muiRootLikeCount,
        "Emotion hash classes: " + muiEmotionHashCount,
        "MUI data attrs: " + muiDataCount,
        "Stylesheet hints: " + muiSourceHints
      ],
      {
        classCount: muiClassCount,
        rootSlots: muiRootLikeCount
      }
    );

    const tailwindUtilityCount = countTokens(tokens, function (token) {
      return /^(sm:|md:|lg:|xl:|2xl:|hover:|focus:|dark:|disabled:|group-hover:|peer-)?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min-w|max-w|min-h|max-h|text|bg|font|leading|tracking|rounded|shadow|ring|border|grid|flex|items|justify|content|place|gap|space-x|space-y|object|overflow|z|top|left|right|bottom|inset|translate|scale|rotate|opacity)-/.test(
        token
      );
    });
    const tailwindVariantCount = countTokens(tokens, function (token) {
      return /^(sm:|md:|lg:|xl:|2xl:|hover:|focus:|dark:|group-hover:|peer-)/.test(token);
    });
    const tailwindArbitraryCount = countTokens(tokens, function (token) {
      return token.includes("[") && token.includes("]");
    });
    const twCustomProps = customPropertyPrefixCount("--tw-");
    const twSourceHints = styleSources
      .concat(scriptSources)
      .filter(function (source) {
        return source.includes("tailwind");
      }).length;
    const tailwindScore =
      Math.min(58, tailwindUtilityCount * 0.45) +
      Math.min(14, tailwindVariantCount * 0.8) +
      Math.min(12, tailwindArbitraryCount * 0.9) +
      Math.min(12, twCustomProps * 1.5) +
      Math.min(10, twSourceHints * 6);
    pushFrameworkDetection(
      output,
      "tailwind",
      tailwindScore,
      [
        "Utility tokens: " + tailwindUtilityCount,
        "Variant tokens: " + tailwindVariantCount,
        "Arbitrary value tokens: " + tailwindArbitraryCount,
        "Custom properties (--tw-*): " + twCustomProps,
        "Source hints: " + twSourceHints
      ],
      {
        utilityTokens: tailwindUtilityCount
      }
    );

    const bootstrapClassCount = countTokens(tokens, function (token) {
      return /^(container(-fluid)?|row|col(-[a-z]+)?-\d+|btn(-[a-z]+)?|navbar(-[a-z]+)?|card|modal|dropdown(-menu)?|form-control)$/.test(
        token
      );
    });
    const bsSourceHints = styleSources
      .concat(scriptSources)
      .filter(function (source) {
        return source.includes("bootstrap");
      }).length;
    const bootstrapScore =
      Math.min(72, bootstrapClassCount * 1.1) + Math.min(16, bsSourceHints * 7);
    pushFrameworkDetection(output, "bootstrap", bootstrapScore, [
      "Bootstrap classes: " + bootstrapClassCount,
      "Source hints: " + bsSourceHints
    ]);

    const chakraClassCount = countTokens(tokens, function (token) {
      return /^chakra-/.test(token);
    });
    const chakraProps = customPropertyPrefixCount("--chakra-");
    const chakraSourceHints = styleSources
      .concat(scriptSources)
      .filter(function (source) {
        return source.includes("chakra");
      }).length;
    const chakraScore =
      Math.min(64, chakraClassCount * 1.5) +
      Math.min(18, chakraProps * 1.7) +
      Math.min(12, chakraSourceHints * 6);
    pushFrameworkDetection(output, "chakra", chakraScore, [
      "Chakra classes: " + chakraClassCount,
      "Custom properties (--chakra-*): " + chakraProps,
      "Source hints: " + chakraSourceHints
    ]);

    const antdClassCount = countTokens(tokens, function (token) {
      return /^ant-/.test(token);
    });
    const antdSourceHints = styleSources
      .concat(scriptSources)
      .filter(function (source) {
        return source.includes("antd") || source.includes("ant-design");
      }).length;
    const antdScore =
      Math.min(72, antdClassCount * 1.2) + Math.min(14, antdSourceHints * 7);
    pushFrameworkDetection(output, "antd", antdScore, [
      "Ant classes: " + antdClassCount,
      "Source hints: " + antdSourceHints
    ]);

    const mantineClassCount = countTokens(tokens, function (token) {
      return /^mantine-/.test(token);
    });
    const mantineProps = customPropertyPrefixCount("--mantine-");
    const mantineSourceHints = styleSources
      .concat(scriptSources)
      .filter(function (source) {
        return source.includes("mantine");
      }).length;
    const mantineScore =
      Math.min(70, mantineClassCount * 1.2) +
      Math.min(12, mantineProps * 1.5) +
      Math.min(10, mantineSourceHints * 6);
    pushFrameworkDetection(output, "mantine", mantineScore, [
      "Mantine classes: " + mantineClassCount,
      "Custom properties (--mantine-*): " + mantineProps,
      "Source hints: " + mantineSourceHints
    ]);

    const emotionHashCount = countTokens(tokens, function (token) {
      return /^css-[a-z0-9]{4,}$/i.test(token);
    });
    const emotionDataCount = countDomMatches("[data-emotion]", 200);
    const emotionSourceHints = scriptSources
      .concat(styleSources)
      .filter(function (source) {
        return source.includes("emotion");
      }).length;
    const emotionScore =
      Math.min(52, emotionHashCount * 0.18) +
      Math.min(26, emotionDataCount * 1.5) +
      Math.min(14, emotionSourceHints * 5);
    pushFrameworkDetection(output, "emotion", emotionScore, [
      "Emotion hash classes: " + emotionHashCount,
      "data-emotion nodes: " + emotionDataCount,
      "Source hints: " + emotionSourceHints
    ]);

    const scClassCount = countTokens(tokens, function (token) {
      return /^sc-[a-z0-9]{3,}$/i.test(token);
    });
    const scDataCount = countDomMatches("[data-styled], [data-styled-version]", 200);
    const scSourceHints = scriptSources
      .concat(styleSources)
      .filter(function (source) {
        return source.includes("styled-components");
      }).length;
    const scScore =
      Math.min(56, scClassCount * 0.7) +
      Math.min(26, scDataCount * 1.5) +
      Math.min(12, scSourceHints * 6);
    pushFrameworkDetection(output, "styled-components", scScore, [
      "Styled-components classes: " + scClassCount,
      "Styled data attrs: " + scDataCount,
      "Source hints: " + scSourceHints
    ]);

    output.sort(function (a, b) {
      return b.score - a.score;
    });

    const primary = output.length ? output[0] : null;
    const caveats = output.slice(0, 4).map(function (framework) {
      return {
        framework: framework.name,
        caveat: framework.caveat,
        preferredChannels: framework.preferredChannels
      };
    });

    return {
      primary: primary,
      detected: output,
      caveats: caveats,
      stats: {
        classTokensScanned: tokens.length,
        sampledElements: inventory.elementsScanned
      }
    };
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
      sampleId: sample.id || "",
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

  function inferAccessibleName(element) {
    if (!element || element.nodeType !== 1) {
      return "";
    }

    const ariaLabel = (element.getAttribute("aria-label") || "").trim();
    if (ariaLabel) {
      return ariaLabel;
    }

    const labelledBy = (element.getAttribute("aria-labelledby") || "").trim();
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map(function (idRef) {
          const ref = document.getElementById(idRef);
          return ref ? (ref.textContent || "").trim() : "";
        })
        .join(" ")
        .trim();
      if (text) {
        return text;
      }
    }

    const alt = (element.getAttribute("alt") || "").trim();
    if (alt) {
      return alt;
    }

    const title = (element.getAttribute("title") || "").trim();
    if (title) {
      return title;
    }

    if (element.labels && element.labels.length) {
      const labelsText = Array.from(element.labels)
        .map(function (label) {
          return (label.textContent || "").trim();
        })
        .join(" ")
        .trim();
      if (labelsText) {
        return labelsText;
      }
    }

    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isFocusableElement(element) {
    if (!element || element.nodeType !== 1) {
      return false;
    }
    if (!element.matches(FOCUSABLE_SELECTOR)) {
      return false;
    }
    if (element.hasAttribute("disabled")) {
      return false;
    }
    const tabIndex = element.getAttribute("tabindex");
    if (tabIndex != null) {
      const parsed = Number.parseFloat(tabIndex);
      return !Number.isFinite(parsed) || parsed >= 0;
    }
    return true;
  }

  function pushInteractiveNameFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    const inspected = new Set();
    samples.forEach(function (sample) {
      if (!sample.isInteractive) {
        return;
      }

      const element = sample.element;
      if (!element || inspected.has(element)) {
        return;
      }
      inspected.add(element);

      const name = inferAccessibleName(element);
      const hasText = (element.textContent || "").replace(/\s+/g, "").length > 0;
      if (name) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "a11y-interactive-name-missing",
          category: "accessibility",
          severity: hasText ? "medium" : "high",
          delta: 1,
          message: "Interactive control has no accessible name",
          expected: "Visible label, aria-label, or aria-labelledby",
          actual: "none",
          sample: sample
        })
      );
    });
  }

  function pushAriaHiddenFocusableFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("[aria-hidden='true']")).forEach(function (element) {
      if (!isVisible(element, 1)) {
        return;
      }
      if (!isFocusableElement(element)) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "a11y-aria-hidden-focusable",
          category: "accessibility",
          severity: "critical",
          delta: 1,
          message: "Focusable element is hidden from assistive technologies",
          expected: "Remove focusability or remove aria-hidden",
          actual: "aria-hidden=true + focusable",
          sample: sampleByElement.get(element) || collectElementSample(element, root.DEFAULT_CONFIG)
        })
      );
    });
  }

  function pushPositiveTabindexFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("[tabindex]")).forEach(function (element) {
      if (!isVisible(element, 1)) {
        return;
      }
      const tabindex = Number.parseFloat(element.getAttribute("tabindex"));
      if (!Number.isFinite(tabindex) || tabindex <= 0) {
        return;
      }

      output.push(
        createFinding({
          ruleId: "a11y-positive-tabindex",
          category: "accessibility",
          severity: tabindex > 5 ? "high" : "medium",
          delta: tabindex,
          message: "Positive tabindex can break logical keyboard order",
          expected: "tabindex=0 or natural DOM order",
          actual: String(tabindex),
          sample: sampleByElement.get(element) || collectElementSample(element, root.DEFAULT_CONFIG)
        })
      );
    });
  }

  function pushImageAltFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("img")).forEach(function (image) {
      if (!isVisible(image, 1)) {
        return;
      }

      const alt = image.getAttribute("alt");
      const role = (image.getAttribute("role") || "").toLowerCase();
      if (alt != null) {
        const normalized = alt.trim().toLowerCase();
        if (
          normalized &&
          (normalized === "image" ||
            normalized === "icon" ||
            normalized === "photo" ||
            normalized === "graphic")
        ) {
          output.push(
            createFinding({
              ruleId: "a11y-image-alt-generic",
              category: "accessibility",
              severity: "medium",
              delta: 1,
              message: "Image alt text is generic and uninformative",
              expected: "Meaningful alt text or empty alt for decorative images",
              actual: alt,
              sample: sampleByElement.get(image) || collectElementSample(image, root.DEFAULT_CONFIG)
            })
          );
        }
        return;
      }

      if (role === "presentation" || role === "none") {
        return;
      }

      output.push(
        createFinding({
          ruleId: "a11y-image-alt-missing",
          category: "accessibility",
          severity: "high",
          delta: 1,
          message: "Image is missing alt text",
          expected: 'alt="" for decorative, or descriptive alt text',
          actual: "missing",
          sample: sampleByElement.get(image) || collectElementSample(image, root.DEFAULT_CONFIG)
        })
      );
    });
  }

  function pushInvalidAriaReferenceFindings(samples, output) {
    const sampleByElement = new Map();
    samples.forEach(function (sample) {
      sampleByElement.set(sample.element, sample);
    });

    Array.from(document.querySelectorAll("[aria-labelledby], [aria-describedby]")).forEach(
      function (element) {
        if (!isVisible(element, 1)) {
          return;
        }

        ["aria-labelledby", "aria-describedby"].forEach(function (attributeName) {
          const value = (element.getAttribute(attributeName) || "").trim();
          if (!value) {
            return;
          }

          const missing = value
            .split(/\s+/)
            .filter(Boolean)
            .filter(function (idRef) {
              return !document.getElementById(idRef);
            });
          if (!missing.length) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "a11y-invalid-aria-reference",
              category: "accessibility",
              severity: "high",
              delta: missing.length,
              message: attributeName + " references missing ids",
              expected: "All ids should exist in DOM",
              actual: missing.join(", "),
              sample: sampleByElement.get(element) || collectElementSample(element, root.DEFAULT_CONFIG)
            })
          );
        });
      }
    );
  }

  function pushLandmarkCoverageFindings(samples, output) {
    const landmarks = [
      "main",
      "[role='main']",
      "header",
      "[role='banner']",
      "nav",
      "[role='navigation']",
      "footer",
      "[role='contentinfo']"
    ];

    const hasMain = !!document.querySelector("main, [role='main']");
    if (!hasMain) {
      output.push(
        createFinding({
          ruleId: "a11y-landmark-main-missing",
          category: "accessibility",
          severity: "medium",
          delta: 1,
          message: "Page is missing a main landmark",
          expected: "<main> or role='main'",
          actual: "none",
          sample: samples[0] || buildSyntheticSample()
        })
      );
    }

    const landmarkCount = landmarks.reduce(function (count, selector) {
      return count + document.querySelectorAll(selector).length;
    }, 0);
    if (landmarkCount <= 1) {
      output.push(
        createFinding({
          ruleId: "a11y-landmark-coverage-low",
          category: "accessibility",
          severity: "low",
          delta: 1,
          message: "Low landmark coverage can reduce navigation efficiency",
          expected: "Multiple structural landmarks",
          actual: String(landmarkCount),
          sample: samples[0] || buildSyntheticSample()
        })
      );
    }
  }

  function selectorFromElement(element) {
    return element ? utils.safeSelector(element) : "";
  }

  function sampleFromElement(element, sampleByElement, config) {
    return sampleByElement.get(element) || collectElementSample(element, config || root.DEFAULT_CONFIG);
  }

  function detectCardClusters(samples, config) {
    const grouped = new Map();
    samples.forEach(function (sample) {
      if (!sample || !sample.element) {
        return;
      }
      if (sample.metrics.width < 220 || sample.metrics.height < 90) {
        return;
      }
      if (sample.tag !== "div" && sample.tag !== "article" && sample.tag !== "section" && sample.tag !== "li") {
        return;
      }
      const className = String(sample.element.className || "");
      const hasCardHint =
        /card|panel|tile|todo|item|paper|surface|container/i.test(className) ||
        sample.element.hasAttribute("data-todo-item-type");
      if (!hasCardHint) {
        return;
      }

      const key = sample.groupKey || sample.tag;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(sample);
    });

    const clusters = Array.from(grouped.values()).filter(function (group) {
      return group.length >= Math.max(2, config.scanning.minGroupSize - 1);
    });

    return clusters.slice(0, 24);
  }

  function findPrimaryTextNodes(cardElement) {
    if (!cardElement) {
      return [];
    }
    const candidates = Array.from(
      cardElement.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, a, button, label")
    )
      .filter(function (node) {
        if (!isVisible(node, 1)) {
          return false;
        }
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length < 2) {
          return false;
        }
        if (node.closest("[aria-hidden='true']")) {
          return false;
        }
        return true;
      })
      .slice(0, 120);
    return candidates;
  }

  function classifyCardComponent(sample) {
    const element = sample.element;
    const texts = findPrimaryTextNodes(element);
    if (!texts.length) {
      return null;
    }

    const cardRect = sample.rect;
    const scored = texts.map(function (node) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const fontSize = utils.parsePx(style.fontSize);
      const fontWeight = parseFontWeight(style.fontWeight);
      const topOffset = rect.top + (window.scrollY || 0) - cardRect.top;
      const headingBonus = /^h[1-6]$/i.test(node.tagName) ? 6 : 0;
      const score = fontSize * 2 + fontWeight * 0.02 + headingBonus - topOffset * 0.06;
      return {
        node: node,
        fontSize: fontSize,
        fontWeight: fontWeight,
        topOffset: topOffset,
        rect: toPageRect(rect),
        textLength: (node.textContent || "").trim().length,
        score: score
      };
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    const title = scored[0];
    if (!title) {
      return null;
    }

    const body = scored
      .filter(function (entry) {
        return (
          entry.node !== title.node &&
          entry.topOffset >= title.topOffset &&
          entry.textLength >= 24 &&
          entry.fontSize <= title.fontSize + 2
        );
      })
      .sort(function (a, b) {
        return a.topOffset - b.topOffset;
      })[0];

    const actionCandidates = Array.from(
      element.querySelectorAll("button, a[href], [role='button']")
    )
      .filter(function (node) {
        if (!isVisible(node, 1)) {
          return false;
        }
        const label = (node.textContent || "").replace(/\s+/g, " ").trim();
        return label.length >= 2 && label.length <= 40;
      })
      .map(function (node) {
        return {
          node: node,
          rect: toPageRect(node.getBoundingClientRect())
        };
      });

    const action = actionCandidates.sort(function (a, b) {
      return a.rect.top - b.rect.top;
    })[0];

    const dismissButton = Array.from(element.querySelectorAll("button, [role='button']")).find(
      function (node) {
        const label = (node.getAttribute("aria-label") || "").toLowerCase();
        return /dismiss|close|remove/.test(label);
      }
    );

    const icon = Array.from(element.querySelectorAll("img, svg"))
      .filter(function (node) {
        if (!isVisible(node, 1)) {
          return false;
        }
        const rect = node.getBoundingClientRect();
        return rect.width >= 14 && rect.width <= 110 && rect.height >= 14 && rect.height <= 110;
      })
      .sort(function (a, b) {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        const topA = rectA.top + (window.scrollY || 0);
        const topB = rectB.top + (window.scrollY || 0);
        if (topA !== topB) {
          return topA - topB;
        }
        return rectA.left - rectB.left;
      })[0];

    return {
      sample: sample,
      cardElement: element,
      cardRect: cardRect,
      title: title,
      body: body || null,
      action: action || null,
      dismissButton: dismissButton || null,
      icon: icon || null
    };
  }

  function buildElementInsetHint(cardElement, element, targetInset, confidence) {
    if (!cardElement || !element || !Number.isFinite(targetInset)) {
      return null;
    }

    const selector = selectorFromElement(element);
    if (!selector) {
      return null;
    }

    const cardRect = cardElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const currentInset = elementRect.left - cardRect.left;
    const delta = targetInset - currentInset;
    if (Math.abs(delta) < 0.75) {
      return null;
    }

    const style = window.getComputedStyle(element);
    const marginLeft = utils.parsePx(style.marginLeft);
    const paddingLeft = utils.parsePx(style.paddingLeft);
    const preferMargin = marginLeft > 0.2 || paddingLeft < 0.2;
    const property = preferMargin ? "margin-left" : "padding-left";
    const current = preferMargin ? marginLeft : paddingLeft;
    const nextValue = Math.max(0, current + delta);

    return {
      selector: selector,
      property: property,
      value: utils.toFixed(nextValue, 2) + "px",
      confidence: confidence || "context-high"
    };
  }

  function buildInsetFixHints(component, targetInset) {
    if (!component || !component.title || !Number.isFinite(targetInset)) {
      return [];
    }

    const targetElement = component.title.node.parentElement || component.title.node;
    const hint = buildElementInsetHint(
      component.cardElement,
      targetElement,
      targetInset,
      "context-high"
    );
    return hint ? [hint] : [];
  }

  function buildBodyActionAnchorFixHints(component, targetInset) {
    if (!component || !Number.isFinite(targetInset)) {
      return [];
    }

    const hints = [];
    if (component.body && component.body.node) {
      const bodyHint = buildElementInsetHint(
        component.cardElement,
        component.body.node,
        targetInset,
        "context-high"
      );
      if (bodyHint) {
        hints.push(bodyHint);
      }
    }
    if (component.action && component.action.node) {
      const actionHint = buildElementInsetHint(
        component.cardElement,
        component.action.node,
        targetInset,
        "context-medium"
      );
      if (actionHint) {
        hints.push(actionHint);
      }
    }
    return hints.slice(0, 3);
  }

  function buildIconGapFixHints(component, targetGap) {
    if (!component || !component.icon || !component.title || !Number.isFinite(targetGap)) {
      return [];
    }
    const iconSelector = selectorFromElement(component.icon);
    if (!iconSelector) {
      return [];
    }

    const iconRect = component.icon.getBoundingClientRect();
    const titleRect = component.title.node.getBoundingClientRect();
    const currentGap = titleRect.left - iconRect.right;
    const delta = targetGap - currentGap;
    if (Math.abs(delta) < 0.75) {
      return [];
    }

    const iconStyle = window.getComputedStyle(component.icon);
    const marginRight = utils.parsePx(iconStyle.marginRight);
    return [
      {
        selector: iconSelector,
        property: "margin-right",
        value: utils.toFixed(Math.max(0, marginRight + delta), 2) + "px",
        confidence: "context-medium"
      }
    ];
  }

  function buildDismissFixHints(component, topTarget, rightTarget) {
    if (!component || !component.dismissButton) {
      return [];
    }

    const buttonSelector = selectorFromElement(component.dismissButton);
    const cardSelector = selectorFromElement(component.cardElement);
    if (!buttonSelector || !cardSelector) {
      return [];
    }

    const style = window.getComputedStyle(component.cardElement);
    const hints = [];
    if (style.position === "static") {
      hints.push({
        selector: cardSelector,
        property: "position",
        value: "relative",
        confidence: "context-medium"
      });
    }

    hints.push(
      {
        selector: buttonSelector,
        property: "position",
        value: "absolute",
        confidence: "context-high"
      },
      {
        selector: buttonSelector,
        property: "top",
        value: utils.toFixed(Math.max(0, topTarget), 2) + "px",
        confidence: "context-high"
      },
      {
        selector: buttonSelector,
        property: "right",
        value: utils.toFixed(Math.max(0, rightTarget), 2) + "px",
        confidence: "context-high"
      }
    );

    return hints;
  }

  function pushCardLayoutAndTypographyFindings(samples, config, output) {
    const includeLayout = !!(config.rules.checkLayoutAdvanced || config.rules.checkAlignment);
    const includeTypography = !!(
      config.rules.checkTypographyAdvanced || config.rules.checkTypography
    );
    if (!includeLayout && !includeTypography) {
      return;
    }

    const clusters = detectCardClusters(samples, config);
    const cardInsetTolerance = Number.isFinite(config.thresholds.cardTitleInsetPx)
      ? config.thresholds.cardTitleInsetPx
      : 8;
    const dismissTolerance = Number.isFinite(config.thresholds.cardDismissOffsetPx)
      ? config.thresholds.cardDismissOffsetPx
      : 4;
    const titleBodyGapTolerance = Number.isFinite(config.thresholds.cardTitleBodyGapPx)
      ? config.thresholds.cardTitleBodyGapPx
      : 4;
    const minTitleScale = Number.isFinite(config.thresholds.titleBodyScaleMin)
      ? config.thresholds.titleBodyScaleMin
      : 1.18;
    const titleWeightTolerance = Number.isFinite(config.thresholds.titleWeightDelta)
      ? config.thresholds.titleWeightDelta
      : 80;

    clusters.forEach(function (cluster) {
      const components = cluster
        .map(function (sample) {
          return classifyCardComponent(sample);
        })
        .filter(Boolean);

      if (components.length < 2) {
        return;
      }

      const baselineTitleInset = includeLayout
        ? utils.median(
            components
              .map(function (component) {
                return component.title.rect.left - component.cardRect.left;
              })
              .filter(function (value) {
                return Number.isFinite(value);
              })
          )
        : null;

      if (includeLayout && Number.isFinite(baselineTitleInset)) {
        components.forEach(function (component) {
          const actualInset = component.title.rect.left - component.cardRect.left;
          const delta = Math.abs(actualInset - baselineTitleInset);
          if (delta <= Math.max(cardInsetTolerance, config.thresholds.alignmentPx * 0.8)) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "layout-card-title-anchor-left",
              category: "layout",
              severity: safeSeverityFromDelta(
                delta,
                Math.max(cardInsetTolerance, config.thresholds.alignmentPx)
              ),
              delta: delta,
              message:
                "Card title horizontal anchor is inconsistent with peer cards",
              expected: utils.toFixed(baselineTitleInset, 1) + "px from card left",
              actual: utils.toFixed(actualInset, 1) + "px from card left",
              sample: component.sample,
              metadata: {
                suggestedFixes: buildInsetFixHints(component, baselineTitleInset)
              }
            })
          );
        });
      }

      if (includeLayout) {
        const dismissOffsets = components
          .filter(function (component) {
            return !!component.dismissButton;
          })
          .map(function (component) {
            const buttonRect = toPageRect(component.dismissButton.getBoundingClientRect());
            return {
              component: component,
              top: buttonRect.top - component.cardRect.top,
              right: component.cardRect.right - buttonRect.right
            };
          });
        if (dismissOffsets.length >= 2) {
          const baselineTop = utils.median(
            dismissOffsets.map(function (entry) {
              return entry.top;
            })
          );
          const baselineRight = utils.median(
            dismissOffsets.map(function (entry) {
              return entry.right;
            })
          );

          dismissOffsets.forEach(function (entry) {
            const delta = Math.max(
              Math.abs(entry.top - baselineTop),
              Math.abs(entry.right - baselineRight)
            );
            if (delta <= dismissTolerance) {
              return;
            }

            output.push(
              createFinding({
                ruleId: "layout-dismiss-button-offset",
                category: "layout",
                severity: delta > dismissTolerance * 2.4 ? "high" : "medium",
                delta: delta,
                message: "Dismiss/close control offset is inconsistent across cards",
                expected:
                  "top " +
                  utils.toFixed(baselineTop, 1) +
                  "px, right " +
                  utils.toFixed(baselineRight, 1) +
                  "px",
                actual:
                  "top " +
                  utils.toFixed(entry.top, 1) +
                  "px, right " +
                  utils.toFixed(entry.right, 1) +
                  "px",
                sample: entry.component.sample,
                metadata: {
                  suggestedFixes: buildDismissFixHints(
                    entry.component,
                    baselineTop,
                    baselineRight
                  )
                }
              })
            );
          });
        }
      }

      if (includeLayout) {
        const titleBodyGaps = components
          .filter(function (component) {
            return !!component.body;
          })
          .map(function (component) {
            return {
              component: component,
              gap: component.body.rect.top - component.title.rect.bottom
            };
          })
          .filter(function (entry) {
            return Number.isFinite(entry.gap);
          });

        if (titleBodyGaps.length >= 2) {
          const baselineGap = utils.median(
            titleBodyGaps.map(function (entry) {
              return entry.gap;
            })
          );
          titleBodyGaps.forEach(function (entry) {
            const delta = Math.abs(entry.gap - baselineGap);
            if (delta <= Math.max(titleBodyGapTolerance, config.thresholds.whitespacePx * 0.45)) {
              return;
            }

            const suggestedFixes = entry.component.body
              ? [
                  {
                    selector: selectorFromElement(entry.component.body.node),
                    property: "margin-top",
                    value: utils.toFixed(Math.max(0, baselineGap), 2) + "px",
                    confidence: "context-high"
                  }
                ]
              : [];

            output.push(
              createFinding({
                ruleId: "layout-card-title-body-gap",
                category: "layout",
                severity: safeSeverityFromDelta(
                  delta,
                  Math.max(titleBodyGapTolerance, config.thresholds.whitespacePx * 0.5)
                ),
                delta: delta,
                message: "Card title-to-body whitespace rhythm is inconsistent",
                expected: utils.toFixed(baselineGap, 1) + "px",
                actual: utils.toFixed(entry.gap, 1) + "px",
                sample: entry.component.sample,
                metadata: {
                  suggestedFixes: suggestedFixes
                }
              })
            );
          });
        }
      }

      if (includeLayout && Number.isFinite(baselineTitleInset)) {
        const anchorTolerance = Math.max(cardInsetTolerance * 0.75, config.thresholds.alignmentPx * 0.7);
        components.forEach(function (component) {
          const anchors = [];
          if (component.body && Number.isFinite(component.body.rect.left)) {
            anchors.push(component.body.rect.left - component.cardRect.left);
          }
          if (component.action && Number.isFinite(component.action.rect.left)) {
            anchors.push(component.action.rect.left - component.cardRect.left);
          }
          if (!anchors.length) {
            return;
          }

          const localAnchor = utils.median(anchors);
          const delta = Math.abs(localAnchor - baselineTitleInset);
          if (delta <= anchorTolerance) {
            return;
          }

          output.push(
            createFinding({
              ruleId: "layout-card-content-column-anchor",
              category: "layout",
              severity: safeSeverityFromDelta(delta, anchorTolerance),
              delta: delta,
              message: "Body/action column is not aligned with the title anchor",
              expected: utils.toFixed(baselineTitleInset, 1) + "px from card left",
              actual: utils.toFixed(localAnchor, 1) + "px from card left",
              sample: component.sample,
              metadata: {
                suggestedFixes: buildBodyActionAnchorFixHints(component, baselineTitleInset)
              }
            })
          );
        });
      }

      if (includeLayout) {
        const iconGaps = components
          .filter(function (component) {
            return !!component.icon && !!component.title;
          })
          .map(function (component) {
            const iconRect = component.icon.getBoundingClientRect();
            const titleRect = component.title.node.getBoundingClientRect();
            return {
              component: component,
              gap: titleRect.left - iconRect.right
            };
          })
          .filter(function (entry) {
            return Number.isFinite(entry.gap) && entry.gap >= -8;
          });

        if (iconGaps.length >= 2) {
          const baselineGap = utils.median(
            iconGaps.map(function (entry) {
              return entry.gap;
            })
          );
          const iconGapTolerance = Math.max(4, config.thresholds.alignmentPx * 0.55);
          iconGaps.forEach(function (entry) {
            const delta = Math.abs(entry.gap - baselineGap);
            if (delta <= iconGapTolerance) {
              return;
            }

            output.push(
              createFinding({
                ruleId: "layout-card-icon-text-gutter",
                category: "layout",
                severity: safeSeverityFromDelta(delta, iconGapTolerance),
                delta: delta,
                message: "Icon-to-title gutter drifts from peer card rhythm",
                expected: utils.toFixed(baselineGap, 1) + "px gap",
                actual: utils.toFixed(entry.gap, 1) + "px gap",
                sample: entry.component.sample,
                metadata: {
                  suggestedFixes: buildIconGapFixHints(entry.component, baselineGap)
                }
              })
            );
          });
        }
      }

      if (includeTypography) {
        const titleSizeValues = components
          .map(function (component) {
            return component.title.fontSize;
          })
          .filter(function (value) {
            return Number.isFinite(value) && value > 0;
          });
        const baselineTitleSize = utils.median(titleSizeValues);
        const baselineTitleWeight = utils.median(
          components.map(function (component) {
            return component.title.fontWeight;
          })
        );

        components.forEach(function (component) {
          if (component.body) {
            const ratio = component.title.fontSize / Math.max(1, component.body.fontSize);
            if (ratio < minTitleScale) {
              const suggestedTitleSize = Math.max(
                component.body.fontSize * 1.22,
                component.title.fontSize + 1
              );
              output.push(
                createFinding({
                  ruleId: "typography-hierarchy-title-scale",
                  category: "typography",
                  severity: ratio < minTitleScale - 0.1 ? "high" : "medium",
                  delta: minTitleScale - ratio,
                  message: "Title text is too close in size to body text",
                  expected: ">= " + utils.toFixed(minTitleScale, 2) + "x body size",
                  actual: utils.toFixed(ratio, 2) + "x",
                  sample: component.sample,
                  metadata: {
                    suggestedFixes: [
                      {
                        selector: selectorFromElement(component.title.node),
                        property: "font-size",
                        value: utils.toFixed(suggestedTitleSize, 2) + "px",
                        confidence: "context-medium"
                      }
                    ]
                  }
                })
              );
            }
          }

          if (
            Number.isFinite(baselineTitleSize) &&
            Math.abs(component.title.fontSize - baselineTitleSize) >
              Math.max(1.2, config.thresholds.fontSizePx)
          ) {
            output.push(
              createFinding({
                ruleId: "typography-hierarchy-title-consistency",
                category: "typography",
                severity: "medium",
                delta: Math.abs(component.title.fontSize - baselineTitleSize),
                message: "Title size is inconsistent across similar cards",
                expected: utils.toFixed(baselineTitleSize, 2) + "px",
                actual: utils.toFixed(component.title.fontSize, 2) + "px",
                sample: component.sample,
                metadata: {
                  suggestedFixes: [
                    {
                      selector: selectorFromElement(component.title.node),
                      property: "font-size",
                      value: utils.toFixed(baselineTitleSize, 2) + "px",
                      confidence: "context-medium"
                    }
                  ]
                }
              })
            );
          }

          if (
            Number.isFinite(baselineTitleWeight) &&
            Math.abs(component.title.fontWeight - baselineTitleWeight) > titleWeightTolerance
          ) {
            output.push(
              createFinding({
                ruleId: "typography-hierarchy-title-weight",
                category: "typography",
                severity: "low",
                delta: Math.abs(component.title.fontWeight - baselineTitleWeight),
                message: "Title font-weight drifts from peer hierarchy",
                expected: String(Math.round(baselineTitleWeight)),
                actual: String(Math.round(component.title.fontWeight)),
                sample: component.sample,
                metadata: {
                  suggestedFixes: [
                    {
                      selector: selectorFromElement(component.title.node),
                      property: "font-weight",
                      value: String(Math.round(baselineTitleWeight)),
                      confidence: "context-low"
                    }
                  ]
                }
              })
            );
          }
        });
      }
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

  function severityWeight(severity) {
    if (severity === "critical") {
      return 4;
    }
    if (severity === "high") {
      return 3;
    }
    if (severity === "medium") {
      return 2;
    }
    return 1;
  }

  function formatCssNumber(value) {
    if (!Number.isFinite(value)) {
      return null;
    }
    return String(utils.toFixed(value, 2));
  }

  function parsePixelValue(value) {
    const text = String(value || "").trim();
    if (!text) {
      return null;
    }

    const pxMatch = text.match(/-?\d+(?:\.\d+)?\s*px/i);
    if (pxMatch) {
      const parsed = Number.parseFloat(pxMatch[0]);
      if (Number.isFinite(parsed)) {
        return formatCssNumber(parsed) + "px";
      }
    }

    const numericMatch = text.match(/^-?\d+(?:\.\d+)?$/);
    if (numericMatch) {
      const parsed = Number.parseFloat(text);
      if (Number.isFinite(parsed)) {
        return formatCssNumber(parsed) + "px";
      }
    }

    return null;
  }

  function parseUpperBoundNumber(value) {
    const text = String(value || "").trim();
    if (!text) {
      return null;
    }

    const boundMatch = text.match(/<=\s*(-?\d+(?:\.\d+)?)/);
    if (boundMatch) {
      const parsed = Number.parseFloat(boundMatch[1]);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const numeric = Number.parseFloat(text);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function parseTouchTarget(expectedText) {
    const text = String(expectedText || "").trim();
    const match = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*px/i);
    if (!match) {
      return null;
    }

    const width = Number.parseFloat(match[1]);
    const height = Number.parseFloat(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }

    return {
      width: formatCssNumber(width) + "px",
      height: formatCssNumber(height) + "px"
    };
  }

  function parseTokenPropertyFromMessage(messageText) {
    const text = String(messageText || "").trim();
    const match = text.match(/^([a-z-]+)\s+is off the configured design-token scale/i);
    return match ? String(match[1]).toLowerCase() : "";
  }

  function isColorLike(value) {
    const text = String(value || "").trim();
    if (!text) {
      return false;
    }
    return /^#([0-9a-f]{3,8})$/i.test(text) || /^rgba?\(/i.test(text) || /^hsla?\(/i.test(text);
  }

  function metricValues(samples, metric) {
    return (samples || [])
      .map(function (sample) {
        return sample && sample.metrics ? sample.metrics[metric] : null;
      })
      .filter(function (value) {
        return Number.isFinite(value);
      });
  }

  function siblingSamples(context, sample) {
    if (!context || !sample || !sample.element || !sample.element.parentElement) {
      return [];
    }
    const siblingGroup = context.samplesByParent.get(sample.element.parentElement);
    return Array.isArray(siblingGroup) ? siblingGroup : [];
  }

  function rowSamples(context, sample) {
    if (!context || !sample || !Number.isFinite(sample._rowBucket)) {
      return [];
    }
    const output = [];
    for (let delta = -1; delta <= 1; delta += 1) {
      const bucket = sample._rowBucket + delta;
      const row = context.samplesByRow.get(bucket);
      if (!Array.isArray(row)) {
        continue;
      }
      for (let i = 0; i < row.length; i += 1) {
        if (row[i] !== sample) {
          output.push(row[i]);
        }
      }
    }
    return output;
  }

  function mergeNumericScale(primaryScale, secondaryScale) {
    const set = new Set();
    (Array.isArray(primaryScale) ? primaryScale : []).forEach(function (value) {
      if (Number.isFinite(Number.parseFloat(value))) {
        set.add(Number.parseFloat(value));
      }
    });
    (Array.isArray(secondaryScale) ? secondaryScale : []).forEach(function (value) {
      if (Number.isFinite(Number.parseFloat(value))) {
        set.add(Number.parseFloat(value));
      }
    });
    return Array.from(set).sort(function (a, b) {
      return a - b;
    });
  }

  function frameworkScaleForProperty(property, scale, context) {
    const primaryId =
      context && context.frameworkReport && context.frameworkReport.primary
        ? context.frameworkReport.primary.id
        : "";
    if (!primaryId) {
      return scale;
    }

    if (/padding|margin/.test(property)) {
      if (primaryId === "mui") {
        return mergeNumericScale(scale, [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72]);
      }
      if (primaryId === "tailwind") {
        return mergeNumericScale(scale, [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96]);
      }
      if (primaryId === "bootstrap") {
        return mergeNumericScale(scale, [0, 4, 8, 12, 16, 24, 32, 48]);
      }
      if (primaryId === "chakra") {
        return mergeNumericScale(scale, [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64]);
      }
    }

    if (property === "font-size") {
      if (primaryId === "mui") {
        return mergeNumericScale(scale, [12, 13, 14, 15, 16, 18, 20, 24, 30, 34, 48, 60]);
      }
      if (primaryId === "tailwind") {
        return mergeNumericScale(scale, [10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60]);
      }
    }

    return scale;
  }

  function nearestScaleForProperty(property, value, config, context) {
    if (!Number.isFinite(value)) {
      return null;
    }

    const tokens = config && config.designTokens ? config.designTokens : {};
    let scale = null;
    if (/padding|margin/.test(property)) {
      scale = tokens.spacingScale;
    } else if (property === "border-radius") {
      scale = tokens.radiusScale;
    } else if (property === "font-size") {
      scale = tokens.fontScale;
    }

    scale = frameworkScaleForProperty(property, scale, context);
    if (!Array.isArray(scale) || !scale.length) {
      return null;
    }
    return utils.nearestValue(value, scale);
  }

  function percentileValue(values, ratio) {
    if (!Array.isArray(values) || !values.length) {
      return null;
    }
    const sorted = values
      .slice()
      .filter(function (value) {
        return Number.isFinite(value);
      })
      .sort(function (a, b) {
        return a - b;
      });
    if (!sorted.length) {
      return null;
    }
    const index = utils.clamp(ratio, 0, 1) * (sorted.length - 1);
    const low = Math.floor(index);
    const high = Math.ceil(index);
    if (low === high) {
      return sorted[low];
    }
    const t = index - low;
    return sorted[low] + (sorted[high] - sorted[low]) * t;
  }

  function contextualNumericTarget(property, finding, sample, context, config) {
    const metric = PROPERTY_TO_METRIC[property];
    if (!metric) {
      return null;
    }

    const expectedPx = parsePixelValue(finding.expected);
    const expectedNum = expectedPx ? Number.parseFloat(expectedPx) : null;
    const groupValues = metricValues(
      context && context.samplesByGroup.get(sample.groupKey),
      metric
    );
    const siblingValues = metricValues(siblingSamples(context, sample), metric);
    const rowValues = metricValues(rowSamples(context, sample), metric);

    const siblingMedian = utils.median(siblingValues);
    const rowMedian = utils.median(rowValues);
    const groupMedian = utils.median(groupValues);
    let target = Number.isFinite(expectedNum) ? expectedNum : null;
    const peerValues = siblingValues.concat(rowValues).concat(groupValues);

    const weighted = [];
    if (Number.isFinite(siblingMedian)) {
      weighted.push({
        value: siblingMedian,
        weight: 0.46
      });
    }
    if (Number.isFinite(rowMedian)) {
      weighted.push({
        value: rowMedian,
        weight: 0.29
      });
    }
    if (Number.isFinite(groupMedian)) {
      weighted.push({
        value: groupMedian,
        weight: 0.2
      });
    }
    if (Number.isFinite(expectedNum)) {
      weighted.push({
        value: expectedNum,
        weight: 0.05
      });
    }

    if (weighted.length) {
      const sum = weighted.reduce(function (acc, entry) {
        return acc + entry.value * entry.weight;
      }, 0);
      const totalWeight = weighted.reduce(function (acc, entry) {
        return acc + entry.weight;
      }, 0);
      target = totalWeight > 0 ? sum / totalWeight : target;
    }

    if (!Number.isFinite(target)) {
      return null;
    }

    if (peerValues.length >= 4) {
      const q1 = percentileValue(peerValues, 0.25);
      const q3 = percentileValue(peerValues, 0.75);
      if (Number.isFinite(q1) && Number.isFinite(q3)) {
        const iqr = Math.max(0.4, q3 - q1);
        const lowBound = Math.max(0, q1 - iqr * 0.35);
        const highBound = q3 + iqr * 0.35;
        target = utils.clamp(target, lowBound, highBound);
      }
    }

    const snapped = nearestScaleForProperty(property, target, config, context);
    if (snapped && snapped.delta <= Math.max(1.4, config.thresholds.tokenOffscalePx * 1.5)) {
      target = snapped.value;
    }

    return formatCssNumber(target) + "px";
  }

  function contextualColorTarget(property, finding, sample, context) {
    if (!sample || !context) {
      const expectedColor = String(finding.expected || "").trim();
      return isColorLike(expectedColor) ? expectedColor : null;
    }

    const metric = property === "background-color" ? "backgroundColor" : "color";
    const siblingVals = siblingSamples(context, sample)
      .map(function (peer) {
        return peer.metrics[metric];
      })
      .filter(function (value) {
        return isColorLike(value);
      });
    if (siblingVals.length >= 2) {
      return utils.mode(siblingVals);
    }

    const groupVals = (context.samplesByGroup.get(sample.groupKey) || [])
      .map(function (peer) {
        return peer.metrics[metric];
      })
      .filter(function (value) {
        return isColorLike(value);
      });
    if (groupVals.length >= 2) {
      return utils.mode(groupVals);
    }

    const expectedColor = String(finding.expected || "").trim();
    return isColorLike(expectedColor) ? expectedColor : null;
  }

  function contextualFontFamilyTarget(sample, finding, context) {
    if (!sample || !context) {
      const expectedFont = String(finding.expected || "").trim();
      return expectedFont || null;
    }

    const siblingVals = siblingSamples(context, sample)
      .map(function (peer) {
        return peer.metrics.fontFamily;
      })
      .filter(Boolean);
    if (siblingVals.length >= 2) {
      return utils.mode(siblingVals);
    }

    const groupVals = (context.samplesByGroup.get(sample.groupKey) || [])
      .map(function (peer) {
        return peer.metrics.fontFamily;
      })
      .filter(Boolean);
    if (groupVals.length >= 2) {
      return utils.mode(groupVals);
    }

    const expectedFont = String(finding.expected || "").trim();
    return expectedFont || null;
  }

  function frameworkDetected(context, id) {
    if (!context || !context.frameworkReport || !Array.isArray(context.frameworkReport.detected)) {
      return false;
    }
    return context.frameworkReport.detected.some(function (entry) {
      return entry.id === id && Number.parseFloat(entry.confidence) >= 0.15;
    });
  }

  function frameworkEntry(context, id) {
    if (!context || !context.frameworkReport || !Array.isArray(context.frameworkReport.detected)) {
      return null;
    }
    return (
      context.frameworkReport.detected.find(function (entry) {
        return entry.id === id;
      }) || null
    );
  }

  function stableMuiSelectorsForElement(element) {
    if (!element || !element.classList) {
      return [];
    }

    const classTokens = Array.from(element.classList);
    const stableMuiClasses = classTokens.filter(function (token) {
      return /^Mui[A-Z][A-Za-z0-9-]+$/.test(token);
    });
    if (!stableMuiClasses.length) {
      return [];
    }

    const selectors = [];
    const rootClass = stableMuiClasses.find(function (token) {
      return /-root$/.test(token);
    });
    if (rootClass) {
      selectors.push("." + rootClass);
    }

    if (stableMuiClasses.length >= 2) {
      selectors.push("." + stableMuiClasses[0] + "." + stableMuiClasses[1]);
    } else {
      selectors.push("." + stableMuiClasses[0]);
    }

    const todoAncestor = element.closest("[data-todo-item-type]");
    if (todoAncestor) {
      const type = todoAncestor.getAttribute("data-todo-item-type");
      if (type && rootClass) {
        selectors.push("[data-todo-item-type='" + type + "'] ." + rootClass);
      }
    }

    return selectors;
  }

  function stablePrefixSelectorsForElement(element, prefix) {
    if (!element || !element.classList || !prefix) {
      return [];
    }
    const tokens = Array.from(element.classList).filter(function (token) {
      return token.startsWith(prefix);
    });
    return tokens.slice(0, 2).map(function (token) {
      return "." + token;
    });
  }

  function stableSemanticSelector(element) {
    if (!element || element.nodeType !== 1) {
      return "";
    }
    if (element.id) {
      return "#" + element.id;
    }
    if (element.hasAttribute("data-testid")) {
      return "[data-testid='" + element.getAttribute("data-testid") + "']";
    }
    if (element.hasAttribute("data-test")) {
      return "[data-test='" + element.getAttribute("data-test") + "']";
    }
    if (element.hasAttribute("data-qa")) {
      return "[data-qa='" + element.getAttribute("data-qa") + "']";
    }
    if (element.hasAttribute("name")) {
      return element.tagName.toLowerCase() + "[name='" + element.getAttribute("name") + "']";
    }
    const role = element.getAttribute("role");
    if (role) {
      return element.tagName.toLowerCase() + "[role='" + role + "']";
    }
    return "";
  }

  function frameworkSelectorCandidates(sample, fallbackSelector, context) {
    const fallback = String(fallbackSelector || "").trim();
    const output = [];
    const seen = new Set();
    const pushCandidate = function (candidate, stability, strategy) {
      const normalized = String(candidate || "").trim();
      if (!normalized || seen.has(normalized) || normalized.length > 320) {
        return;
      }
      seen.add(normalized);
      output.push({
        selector: normalized,
        stability: stability,
        strategy: strategy || "scoped-css"
      });
    };

    const element = sample && sample.element ? sample.element : null;
    const semantic = stableSemanticSelector(element);
    if (semantic) {
      pushCandidate(semantic, 0.95, "semantic-hook");
    }

    if (frameworkDetected(context, "mui")) {
      stableMuiSelectorsForElement(element).forEach(function (selector) {
        pushCandidate(selector, 0.92, "mui-slot-class");
      });
    }

    if (frameworkDetected(context, "antd")) {
      stablePrefixSelectorsForElement(element, "ant-").forEach(function (selector) {
        pushCandidate(selector, 0.86, "antd-class");
      });
    }

    if (frameworkDetected(context, "chakra")) {
      stablePrefixSelectorsForElement(element, "chakra-").forEach(function (selector) {
        pushCandidate(selector, 0.86, "chakra-class");
      });
    }

    if (frameworkDetected(context, "mantine")) {
      stablePrefixSelectorsForElement(element, "mantine-").forEach(function (selector) {
        pushCandidate(selector, 0.84, "mantine-class");
      });
    }

    if (frameworkDetected(context, "bootstrap")) {
      const bootstrapTokens = Array.from((element && element.classList) || []).filter(function (token) {
        return /^(btn|card|container|row|col-|nav|navbar|form-control)/.test(token);
      });
      bootstrapTokens.slice(0, 2).forEach(function (token) {
        pushCandidate("." + token, 0.83, "bootstrap-class");
      });
    }

    if (frameworkDetected(context, "tailwind")) {
      if (semantic) {
        pushCandidate(semantic, 0.9, "tailwind-semantic-hook");
      }
      const tag = sample && sample.tag ? sample.tag : "";
      if (tag && sample && sample.role) {
        pushCandidate(tag + "[role='" + sample.role + "']", 0.76, "tailwind-semantic");
      }
    }

    if (fallback) {
      const unstable = /\.css-[a-z0-9]+/i.test(fallback) || /\.sc-[a-z0-9]+/i.test(fallback);
      pushCandidate(fallback, unstable ? 0.42 : 0.72, unstable ? "generated-class" : "scoped-css");
    }

    return output.slice(0, 4);
  }

  function strategyFromFramework(context, selectorInfo, property) {
    const primary = context && context.frameworkReport ? context.frameworkReport.primary : null;
    const primaryId = primary ? primary.id : "";

    if (selectorInfo && selectorInfo.strategy === "mui-slot-class") {
      return {
        channel: "theme-styleOverrides",
        rationale:
          "Use MUI slot classes/theme overrides to avoid unstable generated class names.",
        framework: "mui"
      };
    }

    if (primaryId === "tailwind") {
      return {
        channel: "utility-class",
        rationale:
          "Prefer className utility changes over ad-hoc stylesheet patches in Tailwind systems.",
        framework: "tailwind"
      };
    }

    if (primaryId === "bootstrap" && /color|background|border|padding|margin/.test(property)) {
      return {
        channel: "css-variable",
        rationale:
          "Bootstrap components are typically safer to adjust via variables/utilities first.",
        framework: "bootstrap"
      };
    }

    if (primaryId === "chakra") {
      return {
        channel: "theme-extension",
        rationale:
          "Chakra fixes should ideally be implemented with theme extension or style props.",
        framework: "chakra"
      };
    }

    if (primaryId === "antd") {
      return {
        channel: "theme-token",
        rationale:
          "Ant Design recommends token-driven changes where possible.",
        framework: "antd"
      };
    }

    return {
      channel: selectorInfo && selectorInfo.strategy ? selectorInfo.strategy : "scoped-css",
      rationale: "Apply fix with a stable scoped selector and validate against neighboring components.",
      framework: primaryId || "generic"
    };
  }

  function resolveFixProperty(finding) {
    const ruleId = String(finding.ruleId || "");
    if (FIXABLE_RULE_PROPERTY_MAP[ruleId]) {
      return FIXABLE_RULE_PROPERTY_MAP[ruleId];
    }

    if (
      ruleId === "token-spacing-scale" ||
      ruleId === "token-radius-scale" ||
      ruleId === "token-font-scale"
    ) {
      return parseTokenPropertyFromMessage(finding.message);
    }

    return "";
  }

  function resolveFixValue(property, finding, sample, context, config) {
    if (!property) {
      return null;
    }

    if (property === "cursor") {
      return "pointer";
    }

    if (property === "z-index") {
      const zBound = parseUpperBoundNumber(finding.expected);
      return Number.isFinite(zBound) ? formatCssNumber(zBound) : null;
    }

    if (property === "font-family") {
      return contextualFontFamilyTarget(sample, finding, context);
    }

    if (property === "color" || property === "background-color") {
      return contextualColorTarget(property, finding, sample, context);
    }

    if (PIXEL_PROPERTY_SET.has(property)) {
      if (sample && context && config) {
        return contextualNumericTarget(property, finding, sample, context, config);
      }
      return parsePixelValue(finding.expected);
    }

    const fallback = String(finding.expected || "").trim();
    return fallback || null;
  }

  function isSelectorFixable(selector) {
    const text = String(selector || "").trim();
    if (!text || text === "document") {
      return false;
    }
    if (text.length > 320 || text.includes("\n")) {
      return false;
    }
    return true;
  }

  function createFixCandidate(selector, property, value, finding, extra) {
    if (!isSelectorFixable(selector) || !property || !value) {
      return null;
    }

    const metadata = extra || {};
    const confidence = Number.parseFloat(metadata.confidence);
    const stability = Number.parseFloat(metadata.stability);

    return {
      selector: selector,
      property: property,
      value: value,
      ruleId: finding.ruleId,
      severity: finding.severity,
      delta: Number.parseFloat(finding.delta) || 0,
      findingId: finding.id,
      message: finding.message || "",
      confidence: Number.isFinite(confidence)
        ? utils.clamp(confidence, 0, 1)
        : 0.55,
      stability: Number.isFinite(stability)
        ? utils.clamp(stability, 0, 1)
        : 0.62,
      framework: String(metadata.framework || "generic"),
      channel: String(metadata.channel || "scoped-css"),
      rationale: String(metadata.rationale || "")
    };
  }

  function buildFixContextModel(samples, grouped, frameworkReport, config) {
    const rowBucketPx =
      config &&
      config.fixes &&
      Number.isFinite(Number.parseFloat(config.fixes.rowBucketPx))
        ? Number.parseFloat(config.fixes.rowBucketPx)
        : 14;

    const model = {
      samplesById: new Map(),
      samplesByGroup: new Map(),
      samplesByParent: new Map(),
      samplesByRow: new Map(),
      frameworkReport: frameworkReport || {
        primary: null,
        detected: [],
        caveats: [],
        stats: {}
      }
    };

    samples.forEach(function (sample) {
      model.samplesById.set(sample.id, sample);
      const parent = sample.element ? sample.element.parentElement : null;
      if (parent) {
        if (!model.samplesByParent.has(parent)) {
          model.samplesByParent.set(parent, []);
        }
        model.samplesByParent.get(parent).push(sample);
      }

      const bucket = Math.round((sample.rect.top || 0) / Math.max(8, rowBucketPx));
      sample._rowBucket = bucket;
      if (!model.samplesByRow.has(bucket)) {
        model.samplesByRow.set(bucket, []);
      }
      model.samplesByRow.get(bucket).push(sample);
    });

    if (grouped && typeof grouped.forEach === "function") {
      grouped.forEach(function (groupSamples, key) {
        model.samplesByGroup.set(key, groupSamples);
      });
    }

    return model;
  }

  function sampleForFinding(finding, context) {
    if (!finding || !context || !context.samplesById) {
      return null;
    }
    if (finding.sampleId && context.samplesById.has(finding.sampleId)) {
      return context.samplesById.get(finding.sampleId);
    }

    if (finding.selector) {
      const match = Array.from(context.samplesById.values()).find(function (sample) {
        return sample.selector === finding.selector;
      });
      if (match) {
        return match;
      }
    }
    return null;
  }

  function buildSuggestedFixCandidates(finding, context) {
    const primaryFramework =
      context && context.frameworkReport && context.frameworkReport.primary
        ? String(context.frameworkReport.primary.id || "generic")
        : "generic";
    const hints =
      finding &&
      finding.metadata &&
      Array.isArray(finding.metadata.suggestedFixes)
        ? finding.metadata.suggestedFixes
        : [];
    return hints
      .map(function (hint) {
        return createFixCandidate(
          hint.selector,
          hint.property,
          hint.value,
          finding,
          {
            confidence: hint.confidence === "context-high" ? 0.9 : hint.confidence === "context-medium" ? 0.78 : 0.66,
            stability: 0.82,
            framework: primaryFramework,
            channel: "contextual-heuristic",
            rationale: "Derived from local card/component context model."
          }
        );
      })
      .filter(Boolean);
  }

  function buildFixCandidatesForFinding(finding, context, config) {
    const candidates = [];
    const selector = String(finding.selector || "").trim();
    const ruleId = String(finding.ruleId || "");
    const sample = sampleForFinding(finding, context);
    const selectorInfos = frameworkSelectorCandidates(sample, selector, context);
    const severityConfidence =
      finding.severity === "critical"
        ? 0.9
        : finding.severity === "high"
          ? 0.84
          : finding.severity === "medium"
            ? 0.74
            : 0.62;

    const emitBySelectors = function (property, value, channelHint, rationaleHint) {
      selectorInfos.forEach(function (selectorInfo) {
        const strategy = strategyFromFramework(context, selectorInfo, property);
        const candidate = createFixCandidate(
          selectorInfo.selector,
          property,
          value,
          finding,
          {
            confidence: severityConfidence,
            stability: selectorInfo.stability,
            framework: strategy.framework || "generic",
            channel: channelHint || strategy.channel,
            rationale: rationaleHint || strategy.rationale
          }
        );
        if (candidate) {
          candidates.push(candidate);
        }
      });
    };

    buildSuggestedFixCandidates(finding, context).forEach(function (candidate) {
      candidates.push(candidate);
    });

    if (ruleId === "a11y-touch-target-size") {
      const target = parseTouchTarget(finding.expected);
      if (!target || !selectorInfos.length) {
        return candidates;
      }

      emitBySelectors(
        "min-width",
        target.width,
        "accessibility-target-size",
        "Set minimum target width for interactive accessibility compliance."
      );
      emitBySelectors(
        "min-height",
        target.height,
        "accessibility-target-size",
        "Set minimum target height for interactive accessibility compliance."
      );
      return candidates;
    }

    if (ruleId === "content-text-overflow-clip") {
      if (!selectorInfos.length) {
        return candidates;
      }

      [
        ["overflow", "hidden"],
        ["text-overflow", "ellipsis"],
        ["white-space", "nowrap"]
      ].forEach(function (entry) {
        emitBySelectors(
          entry[0],
          entry[1],
          "content-truncation",
          "Use explicit truncation semantics to avoid accidental text clipping."
        );
      });
      return candidates;
    }

    if (ruleId === "content-text-vertical-clip") {
      emitBySelectors(
        "overflow-y",
        "visible",
        "content-overflow",
        "Allow vertical overflow or adjust layout constraints to avoid hidden text."
      );
      return candidates;
    }

    const property = resolveFixProperty(finding);
    const value = resolveFixValue(property, finding, sample, context, config);
    if (property && value) {
      emitBySelectors(property, value);
    }
    return candidates;
  }

  function buildGlobalFixCandidates(findings) {
    const output = [];

    const focusFinding = findings.find(function (finding) {
      return finding.ruleId === "interaction-focus-style-coverage";
    });
    if (focusFinding) {
      const selector =
        ":where(button, a[href], input:not([type='hidden']), select, textarea, summary, [role='button'], [role='tab'], [role='menuitem'], [tabindex]):focus-visible";
      const outlineCandidate = createFixCandidate(
        selector,
        "outline",
        "2px solid #1d8ea9",
        focusFinding,
        {
          confidence: 0.88,
          stability: 0.98,
          framework: "generic",
          channel: "focus-visible-style",
          rationale: "Global keyboard focus visibility coverage fallback."
        }
      );
      const offsetCandidate = createFixCandidate(
        selector,
        "outline-offset",
        "2px",
        focusFinding,
        {
          confidence: 0.86,
          stability: 0.98,
          framework: "generic",
          channel: "focus-visible-style",
          rationale: "Global keyboard focus visibility coverage fallback."
        }
      );
      if (outlineCandidate) {
        output.push(outlineCandidate);
      }
      if (offsetCandidate) {
        output.push(offsetCandidate);
      }
    }

    return output;
  }

  function collectFixCandidates(findings, context, config) {
    const output = [];

    findings.forEach(function (finding) {
      buildFixCandidatesForFinding(finding, context, config).forEach(function (candidate) {
        output.push(candidate);
      });
    });

    buildGlobalFixCandidates(findings).forEach(function (candidate) {
      output.push(candidate);
    });

    return output;
  }

  function mergeFixCandidates(candidates, maxRules) {
    const bySelector = new Map();

    candidates.forEach(function (candidate) {
      if (!candidate || !candidate.selector || !candidate.property || !candidate.value) {
        return;
      }

      const selector = candidate.selector;
      if (!bySelector.has(selector)) {
        bySelector.set(selector, {
          declarations: new Map(),
          maxScore: 0
        });
      }

      const selectorEntry = bySelector.get(selector);
      const score =
        severityWeight(candidate.severity) * 1000 +
        candidate.delta +
        (Number.isFinite(candidate.confidence) ? candidate.confidence : 0.5) * 120 +
        (Number.isFinite(candidate.stability) ? candidate.stability : 0.6) * 80;
      if (score > selectorEntry.maxScore) {
        selectorEntry.maxScore = score;
      }

      const declarationKey = candidate.property;
      const current = selectorEntry.declarations.get(declarationKey);
      if (current && current.score >= score) {
        return;
      }

      selectorEntry.declarations.set(declarationKey, {
        property: candidate.property,
        value: candidate.value,
        ruleId: candidate.ruleId,
        severity: candidate.severity,
        delta: candidate.delta,
        findingId: candidate.findingId,
        message: candidate.message,
        confidence: candidate.confidence,
        stability: candidate.stability,
        framework: candidate.framework,
        channel: candidate.channel,
        rationale: candidate.rationale,
        score: score
      });
    });

    const rules = Array.from(bySelector.entries())
      .map(function (entry) {
        const selector = entry[0];
        const bucket = entry[1];
        const declarations = Array.from(bucket.declarations.values()).sort(function (a, b) {
          return a.property.localeCompare(b.property);
        });
        if (!declarations.length) {
          return null;
        }

        const findingIds = new Set();
        declarations.forEach(function (declaration) {
          if (declaration.findingId) {
            findingIds.add(declaration.findingId);
          }
        });

        return {
          selector: selector,
          declarations: declarations.map(function (declaration) {
            return {
              property: declaration.property,
              value: declaration.value,
              sourceRuleId: declaration.ruleId,
              severity: declaration.severity,
              message: declaration.message,
              confidence: Number.isFinite(declaration.confidence)
                ? utils.toFixed(declaration.confidence, 2)
                : 0.55,
              stability: Number.isFinite(declaration.stability)
                ? utils.toFixed(declaration.stability, 2)
                : 0.62,
              framework: declaration.framework || "generic",
              channel: declaration.channel || "scoped-css",
              rationale: declaration.rationale || ""
            };
          }),
          issueCount: findingIds.size,
          maxScore: bucket.maxScore,
          channels: Array.from(
            new Set(
              declarations.map(function (declaration) {
                return declaration.channel || "scoped-css";
              })
            )
          ),
          frameworks: Array.from(
            new Set(
              declarations
                .map(function (declaration) {
                  return declaration.framework || "generic";
                })
                .filter(Boolean)
            )
          ),
          maxSeverity: declarations
            .slice()
            .sort(function (a, b) {
              return severityWeight(b.severity) - severityWeight(a.severity);
            })[0].severity
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (b.maxScore !== a.maxScore) {
          return b.maxScore - a.maxScore;
        }
        return a.selector.localeCompare(b.selector);
      });

    return rules.slice(0, maxRules);
  }

  function buildFixCssText(rules, useImportant, includeComments) {
    if (!rules.length) {
      return "";
    }

    const importantSuffix = useImportant ? " !important" : "";
    const lines = [];
    if (includeComments) {
      lines.push(
        "/* Generated by UI Consistency Investigator. Validate before merging into source control. */"
      );
      lines.push("");
    }

    rules.forEach(function (rule, index) {
      if (includeComments) {
        lines.push(
          "/* Fix " +
            (index + 1) +
            " | severity " +
            rule.maxSeverity +
            " | related findings " +
            rule.issueCount +
            " */"
        );
      }
      lines.push(rule.selector + " {");
      rule.declarations.forEach(function (declaration) {
        lines.push(
          "  " +
            declaration.property +
            ": " +
            declaration.value +
            importantSuffix +
            ";"
        );
      });
      lines.push("}");
      lines.push("");
    });

    return lines.join("\n").trim();
  }

  function averageDeclarationMetric(declarations, key, fallback) {
    const values = (declarations || [])
      .map(function (declaration) {
        return Number.parseFloat(declaration[key]);
      })
      .filter(function (value) {
        return Number.isFinite(value);
      });
    const avg = utils.average(values);
    return Number.isFinite(avg) ? avg : fallback;
  }

  function riskFromSignals(severity, confidence, stability) {
    const sev = severityWeight(severity || "medium") / 4;
    const c = Number.isFinite(confidence) ? utils.clamp(confidence, 0, 1) : 0.55;
    const s = Number.isFinite(stability) ? utils.clamp(stability, 0, 1) : 0.62;
    const riskScore = (1 - c) * 0.5 + (1 - s) * 0.36 + sev * 0.14;
    const normalized = utils.toFixed(utils.clamp(riskScore, 0, 1), 2);
    if (normalized >= 0.62) {
      return { level: "high", score: normalized };
    }
    if (normalized >= 0.38) {
      return { level: "medium", score: normalized };
    }
    return { level: "low", score: normalized };
  }

  function guidanceForChannel(channel, frameworkId, selector) {
    const framework = FRAMEWORK_LIBRARY_MAP[frameworkId] || null;
    const frameworkName = framework ? framework.name : "Generic CSS";
    const target = selector || "(selector)";

    if (channel === "theme-styleOverrides") {
      return (
        "Use " +
        frameworkName +
        " theme component styleOverrides for " +
        target +
        " before applying ad-hoc CSS."
      );
    }
    if (channel === "utility-class") {
      return (
        "Adjust utility classes on the source component for " +
        target +
        " instead of adding detached stylesheet overrides."
      );
    }
    if (channel === "css-variable") {
      return (
        "Prefer CSS variable/token updates that affect " +
        target +
        " consistently across the framework."
      );
    }
    if (channel === "theme-extension" || channel === "theme-token") {
      return (
        "Implement via theme tokens/extensions to keep " +
        target +
        " aligned with component defaults."
      );
    }
    if (channel === "contextual-heuristic") {
      return (
        "Context-derived value based on sibling and row baselines around " +
        target +
        "; validate visually before merging."
      );
    }
    if (channel === "accessibility-target-size") {
      return (
        "Keep target-size changes for " +
        target +
        " behind interactive controls only to avoid layout side effects."
      );
    }
    if (channel === "focus-visible-style") {
      return "Global keyboard focus fallback. Keep brand contrast and visible ring thickness.";
    }
    return (
      "Apply as scoped CSS for " +
      target +
      " and verify against adjacent components at multiple viewport sizes."
    );
  }

  function collectFrameworkChannels(rules) {
    const counts = new Map();
    (rules || []).forEach(function (rule) {
      (rule.channels || []).forEach(function (channel) {
        const key = String(channel || "scoped-css");
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(function (entry) {
        return {
          channel: entry[0],
          usage: entry[1]
        };
      })
      .sort(function (a, b) {
        return b.usage - a.usage;
      })
      .slice(0, 10);
  }

  function buildFixRecommendations(rules, frameworkReport) {
    const frameworkId =
      frameworkReport && frameworkReport.primary && frameworkReport.primary.id
        ? frameworkReport.primary.id
        : "generic";

    const recs = (rules || [])
      .map(function (rule, index) {
        if (!rule || !Array.isArray(rule.declarations) || !rule.declarations.length) {
          return null;
        }

        const confidence = averageDeclarationMetric(rule.declarations, "confidence", 0.55);
        const stability = averageDeclarationMetric(rule.declarations, "stability", 0.62);
        const risk = riskFromSignals(rule.maxSeverity, confidence, stability);
        const declarations = rule.declarations
          .slice()
          .sort(function (a, b) {
            const sevDiff = severityWeight(b.severity) - severityWeight(a.severity);
            if (sevDiff !== 0) {
              return sevDiff;
            }
            return String(a.property || "").localeCompare(String(b.property || ""));
          });
        const preferred = declarations[0];
        const preferredChannel = String(
          (preferred && preferred.channel) ||
            (Array.isArray(rule.channels) && rule.channels.length ? rule.channels[0] : "scoped-css")
        );
        const preferredFramework =
          (preferred && preferred.framework) ||
          (Array.isArray(rule.frameworks) && rule.frameworks.length ? rule.frameworks[0] : frameworkId);
        const priority =
          severityWeight(rule.maxSeverity) * 100 +
          Math.min(60, Number.parseFloat(rule.issueCount) || 0) +
          confidence * 25 +
          stability * 15;

        return {
          id: "rec-" + String(index + 1).padStart(3, "0"),
          selector: rule.selector,
          severity: rule.maxSeverity,
          priority: utils.toFixed(priority, 2),
          issueCount: rule.issueCount,
          confidence: utils.toFixed(confidence, 2),
          stability: utils.toFixed(stability, 2),
          risk: risk.level,
          riskScore: risk.score,
          channels: Array.isArray(rule.channels) ? rule.channels.slice(0, 6) : [preferredChannel],
          framework: preferredFramework || "generic",
          declarations: declarations.slice(0, 8).map(function (declaration) {
            return {
              property: declaration.property,
              value: declaration.value,
              sourceRuleId: declaration.sourceRuleId,
              severity: declaration.severity,
              confidence: declaration.confidence,
              stability: declaration.stability,
              channel: declaration.channel,
              framework: declaration.framework || "generic",
              rationale: declaration.rationale || ""
            };
          }),
          guidance: guidanceForChannel(preferredChannel, preferredFramework, rule.selector),
          caveat:
            FRAMEWORK_LIBRARY_MAP[preferredFramework] &&
            FRAMEWORK_LIBRARY_MAP[preferredFramework].caveat
              ? FRAMEWORK_LIBRARY_MAP[preferredFramework].caveat
              : ""
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.selector.localeCompare(b.selector);
      });

    return {
      generatedAt: utils.nowIso(),
      total: recs.length,
      top: recs.slice(0, 40),
      channelDistribution: collectFrameworkChannels(rules)
    };
  }

  function buildFixPackage(findings, config, contextModel) {
    const defaults = root.DEFAULT_CONFIG && root.DEFAULT_CONFIG.fixes
      ? root.DEFAULT_CONFIG.fixes
      : {
          generateFixes: true,
          maxRules: 140,
          useImportant: true,
          includeComments: true
        };
    const fixConfig = utils.deepMerge(defaults, config.fixes || {});

    if (!fixConfig.generateFixes) {
      const frameworkReport =
        contextModel && contextModel.frameworkReport
          ? contextModel.frameworkReport
          : { primary: null, detected: [], caveats: [], stats: {} };
      return {
        generatedAt: utils.nowIso(),
        rules: [],
        cssText: "",
        disabled: true,
        frameworkProfile: frameworkReport,
        recommendations: buildFixRecommendations([], frameworkReport)
      };
    }

    const maxRules = Number.parseFloat(fixConfig.maxRules);
    const limit = Number.isFinite(maxRules) && maxRules > 0 ? Math.round(maxRules) : 140;
    const frameworkReport =
      contextModel && contextModel.frameworkReport
        ? contextModel.frameworkReport
        : { primary: null, detected: [], caveats: [], stats: {} };
    const candidates = collectFixCandidates(findings, contextModel, config);
    const rules = mergeFixCandidates(candidates, limit);
    const cssText = buildFixCssText(
      rules,
      fixConfig.useImportant !== false,
      fixConfig.includeComments !== false
    );
    const recommendations = buildFixRecommendations(rules, frameworkReport);

    return {
      generatedAt: utils.nowIso(),
      rules: rules,
      cssText: cssText,
      frameworkProfile: frameworkReport,
      recommendations: recommendations
    };
  }

  function runScan(config, onProgress) {
    const startedAt = performance.now();
    const reportProgress = function (value, stage, detail) {
      if (typeof onProgress !== "function") {
        return;
      }
      const bounded = Math.max(0, Math.min(100, Number.parseFloat(value) || 0));
      onProgress({
        value: bounded,
        stage: stage || "",
        detail: detail || "",
        at: utils.nowIso()
      });
    };

    reportProgress(4, "prepare", "Preparing scan context");
    const elements = collectCandidates(config);
    reportProgress(18, "collect", "Collecting computed styles");

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

    reportProgress(28, "group", "Building element groups");
    const analyzableGroups = Array.from(grouped.values()).filter(function (group) {
      return group.length >= config.scanning.minGroupSize;
    });

    reportProgress(34, "framework", "Fingerprinting CSS frameworks and caveats");
    const frameworkReport = detectFrameworks(samples);

    reportProgress(38, "css-index", "Indexing stylesheet sources");
    const cssSourceIndex = config.scanning.traceCSS ? buildStyleRuleIndex() : null;

    reportProgress(46, "rules", "Running rule families");
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

    if (config.rules.checkLayoutAdvanced || config.rules.checkTypographyAdvanced || config.rules.checkTypography) {
      pushCardLayoutAndTypographyFindings(samples, config, findings);
    }

    if (config.rules.checkAccessibility) {
      pushContrastFindings(samples, config, findings);
      pushTapTargetFindings(samples, config, findings);
      pushHeadingHierarchyFindings(samples, config, findings);
      pushFormLabelFindings(samples, findings);
      pushDuplicateIdFindings(samples, findings);
      pushInteractiveNameFindings(samples, findings);
      pushImageAltFindings(samples, findings);
      pushAriaHiddenFocusableFindings(samples, findings);
      pushPositiveTabindexFindings(samples, findings);
      pushInvalidAriaReferenceFindings(samples, findings);
      pushLandmarkCoverageFindings(samples, findings);
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

    reportProgress(74, "normalize", "Deduplicating and ranking findings");
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
    const fixContextModel = buildFixContextModel(
      samples,
      grouped,
      frameworkReport,
      config
    );

    reportProgress(90, "fixes", "Synthesizing contextual CSS fixes");
    const fixes = buildFixPackage(limitedFindings, config, fixContextModel);

    const elapsedMs = performance.now() - startedAt;
    reportProgress(100, "complete", "Scan complete");

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
        customRulesExecuted: customRulesMeta.executed,
        frameworkPrimary:
          frameworkReport && frameworkReport.primary
            ? frameworkReport.primary.name
            : "Unknown",
        frameworkPrimaryConfidence:
          frameworkReport && frameworkReport.primary
            ? frameworkReport.primary.confidence
            : 0,
        frameworksDetected: Array.isArray(frameworkReport && frameworkReport.detected)
          ? frameworkReport.detected.length
          : 0,
        frameworkCaveats: frameworkReport && frameworkReport.caveats
          ? frameworkReport.caveats
          : [],
        frameworkStats: frameworkReport && frameworkReport.stats
          ? frameworkReport.stats
          : {}
      },
      summary: summary,
      breakdown: {
        byCategory: categoryBreakdown(limitedFindings),
        byRule: ruleBreakdown(limitedFindings)
      },
      frameworks: frameworkReport,
      findings: limitedFindings,
      fixes: fixes
    };
  }

  root.scanner = {
    runScan: runScan
  };
})();
