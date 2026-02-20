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
  const rawFrameworks = payload.result && payload.result.frameworks
    ? payload.result.frameworks
    : null;
  const sanitizedFrameworks = rawFrameworks
    ? {
        primary: rawFrameworks.primary || null,
        detected: Array.isArray(rawFrameworks.detected)
          ? rawFrameworks.detected.slice(0, 8)
          : [],
        caveats: Array.isArray(rawFrameworks.caveats)
          ? rawFrameworks.caveats.slice(0, 10)
          : [],
        stats: rawFrameworks.stats || {}
      }
    : null;

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
      sampleId: finding.sampleId || "",
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
      observedAt: finding.observedAt,
      metadata: finding.metadata && typeof finding.metadata === "object"
        ? {
            suggestedFixes: Array.isArray(finding.metadata.suggestedFixes)
              ? finding.metadata.suggestedFixes.slice(0, 4).map(function (hint) {
                  return {
                    selector: String(hint.selector || ""),
                    property: String(hint.property || ""),
                    value: String(hint.value || ""),
                    confidence: String(hint.confidence || "")
                  };
                })
              : []
          }
        : null
    };
  });

  const sanitizedFixes = rawFixes
    ? {
        generatedAt: rawFixes.generatedAt || payload.scannedAt,
        cssText: String(rawFixes.cssText || "").slice(0, 200000),
        frameworkProfile: rawFixes.frameworkProfile
          ? {
              primary: rawFixes.frameworkProfile.primary || null,
              detected: Array.isArray(rawFixes.frameworkProfile.detected)
                ? rawFixes.frameworkProfile.detected.slice(0, 8)
                : [],
              caveats: Array.isArray(rawFixes.frameworkProfile.caveats)
                ? rawFixes.frameworkProfile.caveats.slice(0, 8)
                : [],
              stats: rawFixes.frameworkProfile.stats || {}
            }
          : null,
        recommendations:
          rawFixes.recommendations &&
          typeof rawFixes.recommendations === "object"
            ? {
                generatedAt: rawFixes.recommendations.generatedAt || payload.scannedAt,
                total: Number.isFinite(Number.parseFloat(rawFixes.recommendations.total))
                  ? Number.parseFloat(rawFixes.recommendations.total)
                  : 0,
                channelDistribution: Array.isArray(rawFixes.recommendations.channelDistribution)
                  ? rawFixes.recommendations.channelDistribution
                      .slice(0, 12)
                      .map(function (entry) {
                        return {
                          channel: String(entry.channel || "scoped-css"),
                          usage: Number.isFinite(Number.parseFloat(entry.usage))
                            ? Number.parseFloat(entry.usage)
                            : 0
                        };
                      })
                  : [],
                top: Array.isArray(rawFixes.recommendations.top)
                  ? rawFixes.recommendations.top.slice(0, 80).map(function (rec) {
                      return {
                        id: String(rec.id || ""),
                        selector: String(rec.selector || ""),
                        severity: String(rec.severity || "medium"),
                        priority: Number.isFinite(Number.parseFloat(rec.priority))
                          ? Number.parseFloat(rec.priority)
                          : 0,
                        issueCount: Number.isFinite(Number.parseFloat(rec.issueCount))
                          ? Number.parseFloat(rec.issueCount)
                          : 0,
                        confidence: Number.isFinite(Number.parseFloat(rec.confidence))
                          ? Number.parseFloat(rec.confidence)
                          : 0,
                        stability: Number.isFinite(Number.parseFloat(rec.stability))
                          ? Number.parseFloat(rec.stability)
                          : 0,
                        risk: String(rec.risk || "medium"),
                        riskScore: Number.isFinite(Number.parseFloat(rec.riskScore))
                          ? Number.parseFloat(rec.riskScore)
                          : 0,
                        framework: String(rec.framework || "generic"),
                        channels: Array.isArray(rec.channels)
                          ? rec.channels.slice(0, 6).map(function (channel) {
                              return String(channel || "scoped-css");
                            })
                          : [],
                        declarations: Array.isArray(rec.declarations)
                          ? rec.declarations.slice(0, 8).map(function (declaration) {
                              return {
                                property: String(declaration.property || ""),
                                value: String(declaration.value || ""),
                                sourceRuleId: String(declaration.sourceRuleId || ""),
                                severity: String(declaration.severity || "medium"),
                                confidence: Number.isFinite(
                                  Number.parseFloat(declaration.confidence)
                                )
                                  ? Number.parseFloat(declaration.confidence)
                                  : 0,
                                stability: Number.isFinite(
                                  Number.parseFloat(declaration.stability)
                                )
                                  ? Number.parseFloat(declaration.stability)
                                  : 0,
                                channel: String(declaration.channel || "scoped-css"),
                                framework: String(declaration.framework || "generic"),
                                rationale: String(declaration.rationale || "")
                              };
                            })
                          : [],
                        guidance: String(rec.guidance || ""),
                        caveat: String(rec.caveat || "")
                      };
                    })
                  : []
              }
            : { generatedAt: payload.scannedAt, total: 0, channelDistribution: [], top: [] },
        rules: Array.isArray(rawFixes.rules)
          ? rawFixes.rules.slice(0, 220).map(function (rule, index) {
              return {
                id: rule.id || "fix-rule-" + (index + 1),
                selector: String(rule.selector || ""),
                issueCount: Number.isFinite(Number.parseFloat(rule.issueCount))
                  ? Number.parseFloat(rule.issueCount)
                  : 0,
                maxSeverity: String(rule.maxSeverity || "medium"),
                channels: Array.isArray(rule.channels)
                  ? rule.channels.slice(0, 6).map(function (channel) {
                      return String(channel || "scoped-css");
                    })
                  : [],
                frameworks: Array.isArray(rule.frameworks)
                  ? rule.frameworks.slice(0, 6).map(function (framework) {
                      return String(framework || "generic");
                    })
                  : [],
                declarations: Array.isArray(rule.declarations)
                  ? rule.declarations.slice(0, 12).map(function (declaration) {
                      return {
                        property: String(declaration.property || ""),
                        value: String(declaration.value || ""),
                        sourceRuleId: String(declaration.sourceRuleId || ""),
                        severity: String(declaration.severity || "medium"),
                        message: String(declaration.message || ""),
                        confidence: Number.isFinite(Number.parseFloat(declaration.confidence))
                          ? Number.parseFloat(declaration.confidence)
                          : 0,
                        stability: Number.isFinite(Number.parseFloat(declaration.stability))
                          ? Number.parseFloat(declaration.stability)
                          : 0,
                        channel: String(declaration.channel || "scoped-css"),
                        framework: String(declaration.framework || "generic"),
                        rationale: String(declaration.rationale || "")
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
        frameworkProfile: null,
        recommendations: {
          generatedAt: payload.scannedAt,
          total: 0,
          channelDistribution: [],
          top: []
        },
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
      frameworks: sanitizedFrameworks,
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
