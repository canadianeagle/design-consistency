# AGENTS.md

This file guides engineering agents and contributors working in this repository.

## Goal

Build and maintain a production-grade Chrome extension that audits UI consistency and design quality with high configurability and clear diagnostics.

## Product Boundaries

- Platform: Chrome Extension, Manifest V3
- Runtime: Vanilla JS/HTML/CSS (no build framework required)
- Primary surface: popup + options + content overlay

## Architecture

- `src/content/scanner.js`: scanning engine + rule execution
- `src/content/overlay.js`: visual diagnostics renderer
- `src/content/content.js`: content runtime orchestration + messaging
- `src/background/service-worker.js`: history persistence
- `src/options/*`: full config and rule-builder UX
- `src/popup/*`: scan controls, quick diagnostics, history replay
- `src/shared/config.js`: defaults
- `src/shared/utils.js`: shared helpers

## Rule Engine Conventions

- Every finding should include:
  - `ruleId`, `category`, `severity`, `message`, `expected`, `actual`, `selector`, `rect`
- Keep rule IDs stable over time for history comparability.
- New rule families must be configurable in:
  - `src/shared/config.js`
  - `src/options/options.html`
  - `src/options/options.js`
- Prefer explicit thresholds over hardcoded values.

## Custom Rule DSL

- Types:
  - `assert`
  - `consistency`
- Keep DSL backward-compatible when possible.
- Preserve round-trip compatibility between Rule Builder UI and JSON.

## Coding Standards

- Use ASCII by default.
- Avoid unsafe HTML injection from scanned-page data.
- Keep functions focused and side effects explicit.
- Favor descriptive names over short abbreviations.

## Verification

Run before commit:

```bash
npm run check
```

For packaging:

```bash
npm run package
```

## Release Checklist

1. Update `README.md` for major feature changes.
2. Run `npm run check`.
3. Build package with `npm run package`.
4. Validate unpacked extension manually on at least one complex page.
5. Tag release and attach zip artifact.
