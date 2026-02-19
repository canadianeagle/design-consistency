(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});
  const utils = root.utils;

  const overlayController = root.overlay.createOverlay();
  let lastResult = null;
  let activeConfig = utils.deepClone(root.DEFAULT_CONFIG);

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

  async function runScanWithConfig(configPatch) {
    const storedConfig = await getConfigFromStorage();
    const merged = utils.deepMerge(storedConfig, configPatch || {});
    activeConfig = merged;

    const scanResult = root.scanner.runScan(merged);
    const packaged = withMeta(scanResult, merged);
    lastResult = packaged;

    overlayController.setData(scanResult, merged.overlay);

    if (shouldOverlayBeVisible(merged.overlay)) {
      overlayController.show();
    } else {
      overlayController.hide();
    }

    return packaged;
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
          sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
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
  });
})();
