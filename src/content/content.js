(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const FIX_STYLE_ID = "ui-consistency-injected-fixes";

  const overlayController = root.overlay.createOverlay();
  let lastResult = null;
  let activeConfig = utils.deepClone(root.DEFAULT_CONFIG);
  let resizeRescanTimer = 0;
  let scanInFlight = false;
  let resizeListenerBound = false;
  let fixStyleElement = null;

  function shouldOverlayBeVisible(overlaySettings) {
    if (!overlaySettings) {
      return false;
    }
    return !!(
      overlaySettings.showHighlights ||
      overlaySettings.showPanel ||
      overlaySettings.showRulers ||
      overlaySettings.showLabels
    );
  }

  function ensureFixStyleElement() {
    if (fixStyleElement && fixStyleElement.isConnected) {
      return fixStyleElement;
    }

    const existing = document.getElementById(FIX_STYLE_ID);
    if (existing) {
      fixStyleElement = existing;
      return fixStyleElement;
    }

    const style = document.createElement("style");
    style.id = FIX_STYLE_ID;
    style.dataset.uiConsistencyOverlay = "true";
    document.documentElement.appendChild(style);
    fixStyleElement = style;
    return fixStyleElement;
  }

  function applyFixCss(cssText) {
    const normalized = String(cssText || "").trim();
    if (!normalized) {
      return false;
    }
    const styleNode = ensureFixStyleElement();
    styleNode.textContent = normalized;
    return true;
  }

  function clearFixCss() {
    const existing = document.getElementById(FIX_STYLE_ID);
    if (existing) {
      existing.remove();
    }
    fixStyleElement = null;
  }

  function getConfigFromStorage() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(root.CONFIG_KEYS.sync, function (data) {
        const stored = data && data[root.CONFIG_KEYS.sync] ? data[root.CONFIG_KEYS.sync] : {};
        resolve(utils.deepMerge(root.DEFAULT_CONFIG, stored));
      });
    });
  }

  function withMeta(result, config) {
    return {
      url: window.location.href,
      title: document.title || "",
      scannedAt: utils.nowIso(),
      configSnapshot: config,
      result: result
    };
  }

  function ensureResizeListener() {
    if (resizeListenerBound) {
      return;
    }

    const onResize = function () {
      if (!activeConfig.scanning || !activeConfig.scanning.autoRescanOnResize) {
        return;
      }
      if (!lastResult) {
        return;
      }

      const delay = Number.parseFloat(activeConfig.scanning.autoRescanDebounceMs);
      const debounceMs = Number.isFinite(delay) && delay >= 50 ? delay : 350;
      window.clearTimeout(resizeRescanTimer);
      resizeRescanTimer = window.setTimeout(function () {
        runScanUsingActiveConfig().catch(function () {
          return;
        });
      }, debounceMs);
    };

    window.addEventListener("resize", onResize);
    resizeListenerBound = true;
  }

  async function runScanUsingActiveConfig() {
    if (scanInFlight) {
      return lastResult;
    }

    scanInFlight = true;
    try {
      const scanResult = root.scanner.runScan(activeConfig);
      const packaged = withMeta(scanResult, activeConfig);
      lastResult = packaged;

      overlayController.setData(scanResult, activeConfig.overlay);
      if (shouldOverlayBeVisible(activeConfig.overlay)) {
        overlayController.show();
      } else {
        overlayController.hide();
      }

      return packaged;
    } finally {
      scanInFlight = false;
    }
  }

  async function runScanWithConfig(configPatch) {
    const storedConfig = await getConfigFromStorage();
    activeConfig = utils.deepMerge(storedConfig, configPatch || {});
    ensureResizeListener();
    return runScanUsingActiveConfig();
  }

  function applyOverlayPayload(payload) {
    const settings = utils.deepMerge(
      activeConfig.overlay,
      payload && payload.overlay ? payload.overlay : {}
    );
    activeConfig.overlay = settings;
    overlayController.setSettings(settings);

    if (payload && typeof payload.visible === "boolean") {
      if (payload.visible) {
        overlayController.show();
      } else {
        overlayController.hide();
      }
      return;
    }

    if (shouldOverlayBeVisible(settings)) {
      overlayController.show();
    } else {
      overlayController.hide();
    }
  }

  function resetViewState() {
    overlayController.hide();
    overlayController.setData(null, activeConfig.overlay || {});
    clearFixCss();
    window.clearTimeout(resizeRescanTimer);
    lastResult = null;
  }

  ensureResizeListener();

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || !message.type) {
      return;
    }

    if (message.type === "ui-consistency:run-scan") {
      runScanWithConfig(message.config)
        .then(function (packaged) {
          sendResponse({ ok: true, payload: packaged });
        })
        .catch(function (error) {
          sendResponse({
            ok: false,
            error: String(error && error.message ? error.message : error)
          });
        });
      return true;
    }

    if (message.type === "ui-consistency:get-last-result") {
      sendResponse({ ok: true, payload: lastResult });
      return;
    }

    if (message.type === "ui-consistency:overlay") {
      applyOverlayPayload(message.payload || {});
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "ui-consistency:show-result") {
      const payload = message.payload || {};
      if (payload.result) {
        lastResult = {
          url: window.location.href,
          title: document.title || "",
          scannedAt: payload.result.meta ? payload.result.meta.runAt : utils.nowIso(),
          configSnapshot: activeConfig,
          result: payload.result
        };
        overlayController.setData(payload.result, activeConfig.overlay);
      }
      overlayController.show();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "ui-consistency:apply-fixes") {
      const payload = message.payload || {};
      const applied = applyFixCss(payload.cssText || "");
      sendResponse({ ok: applied, payload: { applied: applied } });
      return;
    }

    if (message.type === "ui-consistency:clear-fixes") {
      clearFixCss();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "ui-consistency:reset-view") {
      resetViewState();
      sendResponse({ ok: true });
      return;
    }
  });
})();
