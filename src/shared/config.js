(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});

  const DEFAULT_CONFIG = {
    scanning: {
      includeSelectors:
        'button, a, input, select, textarea, label, [role="button"], [role="tab"], [role="menuitem"], [class], [data-component], [data-testid]',
      excludeSelectors:
        '[data-ui-consistency-ignore="true"], script, style, link, meta, noscript, svg defs, [hidden], [aria-hidden="true"]',
      minElementArea: 48,
      minGroupSize: 3,
      maxElements: 3000,
      overlapSampleLimit: 850,
      maxOverlapChecks: 18000,
      includeTextNodes: true,
      traceCSS: true
    },
    grouping: {
      useRole: true,
      useTag: true,
      useClassFingerprint: true,
      classFingerprintDepth: 2
    },
    rules: {
      checkPadding: true,
      checkMargin: true,
      checkTypography: true,
      checkColors: true,
      checkBorderRadius: true,
      checkBorderWidth: true,
      checkAlignment: true,
      checkWhitespaceRhythm: true,
      checkDimensionRatios: true,
      checkTypographyAdvanced: true,
      checkLayoutAdvanced: true,
      checkAccessibility: true,
      checkInteraction: true,
      checkContent: true,
      checkCssQuality: true,
      checkDesignTokens: true,
      checkCustomRules: true
    },
    thresholds: {
      paddingPx: 4,
      marginPx: 6,
      fontSizePx: 1,
      lineHeightPx: 2,
      letterSpacingPx: 0.5,
      borderRadiusPx: 2,
      borderWidthPx: 1,
      colorDistance: 24,
      alignmentPx: 8,
      whitespacePx: 10,
      dimensionRatioDelta: 0.18,
      rowHeightPx: 6,
      columnWidthPx: 10,
      overlapAreaPx: 120,
      contrastRatioNormal: 4.5,
      contrastRatioLarge: 3,
      touchTargetMinPx: 44,
      headingLevelJump: 1,
      tokenOffscalePx: 1.2,
      fontLineRatioMin: 1.15,
      fontLineRatioMax: 1.95,
      maxZIndex: 1200,
      maxUniqueColors: 34,
      maxUniqueFonts: 6,
      maxUniqueRadii: 9,
      inlineStyleCount: 20,
      importantUsageCount: 45,
      selectorComplexity: 4,
      styleEntropy: 0.42,
      minVarUsageRatio: 0.45
    },
    designTokens: {
      spacingScale: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 72, 80],
      radiusScale: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 999],
      fontScale: [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64]
    },
    customRules: {
      enabled: true,
      maxMatchedElements: 1400,
      json: "[]"
    },
    overlay: {
      showHighlights: true,
      showRulers: true,
      showLabels: true,
      showPanel: true,
      maxVisibleFindings: 250,
      severityFilter: "all"
    },
    reporting: {
      maxFindings: 500,
      includeHtmlSnippet: true,
      includeSourceHints: true,
      includeComputedSnapshot: false
    }
  };

  const CONFIG_KEYS = {
    sync: "uiConsistencyConfig",
    localState: "uiConsistencyLocalState"
  };

  root.DEFAULT_CONFIG = DEFAULT_CONFIG;
  root.CONFIG_KEYS = CONFIG_KEYS;
})();
