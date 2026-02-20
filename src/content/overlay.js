(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});

  const COLORS = {
    critical: "#de3f32",
    high: "#ef8c1f",
    medium: "#f2c24d",
    low: "#6a8f2a"
  };

  function ensureRect(rect) {
    if (!rect) {
      return null;
    }
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function createOverlay() {
    let overlayRoot = null;
    let canvas = null;
    let canvasContext = null;
    let boxLayer = null;
    let labelLayer = null;
    let panel = null;
    let resultData = null;
    let settings = null;
    let isVisible = false;
    let rafToken = 0;

    function ensureDom() {
      if (overlayRoot) {
        return;
      }

      overlayRoot = document.createElement("div");
      overlayRoot.dataset.uiConsistencyOverlay = "true";
      overlayRoot.id = "ui-consistency-overlay-root";
      overlayRoot.style.position = "absolute";
      overlayRoot.style.inset = "0";
      overlayRoot.style.zIndex = "2147483640";
      overlayRoot.style.pointerEvents = "none";
      overlayRoot.style.fontFamily = '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif';

      canvas = document.createElement("canvas");
      canvas.dataset.uiConsistencyOverlay = "true";
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "2";
      canvasContext = canvas.getContext("2d");

      boxLayer = document.createElement("div");
      boxLayer.dataset.uiConsistencyOverlay = "true";
      boxLayer.style.position = "absolute";
      boxLayer.style.inset = "0";
      boxLayer.style.pointerEvents = "none";
      boxLayer.style.zIndex = "3";

      labelLayer = document.createElement("div");
      labelLayer.dataset.uiConsistencyOverlay = "true";
      labelLayer.style.position = "absolute";
      labelLayer.style.inset = "0";
      labelLayer.style.pointerEvents = "none";
      labelLayer.style.zIndex = "4";

      panel = document.createElement("aside");
      panel.dataset.uiConsistencyOverlay = "true";
      panel.style.position = "fixed";
      panel.style.top = "16px";
      panel.style.right = "16px";
      panel.style.width = "340px";
      panel.style.maxHeight = "70vh";
      panel.style.overflow = "auto";
      panel.style.background = "rgba(14, 20, 32, 0.9)";
      panel.style.backdropFilter = "blur(8px)";
      panel.style.border = "1px solid rgba(255, 255, 255, 0.2)";
      panel.style.borderRadius = "12px";
      panel.style.boxShadow = "0 22px 58px rgba(0, 0, 0, 0.35)";
      panel.style.padding = "12px";
      panel.style.pointerEvents = "auto";
      panel.style.zIndex = "5";
      panel.style.color = "#f8f7f2";

      overlayRoot.appendChild(canvas);
      overlayRoot.appendChild(boxLayer);
      overlayRoot.appendChild(labelLayer);
      overlayRoot.appendChild(panel);
      document.documentElement.appendChild(overlayRoot);

      window.addEventListener("scroll", queueRender, { passive: true });
      window.addEventListener("resize", queueRender);
    }

    function removeDom() {
      if (!overlayRoot) {
        return;
      }
      window.removeEventListener("scroll", queueRender);
      window.removeEventListener("resize", queueRender);
      overlayRoot.remove();
      overlayRoot = null;
      canvas = null;
      canvasContext = null;
      boxLayer = null;
      labelLayer = null;
      panel = null;
    }

    function queueRender() {
      if (!isVisible) {
        return;
      }
      if (rafToken) {
        return;
      }
      rafToken = window.requestAnimationFrame(function () {
        rafToken = 0;
        render();
      });
    }

    function getSeverityColor(severity) {
      return COLORS[severity] || COLORS.medium;
    }

    function getFilteredFindings() {
      if (!resultData || !resultData.findings) {
        return [];
      }

      const activeFilter = settings && settings.severityFilter
        ? settings.severityFilter
        : "all";

      return resultData.findings
        .filter(function (finding) {
          if (activeFilter === "all") {
            return true;
          }
          return finding.severity === activeFilter;
        })
        .slice(0, settings.maxVisibleFindings || 250);
    }

    function sizeOverlay() {
      if (!overlayRoot || !canvas) {
        return;
      }
      const width = Math.max(
        document.documentElement.scrollWidth,
        document.body ? document.body.scrollWidth : 0,
        window.innerWidth
      );
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        window.innerHeight
      );

      overlayRoot.style.width = width + "px";
      overlayRoot.style.height = height + "px";

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvasContext.clearRect(0, 0, width, height);
    }

    function drawGuides(findings) {
      if (!canvasContext || !settings.showRulers) {
        return;
      }

      findings.forEach(function (finding) {
        (finding.guides || []).forEach(function (guide) {
          if (guide.type !== "line") {
            return;
          }
          const color = getSeverityColor(finding.severity);
          canvasContext.strokeStyle = color;
          canvasContext.globalAlpha = 0.9;
          canvasContext.lineWidth = 1.25;
          canvasContext.beginPath();
          canvasContext.moveTo(guide.x1, guide.y1);
          canvasContext.lineTo(guide.x2, guide.y2);
          canvasContext.stroke();

          if (guide.label) {
            canvasContext.fillStyle = color;
            canvasContext.font = "11px 'Avenir Next', 'Trebuchet MS', sans-serif";
            canvasContext.fillText(guide.label, guide.x2 + 4, guide.y2 + 2);
          }
        });
      });
    }

    function createBox(finding) {
      const rect = ensureRect(finding.rect);
      if (!rect) {
        return;
      }
      const box = document.createElement("div");
      box.dataset.uiConsistencyOverlay = "true";
      box.style.position = "absolute";
      box.style.left = rect.left + "px";
      box.style.top = rect.top + "px";
      box.style.width = Math.max(0, rect.width) + "px";
      box.style.height = Math.max(0, rect.height) + "px";
      box.style.border = "2px solid " + getSeverityColor(finding.severity);
      box.style.background = "rgba(255, 255, 255, 0.03)";
      box.style.boxShadow = "0 0 0 1px rgba(0, 0, 0, 0.3) inset";
      box.style.borderRadius = "4px";
      box.style.pointerEvents = "none";
      boxLayer.appendChild(box);

      if (!settings.showLabels) {
        return;
      }

      const label = document.createElement("div");
      label.dataset.uiConsistencyOverlay = "true";
      label.style.position = "absolute";
      label.style.left = rect.left + "px";
      label.style.top = Math.max(0, rect.top - 20) + "px";
      label.style.background = getSeverityColor(finding.severity);
      label.style.color = "#0f1322";
      label.style.padding = "2px 6px";
      label.style.borderRadius = "999px";
      label.style.fontSize = "10px";
      label.style.fontWeight = "700";
      label.style.letterSpacing = "0.04em";
      label.style.maxWidth = "280px";
      label.style.whiteSpace = "nowrap";
      label.style.textOverflow = "ellipsis";
      label.style.overflow = "hidden";
      label.textContent = finding.ruleId + " | " + finding.delta;
      labelLayer.appendChild(label);
    }

    function renderPanel(findings) {
      if (!panel) {
        return;
      }

      if (!settings.showPanel) {
        panel.style.display = "none";
        return;
      }

      panel.style.display = "block";

      const summary = resultData && resultData.summary
        ? resultData.summary
        : { total: 0, consistencyScore: 100, critical: 0, high: 0, medium: 0, low: 0 };

      const top = findings.slice(0, 10);

      panel.innerHTML = "";

      const header = document.createElement("div");
      header.style.display = "grid";
      header.style.gap = "6px";

      const headingRow = document.createElement("div");
      headingRow.style.display = "flex";
      headingRow.style.alignItems = "center";
      headingRow.style.justifyContent = "space-between";
      headingRow.style.gap = "8px";

      const label = document.createElement("div");
      label.style.fontSize = "11px";
      label.style.letterSpacing = "0.08em";
      label.style.textTransform = "uppercase";
      label.style.opacity = "0.75";
      label.textContent = "UI Consistency Inspector";

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "Close Overlay";
      closeButton.style.pointerEvents = "auto";
      closeButton.style.cursor = "pointer";
      closeButton.style.border = "1px solid rgba(255,255,255,0.24)";
      closeButton.style.borderRadius = "999px";
      closeButton.style.padding = "4px 8px";
      closeButton.style.background =
        "linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))";
      closeButton.style.color = "#f8f7f2";
      closeButton.style.fontSize = "10px";
      closeButton.style.fontWeight = "700";
      closeButton.style.letterSpacing = "0.04em";
      closeButton.addEventListener("click", function () {
        hide();
      });

      headingRow.appendChild(label);
      headingRow.appendChild(closeButton);
      header.appendChild(headingRow);

      const scoreRow = document.createElement("div");
      scoreRow.style.display = "flex";
      scoreRow.style.justifyContent = "space-between";
      scoreRow.style.alignItems = "end";
      scoreRow.style.marginTop = "2px";

      const score = document.createElement("strong");
      score.style.fontSize = "24px";
      score.style.lineHeight = "1";
      score.textContent = String(summary.consistencyScore);

      const scoreLabel = document.createElement("span");
      scoreLabel.style.fontSize = "11px";
      scoreLabel.style.opacity = "0.82";
      scoreLabel.textContent = "score";

      scoreRow.appendChild(score);
      scoreRow.appendChild(scoreLabel);
      header.appendChild(scoreRow);
      panel.appendChild(header);

      const meta = document.createElement("div");
      meta.style.display = "grid";
      meta.style.gridTemplateColumns = "repeat(4,minmax(0,1fr))";
      meta.style.gap = "8px";
      meta.style.marginTop = "8px";

      [
        ["Critical", summary.critical, COLORS.critical],
        ["High", summary.high, COLORS.high],
        ["Medium", summary.medium, COLORS.medium],
        ["Low", summary.low || 0, COLORS.low]
      ].forEach(function (item) {
        const node = document.createElement("div");
        node.style.background = "rgba(255,255,255,0.06)";
        node.style.border = "1px solid rgba(255,255,255,0.12)";
        node.style.borderRadius = "8px";
        node.style.padding = "6px";
        node.innerHTML =
          '<div style="font-size:10px;opacity:0.75;text-transform:uppercase">' +
          item[0] +
          "</div>" +
          '<div style="font-size:16px;color:' +
          item[2] +
          ';font-weight:700">' +
          item[1] +
          "</div>";
        meta.appendChild(node);
      });
      panel.appendChild(meta);

      const list = document.createElement("div");
      list.style.marginTop = "10px";
      list.style.display = "grid";
      list.style.gap = "6px";
      top.forEach(function (finding) {
        const row = document.createElement("div");
        row.style.border = "1px solid rgba(255,255,255,0.12)";
        row.style.borderRadius = "8px";
        row.style.padding = "6px";
        row.style.background = "rgba(255,255,255,0.04)";
        row.style.boxShadow =
          "inset 0 0 0 1px " +
          getSeverityColor(finding.severity) +
          "40, 0 6px 14px rgba(0,0,0,0.16)";

        const text =
          '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.8">' +
          finding.ruleId +
          "</div>" +
          '<div style="font-size:12px;line-height:1.35;margin-top:2px">' +
          finding.message +
          "</div>";
        row.innerHTML = text;
        list.appendChild(row);
      });
      panel.appendChild(list);
    }

    function render() {
      if (!isVisible || !overlayRoot) {
        return;
      }

      sizeOverlay();
      boxLayer.innerHTML = "";
      labelLayer.innerHTML = "";

      const findings = getFilteredFindings();
      if (settings.showHighlights) {
        findings.forEach(createBox);
      }
      drawGuides(findings);
      renderPanel(findings);
    }

    function show() {
      if (isVisible) {
        queueRender();
        return;
      }
      ensureDom();
      isVisible = true;
      overlayRoot.style.display = "block";
      queueRender();
    }

    function hide() {
      isVisible = false;
      if (overlayRoot) {
        overlayRoot.style.display = "none";
      }
    }

    return {
      setData: function (nextData, nextSettings) {
        resultData = nextData;
        settings = nextSettings;
        if (isVisible) {
          queueRender();
        }
      },
      setSettings: function (nextSettings) {
        settings = nextSettings;
        if (isVisible) {
          queueRender();
        }
      },
      show: show,
      hide: hide,
      destroy: removeDom,
      isVisible: function () {
        return isVisible;
      }
    };
  }

  root.overlay = {
    createOverlay: createOverlay
  };
})();
