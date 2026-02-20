(function () {
  const root = (globalThis.UIConsistencyUI = globalThis.UIConsistencyUI || {});

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function extractLabelText(label, removeSelector) {
    const clone = label.cloneNode(true);
    Array.from(clone.querySelectorAll(removeSelector)).forEach(function (node) {
      node.remove();
    });
    return normalizeText(clone.textContent);
  }

  function createTipNode(text) {
    if (!text) {
      return null;
    }
    const tip = document.createElement("uic-tip");
    tip.setAttribute("text", text);
    return tip;
  }

  class UICTip extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) {
        return;
      }

      const text =
        normalizeText(this.getAttribute("text")) || normalizeText(this.textContent) || "Info";

      this.textContent = "";

      const shadow = this.attachShadow({ mode: "open" });
      const wrapper = document.createElement("span");
      wrapper.setAttribute("part", "badge");
      wrapper.title = text;
      wrapper.setAttribute("aria-label", text);
      wrapper.textContent = "?";

      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: inline-flex;
          margin-left: 6px;
          vertical-align: middle;
        }
        [part="badge"] {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(92, 118, 142, 0.46);
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.92), rgba(230, 236, 245, 0.72));
          color: #34516f;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: help;
          user-select: none;
        }
      `;

      shadow.appendChild(style);
      shadow.appendChild(wrapper);
    }
  }

  class UICToggle extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) {
        return;
      }

      const input = this.querySelector('input[type="checkbox"]');
      if (!input) {
        return;
      }

      input.style.position = "absolute";
      input.style.opacity = "0";
      input.style.pointerEvents = "none";
      input.style.width = "1px";
      input.style.height = "1px";
      input.style.margin = "0";

      const labelText =
        normalizeText(this.getAttribute("label")) ||
        normalizeText(this.getAttribute("data-label")) ||
        normalizeText(this.textContent) ||
        "Toggle";

      const tipText = normalizeText(this.getAttribute("tip"));

      this.textContent = "";
      this.appendChild(input);

      const shadow = this.attachShadow({ mode: "open" });
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("part", "button");
      button.setAttribute("aria-label", labelText);

      const track = document.createElement("span");
      track.setAttribute("part", "track");
      const thumb = document.createElement("span");
      thumb.setAttribute("part", "thumb");
      track.appendChild(thumb);

      const text = document.createElement("span");
      text.setAttribute("part", "text");
      text.textContent = labelText;

      button.appendChild(track);
      button.appendChild(text);

      if (tipText) {
        const tip = document.createElement("uic-tip");
        tip.setAttribute("text", tipText);
        button.appendChild(tip);
      }

      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: block;
        }
        [part="button"] {
          appearance: none;
          width: 100%;
          border: 1px solid rgba(115, 131, 149, 0.35);
          border-radius: 12px;
          background: linear-gradient(155deg, rgba(255, 255, 255, 0.86), rgba(240, 246, 255, 0.7));
          color: #223246;
          font: inherit;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }
        [part="button"]:hover {
          border-color: rgba(71, 139, 169, 0.62);
          box-shadow: 0 8px 18px rgba(44, 88, 121, 0.14);
        }
        [part="button"]:focus-visible {
          outline: none;
          border-color: rgba(35, 138, 176, 0.85);
          box-shadow: 0 0 0 3px rgba(71, 177, 210, 0.26);
        }
        [part="track"] {
          width: 34px;
          height: 20px;
          border-radius: 999px;
          background: linear-gradient(180deg, #c9d7e7, #aebfd1);
          position: relative;
          flex-shrink: 0;
        }
        [part="thumb"] {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #f9fcff;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.24);
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 140ms ease;
        }
        [part="text"] {
          font-size: 12px;
          font-weight: 650;
          color: #1e3347;
        }
        :host([checked]) [part="track"] {
          background: linear-gradient(150deg, #31c4be, #2f8bb5);
        }
        :host([checked]) [part="thumb"] {
          transform: translateX(14px);
        }
      `;

      const sync = function () {
        if (input.checked) {
          button.setAttribute("aria-checked", "true");
          button.setAttribute("role", "switch");
          button.setAttribute("data-checked", "true");
          this.setAttribute("checked", "true");
        } else {
          button.setAttribute("aria-checked", "false");
          button.setAttribute("role", "switch");
          button.removeAttribute("data-checked");
          this.removeAttribute("checked");
        }
      }.bind(this);

      button.addEventListener("click", function () {
        input.checked = !input.checked;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        sync();
      });

      input.addEventListener("change", sync);
      sync();

      shadow.appendChild(style);
      shadow.appendChild(button);
    }
  }

  class UICSelect extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) {
        return;
      }

      const select = this.querySelector("select");
      if (!select) {
        return;
      }

      const labelText = normalizeText(this.getAttribute("label")) || "Select";
      const tipText = normalizeText(this.getAttribute("tip"));

      const shadow = this.attachShadow({ mode: "open" });

      const wrapper = document.createElement("div");
      wrapper.setAttribute("part", "wrapper");

      const head = document.createElement("div");
      head.setAttribute("part", "head");
      const label = document.createElement("span");
      label.setAttribute("part", "label");
      label.textContent = labelText;
      head.appendChild(label);
      if (tipText) {
        const tip = document.createElement("uic-tip");
        tip.setAttribute("text", tipText);
        head.appendChild(tip);
      }

      const field = document.createElement("div");
      field.setAttribute("part", "field");
      const slot = document.createElement("slot");
      const arrow = document.createElement("span");
      arrow.setAttribute("part", "arrow");
      arrow.textContent = "▾";
      field.appendChild(slot);
      field.appendChild(arrow);

      wrapper.appendChild(head);
      wrapper.appendChild(field);

      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: block;
        }
        [part="wrapper"] {
          display: grid;
          gap: 6px;
        }
        [part="head"] {
          display: inline-flex;
          align-items: center;
          color: #334f68;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        [part="field"] {
          position: relative;
        }
        [part="arrow"] {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #33566d;
          font-size: 13px;
          font-weight: 700;
        }
        ::slotted(select) {
          width: 100%;
          appearance: none;
          border: 1px solid rgba(100, 124, 147, 0.42);
          border-radius: 10px;
          background: linear-gradient(150deg, rgba(255, 255, 255, 0.92), rgba(239, 245, 252, 0.72));
          color: #1f3042;
          padding: 8px 30px 8px 10px;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }
        ::slotted(select:focus-visible) {
          border-color: rgba(35, 138, 176, 0.85);
          box-shadow: 0 0 0 3px rgba(71, 177, 210, 0.26);
        }
        ::slotted(select option) {
          color: #1f3042;
          background: #f6fbff;
        }
      `;

      shadow.appendChild(style);
      shadow.appendChild(wrapper);
    }
  }

  function enhanceCheckboxLabels(scope) {
    Array.from(scope.querySelectorAll("label")).forEach(function (label) {
      if (label.dataset.uicEnhanced === "true") {
        return;
      }

      const checkbox = label.querySelector('input[type="checkbox"]');
      if (!checkbox) {
        return;
      }
      if (checkbox.closest("uic-toggle")) {
        return;
      }

      const toggle = document.createElement("uic-toggle");
      const labelText = extractLabelText(label, "input");
      const tip = label.getAttribute("data-tip") || label.getAttribute("title") || "";
      if (labelText) {
        toggle.setAttribute("label", labelText);
      }
      if (tip) {
        toggle.setAttribute("tip", tip);
      }

      const parent = label.parentNode;
      parent.insertBefore(toggle, label);
      toggle.appendChild(checkbox);
      label.dataset.uicEnhanced = "true";
      label.remove();
    });
  }

  function enhanceSelectLabels(scope) {
    Array.from(scope.querySelectorAll("label")).forEach(function (label) {
      if (label.dataset.uicEnhancedSelect === "true") {
        return;
      }

      const select = label.querySelector("select");
      if (!select || select.closest("uic-select")) {
        return;
      }

      const custom = document.createElement("uic-select");
      const labelText = extractLabelText(label, "select");
      const tip = label.getAttribute("data-tip") || label.getAttribute("title") || "";
      if (labelText) {
        custom.setAttribute("label", labelText);
      }
      if (tip) {
        custom.setAttribute("tip", tip);
      }

      const parent = label.parentNode;
      parent.insertBefore(custom, label);
      custom.appendChild(select);
      label.dataset.uicEnhancedSelect = "true";
      label.remove();
    });
  }

  function enhanceTipTargets(scope) {
    Array.from(scope.querySelectorAll("[data-tip-target='true']")).forEach(function (node) {
      if (node.dataset.uicTipEnhanced === "true") {
        return;
      }
      const tipText = normalizeText(node.getAttribute("data-tip"));
      if (!tipText) {
        return;
      }
      const tip = createTipNode(tipText);
      if (!tip) {
        return;
      }
      node.appendChild(tip);
      node.dataset.uicTipEnhanced = "true";
    });
  }

  function enhanceFormControls(scope) {
    const rootNode = scope || document;
    enhanceCheckboxLabels(rootNode);
    enhanceSelectLabels(rootNode);
    enhanceTipTargets(rootNode);
  }

  if (globalThis.customElements) {
    if (!customElements.get("uic-tip")) {
      customElements.define("uic-tip", UICTip);
    }
    if (!customElements.get("uic-toggle")) {
      customElements.define("uic-toggle", UICToggle);
    }
    if (!customElements.get("uic-select")) {
      customElements.define("uic-select", UICSelect);
    }
  }

  root.enhanceFormControls = enhanceFormControls;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      enhanceFormControls(document);
    });
  } else {
    enhanceFormControls(document);
  }
})();
