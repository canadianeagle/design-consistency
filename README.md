# UI Consistency Investigator

A configurable Chrome Extension (Manifest V3) that scans a live page for UI/design inconsistencies and overlays precise diagnostics (highlights, rulers, labels, issue panel), with persistent scan history.

## Core Capabilities

- Deep style consistency scanning across DOM + computed CSS + stylesheet analysis
- Granular built-in rules across spacing, typography, color, shape, layout, accessibility, interaction, content clipping, CSS quality, and design-token compliance
- Rule Builder UI for custom rules (no code required)
- JSON DSL custom rules (`assert` + `consistency`) for advanced teams
- Overlay diagnostics: issue boxes, guide lines/rulers, severity filtering, score panel
- Configurable thresholds, grouping strategy, selectors, and reporting output
- Scan history and replay overlay for the same page URL

## Rule Builder UI

Open Extension Options and go to **Custom Rules Engine**.

You can:
- Add, edit, clone, and delete rules visually
- Switch between `assert` and `consistency` rule types
- Sync builder rules to JSON
- Load JSON back into the builder

`assert` example from builder:
- selector: `button`
- source: `metric`
- property: `height`
- operator: `gte`
- value: `44`

`consistency` example from builder:
- selector: `.card`
- source: `metric`
- property: `paddingTop`
- baseline: `median`
- tolerance: `2`

## Project Structure

- `manifest.json`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `src/background/service-worker.js`
- `src/content/scanner.js`
- `src/content/overlay.js`
- `src/content/content.js`
- `src/popup/*`
- `src/options/*`
- `src/shared/*`
- `scripts/check.mjs`
- `scripts/build.mjs`
- `scripts/package.mjs`
- `docs/BUILD_DEPLOY_TEST.md`
- `AGENTS.md`

## Local Development

### Prerequisites

- Node.js 20+
- Google Chrome

### Install and Validate

```bash
npm install
npm run check
```

### CI/CD

- `CI` workflow (`.github/workflows/ci.yml`)
  - Triggers on `push` to `main` and all pull requests
  - Runs `npm ci`, `npm run check`, `npm run build`, `npm run package`
  - Uploads `dist/ui-consistency-investigator.zip` as a workflow artifact
- `Release Package` workflow (`.github/workflows/release.yml`)
  - Triggers on tags matching `v*`
  - Builds and packages extension
  - Publishes `dist/ui-consistency-investigator.zip` to GitHub Release assets

### Load Extension (Unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repo root directory

### Build and Package

```bash
npm run build
npm run package
```

Outputs:
- Build folder: `dist/ui-consistency-investigator`
- Zip package: `dist/ui-consistency-investigator.zip`

## Deploy

### Chrome Web Store

1. Run `npm run package`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload `dist/ui-consistency-investigator.zip`
4. Complete store metadata and submit review

### GitHub Release Artifact

1. Create and push a semver tag, e.g.:
   - `git tag v0.2.1 && git push origin v0.2.1`
2. Release workflow automatically creates/updates the release and uploads:
   - `dist/ui-consistency-investigator.zip`

## Testing

- Run static checks: `npm run check`
- Run manual QA checklist in `docs/BUILD_DEPLOY_TEST.md`
- Recommended smoke targets:
  - e-commerce PDP
  - dashboard/data-heavy app
  - marketing page with varied typography/layout

## Notes

- Cross-origin stylesheets may not be readable due to browser security constraints.
- On very large pages, tune limits in Options (`maxElements`, `overlapSampleLimit`, `maxOverlapChecks`).
- History overlay replay requires opening the same URL the scan was captured on.
