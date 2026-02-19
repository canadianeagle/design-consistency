(function () {
  const root = (globalThis.UIConsistency = globalThis.UIConsistency || {});

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(target, source) {
    const out = isObject(target) ? { ...target } : {};
    if (!isObject(source)) {
      return out;
    }

    Object.keys(source).forEach(function (key) {
      const next = source[key];
      if (Array.isArray(next)) {
        out[key] = next.slice();
      } else if (isObject(next)) {
        out[key] = deepMerge(out[key], next);
      } else {
        out[key] = next;
      }
    });

    return out;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function median(values) {
    if (!values.length) {
      return null;
    }
    const sorted = values.slice().sort(function (a, b) {
      return a - b;
    });
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  function average(values) {
    if (!values.length) {
      return null;
    }
    const sum = values.reduce(function (acc, value) {
      return acc + value;
    }, 0);
    return sum / values.length;
  }

  function mode(values) {
    if (!values.length) {
      return null;
    }
    const counts = new Map();
    let topValue = values[0];
    let topCount = 0;
    values.forEach(function (value) {
      const count = (counts.get(value) || 0) + 1;
      counts.set(value, count);
      if (count > topCount) {
        topValue = value;
        topCount = count;
      }
    });
    return topValue;
  }

  function parsePx(value) {
    if (!value || typeof value !== "string") {
      return 0;
    }
    const normalized = value.trim();
    if (normalized === "normal") {
      return 0;
    }
    if (normalized.endsWith("px")) {
      return Number.parseFloat(normalized) || 0;
    }
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function normalizeColor(value) {
    if (!value) {
      return "rgba(0,0,0,0)";
    }
    return value.replace(/\s+/g, "").toLowerCase();
  }

  function rgbFromColor(value) {
    const normalized = normalizeColor(value);
    const rgbaMatch = normalized.match(
      /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/
    );
    if (rgbaMatch) {
      return {
        r: Number.parseFloat(rgbaMatch[1]),
        g: Number.parseFloat(rgbaMatch[2]),
        b: Number.parseFloat(rgbaMatch[3])
      };
    }

    const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex =
          hex[0] +
          hex[0] +
          hex[1] +
          hex[1] +
          hex[2] +
          hex[2];
      }
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16)
      };
    }

    return null;
  }

  function rgbaFromColor(value) {
    const normalized = normalizeColor(value);
    const rgbaMatch = normalized.match(
      /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/
    );
    if (!rgbaMatch) {
      return null;
    }
    return {
      r: Number.parseFloat(rgbaMatch[1]),
      g: Number.parseFloat(rgbaMatch[2]),
      b: Number.parseFloat(rgbaMatch[3]),
      a: rgbaMatch[4] == null ? 1 : Number.parseFloat(rgbaMatch[4])
    };
  }

  function colorDistance(a, b) {
    const rgbA = rgbFromColor(a);
    const rgbB = rgbFromColor(b);
    if (!rgbA || !rgbB) {
      return 0;
    }

    const dr = rgbA.r - rgbB.r;
    const dg = rgbA.g - rgbB.g;
    const db = rgbA.b - rgbB.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function channelToLinear(value) {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  function luminance(color) {
    const rgb = rgbFromColor(color);
    if (!rgb) {
      return null;
    }
    const r = channelToLinear(rgb.r);
    const g = channelToLinear(rgb.g);
    const b = channelToLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(foreground, background) {
    const l1 = luminance(foreground);
    const l2 = luminance(background);
    if (!Number.isFinite(l1) || !Number.isFinite(l2)) {
      return null;
    }
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function nearestValue(value, scale) {
    if (!Array.isArray(scale) || !scale.length || !Number.isFinite(value)) {
      return null;
    }
    let nearest = scale[0];
    let minDelta = Math.abs(value - nearest);
    for (let i = 1; i < scale.length; i += 1) {
      const candidate = scale[i];
      const delta = Math.abs(value - candidate);
      if (delta < minDelta) {
        minDelta = delta;
        nearest = candidate;
      }
    }
    return {
      value: nearest,
      delta: minDelta
    };
  }

  function shannonEntropy(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
    const counts = new Map();
    values.forEach(function (item) {
      const key = String(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = values.length;
    let entropy = 0;
    counts.forEach(function (count) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });
    return entropy;
  }

  function toFixed(value, digits) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Number.parseFloat(value.toFixed(digits));
  }

  function safeSelector(element) {
    if (!element || element.nodeType !== 1) {
      return "";
    }
    const escapeFn =
      globalThis.CSS && typeof globalThis.CSS.escape === "function"
        ? globalThis.CSS.escape
        : function (value) {
            return String(value).replace(/[^a-z0-9_-]/gi, "\\$&");
          };
    if (element.id) {
      return "#" + escapeFn(element.id);
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === 1 && current !== document.body) {
      let part = current.tagName.toLowerCase();
      const classList = Array.from(current.classList || []).filter(function (name) {
        return /^[a-z0-9_-]{2,}$/i.test(name) && !/\d{3,}/.test(name);
      });
      if (classList.length) {
        part += "." + escapeFn(classList[0]);
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(function (sibling) {
          return sibling.tagName === current.tagName;
        });
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += ":nth-of-type(" + index + ")";
        }
      }

      parts.unshift(part);
      current = current.parentElement;
      if (parts.length >= 5) {
        break;
      }
    }
    return parts.join(" > ");
  }

  function htmlSnippet(element, maxLength) {
    if (!element || !element.outerHTML) {
      return "";
    }
    const trimmed = element.outerHTML.replace(/\s+/g, " ").trim();
    return trimmed.length > maxLength
      ? trimmed.slice(0, maxLength - 3) + "..."
      : trimmed;
  }

  function severityFromDelta(delta, tolerance) {
    if (delta >= tolerance * 2.5) {
      return "critical";
    }
    if (delta >= tolerance * 1.5) {
      return "high";
    }
    return "medium";
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "-" +
      Date.now().toString(36)
    );
  }

  root.utils = {
    average,
    clamp,
    colorDistance,
    contrastRatio,
    deepClone,
    deepMerge,
    htmlSnippet,
    luminance,
    median,
    mode,
    nearestValue,
    normalizeColor,
    nowIso,
    parsePx,
    rgbaFromColor,
    safeSelector,
    shannonEntropy,
    severityFromDelta,
    toFixed,
    uid
  };
})();
