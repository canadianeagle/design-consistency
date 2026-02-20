# Build, Deploy, and Test Guide

## 1. Build

### Validate Source

```bash
npm run check
```

This validates:
- Manifest structure
- Options page ID wiring
- JavaScript syntax checks for all `src/` and `scripts/` files

If branding icons are updated, regenerate them first:

```bash
./scripts/generate_icons.sh
```

### Create Build Output

```bash
npm run build
```

Output directory:
- `dist/ui-consistency-investigator`

### Create Uploadable ZIP

```bash
npm run package
```

Output file:
- `dist/ui-consistency-investigator.zip`

## 2. Deploy

## Chrome Web Store deployment

1. Build package with `npm run package`
2. Open the Chrome Web Store Developer Dashboard
3. Upload `dist/ui-consistency-investigator.zip`
4. Update listing details and screenshots
5. Submit for review

## GitHub Actions CI/CD

Workflows:
- `CI`: runs on PRs + pushes to `main`
- `Release Package`: runs on `v*` tags and publishes release zip

To verify CI locally before pushing:

```bash
npm ci
npm run check
npm run build
npm run package
```

To trigger automated GitHub release packaging:

```bash
git tag v0.2.1
git push origin v0.2.1
```

## Internal/QA deployment via unpacked extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click **Load unpacked**
4. Select repository root
5. Click reload when local source changes

## 3. Test Plan

## Functional smoke tests

1. Open a target page
2. Run a scan from popup
3. Confirm overlay boxes and rulers appear
4. Toggle `Highlights/Rulers/Labels/Panel` and verify behavior
5. Verify top findings + category hotspot list populate
6. Export JSON and confirm payload contains `summary`, `breakdown`, and `findings`

## Rule Builder tests

1. Add an `assert` rule from Rule Builder UI
2. Sync Builder to JSON and verify JSON updates
3. Save config
4. Reload options and ensure rule persists
5. Add a `consistency` rule and verify execution metadata in scan output
6. Load JSON into Builder and confirm round-trip integrity

## History tests

1. Run multiple scans on the same page
2. Verify history entries are created
3. Replay a history entry overlay
4. Confirm history clear action empties list

## Performance checks

1. Scan a large page (>2k nodes)
2. Ensure scan completes and UI remains responsive
3. If slow, tune:
   - `maxElements`
   - `overlapSampleLimit`
   - `maxOverlapChecks`

## Accessibility sanity checks

1. Validate contrast findings trigger for low-contrast text
2. Validate touch target findings trigger for small buttons
3. Validate missing form label findings trigger for unlabeled inputs
