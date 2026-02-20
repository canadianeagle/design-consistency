const HISTORY_KEY = "uiConsistencyHistory";
const HISTORY_LIMIT = 180;

function getHistory() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(HISTORY_KEY, function (data) {
      resolve(Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : []);
    });
  });
}

function setHistory(history) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [HISTORY_KEY]: history }, function () {
      resolve();
    });
  });
}

function summarizeForHistory(payload) {
  const summary = payload && payload.result && payload.result.summary
    ? payload.result.summary
    : { total: 0, critical: 0, high: 0, medium: 0, consistencyScore: 100 };

  const meta = payload && payload.result && payload.result.meta
    ? payload.result.meta
    : {};

  const rawFindings = payload.result && payload.result.findings
    ? payload.result.findings
    : [];

  const rawFixes = payload.result && payload.result.fixes ? payload.result.fixes : null;

  const sanitizedFindings = rawFindings.slice(0, 220).map(function (finding) {
    return {
      id: finding.id,
      ruleId: finding.ruleId,
      category: finding.category,
      severity: finding.severity,
      delta: finding.delta,
      message: finding.message,
      expected: finding.expected,
      actual: finding.actual,
      selector: finding.selector,
      groupKey: finding.groupKey,
      rect: finding.rect,
      guides: Array.isArray(finding.guides) ? finding.guides.slice(0, 4) : [],
      sourceHint: finding.sourceHint
        ? {
            property: finding.sourceHint.property,
            inlineValue: finding.sourceHint.inlineValue || "",
            matches: Array.isArray(finding.sourceHint.matches)
              ? finding.sourceHint.matches.slice(0, 3)
              : []
          }
        : null,
      htmlSnippet: finding.htmlSnippet || "",
      observedAt: finding.observedAt
    };
  });

  const sanitizedFixes = rawFixes
    ? {
        generatedAt: rawFixes.generatedAt || payload.scannedAt,
        cssText: String(rawFixes.cssText || "").slice(0, 200000),
        rules: Array.isArray(rawFixes.rules)
          ? rawFixes.rules.slice(0, 220).map(function (rule, index) {
              return {
                id: rule.id || "fix-rule-" + (index + 1),
                selector: String(rule.selector || ""),
                issueCount: Number.isFinite(Number.parseFloat(rule.issueCount))
                  ? Number.parseFloat(rule.issueCount)
                  : 0,
                maxSeverity: String(rule.maxSeverity || "medium"),
                declarations: Array.isArray(rule.declarations)
                  ? rule.declarations.slice(0, 12).map(function (declaration) {
                      return {
                        property: String(declaration.property || ""),
                        value: String(declaration.value || ""),
                        sourceRuleId: String(declaration.sourceRuleId || ""),
                        severity: String(declaration.severity || "medium"),
                        message: String(declaration.message || "")
                      };
                    })
                  : []
              };
            })
          : []
      }
    : {
        generatedAt: payload.scannedAt,
        cssText: "",
        rules: []
      };

  return {
    id:
      "scan-" +
      Math.random().toString(36).slice(2, 8) +
      "-" +
      Date.now().toString(36),
    url: payload.url,
    title: payload.title,
    scannedAt: payload.scannedAt,
    summary: summary,
    meta: {
      inspectedElements: meta.inspectedElements || 0,
      groupsAnalyzed: meta.groupsAnalyzed || 0,
      elapsedMs: meta.elapsedMs || 0,
      stylesheetsIndexed: meta.stylesheetsIndexed || 0
    },
    configSnapshot: payload.configSnapshot,
    result: {
      meta: payload.result.meta,
      summary: payload.result.summary,
      breakdown: payload.result.breakdown || { byCategory: {}, byRule: {} },
      findings: sanitizedFindings,
      fixes: sanitizedFixes
    }
  };
}

async function saveScan(payload) {
  if (!payload || !payload.result) {
    return null;
  }
  const history = await getHistory();
  const entry = summarizeForHistory(payload);
  history.unshift(entry);
  const trimmed = history.slice(0, HISTORY_LIMIT);
  await setHistory(trimmed);
  return entry;
}

async function getHistoryFor(url) {
  const history = await getHistory();
  if (!url) {
    return history;
  }
  return history.filter(function (entry) {
    return entry.url === url;
  });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "ui-consistency:save-history") {
    saveScan(message.payload)
      .then(function (entry) {
        sendResponse({ ok: true, payload: entry });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type === "ui-consistency:get-history") {
    getHistoryFor(message.url)
      .then(function (history) {
        sendResponse({ ok: true, payload: history });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type === "ui-consistency:clear-history") {
    setHistory([])
      .then(function () {
        sendResponse({ ok: true });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }
});
