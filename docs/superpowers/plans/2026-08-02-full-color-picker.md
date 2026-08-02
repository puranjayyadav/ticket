# Full Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hue-only controls with a full solid-color picker that supports Android’s native picker, exact HEX entry, quick swatches, and a reusable saved-color palette for the QR frame and all three fare-strip segments.

**Architecture:** Store all active and saved colors as normalized uppercase `#RRGGBB` strings. Export pure validation, conversion, migration, and palette helpers from `script.js` for Node tests; keep browser DOM wiring inside `initializeTicket()`. Continue using the existing bottom sheet, `localStorage`, service worker, and GitHub Pages workflow.

**Tech Stack:** HTML, CSS, vanilla JavaScript, browser `localStorage`, Node.js `node:assert/strict`, service worker, GitHub Pages Actions.

## Global Constraints

- Fully opaque solid colors only; no alpha channel.
- Accept `#RRGGBB`, `RRGGBB`, `#RGB`, and `RGB`; normalize to uppercase `#RRGGBB`.
- Invalid HEX text must leave the last valid color applied.
- Persist four independent targets: QR, left strip, middle strip, right strip.
- Preserve defaults: `#FFD400`, `#C96BE8`, `#D081EE`, `#956F62`.
- Share saved colors across all targets, newest-first, deduplicated, maximum 20.
- Include black, white, light grey, dark grey, red, orange, yellow, green, blue, and purple quick swatches.
- Reset only the active target and never remove saved colors.
- Migrate legacy hue values where possible.
- Keep the UI accessible and usable on Android phone widths.
- Add no runtime dependencies and do not create a real scannable QR code.

## File Map

- Modify `script.js`: HEX model, conversion, migration, persistence, swatches, picker synchronization.
- Modify `index.html:78-103`: full picker controls and saved-color container.
- Modify `styles.css:286-445`: responsive picker and swatch styling.
- Create `tests/verify-color-picker.mjs`: helper and source-level picker tests.
- Modify `tests/verify-ticket.mjs:61-104`: replace hue assertions and expect cache v5.
- Modify `tests/verify-interactions.mjs:9-60`: expect HEX metadata and cache v5.
- Modify `service-worker.js:1`: `ticket-pwa-v5`.

---

### Task 1: HEX Helpers, Defaults, Migration, and Saved-Palette Rules

**Files:**
- Create: `tests/verify-color-picker.mjs`
- Modify: `script.js:1-70`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Produces: `COLOR_TARGETS`, `QUICK_COLORS`, `normalizeHexColor`, `hslToHex`, `legacyHueToHex`, `normalizeSavedColors`, and `addSavedColor`.

- [ ] **Step 1: Write the failing tests**

Create `tests/verify-color-picker.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const scriptText = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const {
  COLOR_TARGETS,
  QUICK_COLORS,
  addSavedColor,
  hslToHex,
  legacyHueToHex,
  normalizeHexColor,
  normalizeSavedColors,
} = require('../script.js');

assert.equal(normalizeHexColor('#808080'), '#808080');
assert.equal(normalizeHexColor('808080'), '#808080');
assert.equal(normalizeHexColor('#abc'), '#AABBCC');
assert.equal(normalizeHexColor('AbC'), '#AABBCC');
assert.equal(normalizeHexColor('#000000'), '#000000');
assert.equal(normalizeHexColor('#ffffff'), '#FFFFFF');
assert.equal(normalizeHexColor('#12'), null);
assert.equal(normalizeHexColor('#12345G'), null);
assert.equal(normalizeHexColor('rgb(1, 2, 3)'), null);

assert.equal(hslToHex(0, 0, 50), '#808080');
assert.equal(hslToHex(0, 100, 50), '#FF0000');
assert.equal(hslToHex(120, 100, 50), '#00FF00');
assert.equal(hslToHex(240, 100, 50), '#0000FF');
assert.equal(legacyHueToHex('qr', 'invalid'), '#FFD400');
assert.match(legacyHueToHex('qr', '48'), /^#[0-9A-F]{6}$/);

assert.deepEqual(
  normalizeSavedColors(['#fff', '#808080', '#FFFFFF', 'bad', '#000']),
  ['#FFFFFF', '#808080', '#000000'],
);
assert.deepEqual(
  addSavedColor(['#FFFFFF', '#808080'], '#808080'),
  ['#808080', '#FFFFFF'],
);
assert.deepEqual(addSavedColor(['#FFFFFF'], 'bad'), ['#FFFFFF']);
assert.equal(
  addSavedColor(
    Array.from({ length: 20 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`),
    '#ABCDEF',
  ).length,
  20,
);

assert.deepEqual(
  Object.fromEntries(Object.entries(COLOR_TARGETS).map(([key, target]) => [key, target.defaultColor])),
  {
    qr: '#FFD400',
    fareLeft: '#C96BE8',
    fareMiddle: '#D081EE',
    fareRight: '#956F62',
  },
);
assert.deepEqual(
  QUICK_COLORS,
  ['#000000', '#FFFFFF', '#D3D3D3', '#555555', '#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#AF52DE'],
);
assert.match(scriptText, /module\.exports\s*=\s*\{[^}]*normalizeHexColor[^}]*addSavedColor/s);

console.log('Full color helper checks passed.');
```

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-color-picker.mjs
```

Expected: FAIL because the HEX helpers do not exist.

- [ ] **Step 3: Implement the pure model in `script.js`**

Replace hue constants/metadata with:

```js
const STARTING_SECONDS = 59 * 60 + 58;
const SAVED_COLORS_STORAGE_KEY = 'ticketSavedColors';
const MAX_SAVED_COLORS = 20;
const QUICK_COLORS = Object.freeze([
  '#000000', '#FFFFFF', '#D3D3D3', '#555555', '#FF3B30',
  '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#AF52DE',
]);

const COLOR_TARGETS = Object.freeze({
  qr: Object.freeze({ cssVariable: '--qr-color', storageKey: 'ticketQrColor', legacyStorageKey: 'ticketQrHue', legacySaturation: 100, legacyLightness: 50, defaultColor: '#FFD400', title: 'QR frame color' }),
  fareLeft: Object.freeze({ cssVariable: '--fare-strip-purple', storageKey: 'ticketFareLeftColor', legacyStorageKey: 'ticketFareLeftHue', legacySaturation: 73, legacyLightness: 66, defaultColor: '#C96BE8', title: 'Left bar color' }),
  fareMiddle: Object.freeze({ cssVariable: '--fare-strip-lilac', storageKey: 'ticketFareMiddleColor', legacyStorageKey: 'ticketFareMiddleHue', legacySaturation: 76, legacyLightness: 72, defaultColor: '#D081EE', title: 'Middle bar color' }),
  fareRight: Object.freeze({ cssVariable: '--fare-strip-brown', storageKey: 'ticketFareRightColor', legacyStorageKey: 'ticketFareRightHue', legacySaturation: 21, legacyLightness: 48, defaultColor: '#956F62', title: 'Right bar color' }),
});
```

Add:

```js
function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((character) => character.repeat(2)).join('').toUpperCase()}`;
  }
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : null;
}

function hslToHex(hue, saturation, lightness) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = Math.min(100, Math.max(0, Number(saturation))) / 100;
  const l = Math.min(100, Math.max(0, Number(lightness))) / 100;
  const c = (1 - Math.abs((2 * l) - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - (c / 2);
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return `#${rgb.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function legacyHueToHex(targetKey, value) {
  const target = COLOR_TARGETS[targetKey];
  const hue = Number(value);
  if (!target || !Number.isFinite(hue) || hue < 0 || hue > 360) {
    return target ? target.defaultColor : null;
  }
  return hslToHex(hue, target.legacySaturation, target.legacyLightness);
}

function normalizeSavedColors(values) {
  if (!Array.isArray(values)) return [];
  const result = [];
  values.forEach((value) => {
    const color = normalizeHexColor(value);
    if (color && !result.includes(color)) result.push(color);
  });
  return result.slice(0, MAX_SAVED_COLORS);
}

function addSavedColor(savedColors, value, limit = MAX_SAVED_COLORS) {
  const color = normalizeHexColor(value);
  const normalized = normalizeSavedColors(savedColors);
  if (!color) return normalized.slice(0, limit);
  return [color, ...normalized.filter((saved) => saved !== color)].slice(0, limit);
}
```

Export these helpers with the existing zone/timer helpers.

- [ ] **Step 4: Verify GREEN and commit**

```bash
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: add full color model helpers"
```

---

### Task 2: Picker Markup and Android-First Styling

**Files:**
- Modify: `index.html:78-103`
- Modify: `styles.css:286-445`
- Modify: `tests/verify-color-picker.mjs`

**Interfaces:**
- Produces DOM IDs: `colorPicker`, `hexColorInput`, `colorValidation`, `quickColors`, `savedColors`, `savedColorsEmpty`, `saveColor`, `colorPreview`, `colorValue`, `resetColor`.

- [ ] **Step 1: Add failing source assertions**

Append assertions for all IDs above, `type="color"`, `maxlength="7"`, `aria-live="polite"`, `.color-swatches`, `.color-swatch[aria-pressed="true"]`, and the absence of `hueSlider`/`hueValue`.

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-color-picker.mjs
```

- [ ] **Step 3: Replace hue markup**

Use this body beneath the existing sheet header:

```html
<div class="picker-fields">
  <label class="picker-field picker-field--native" for="colorPicker">
    <span>Pick any color</span>
    <input id="colorPicker" type="color" value="#FFD400" />
  </label>
  <label class="picker-field" for="hexColorInput">
    <span>HEX color</span>
    <input id="hexColorInput" type="text" value="#FFD400" maxlength="7" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="colorValidation" />
  </label>
</div>
<p class="picker-validation" id="colorValidation" aria-live="polite" hidden>Enter a 3- or 6-digit HEX color.</p>
<section class="picker-section" aria-labelledby="quickColorsTitle">
  <h3 id="quickColorsTitle">Quick colors</h3>
  <div class="color-swatches" id="quickColors"></div>
</section>
<section class="picker-section" aria-labelledby="savedColorsTitle">
  <div class="picker-section__heading">
    <h3 id="savedColorsTitle">Saved colors</h3>
    <button class="save-color" id="saveColor" type="button">Save color</button>
  </div>
  <p class="saved-colors-empty" id="savedColorsEmpty">No saved colors yet.</p>
  <div class="color-swatches" id="savedColors"></div>
</section>
<div class="picker-actions">
  <span class="color-preview" id="colorPreview" aria-hidden="true"></span>
  <output id="colorValue" for="colorPicker hexColorInput" aria-live="polite">#FFD400</output>
  <button class="reset-color" id="resetColor" type="button">Reset</button>
</div>
```

- [ ] **Step 4: Replace hue CSS**

Keep the sheet shell, then add responsive grid fields, a 48px native color input and HEX input, a five-column swatch grid, 44px swatches, visible light-color borders, selected `aria-pressed` ring, validation text, Save/Reset buttons, and `max-height: min(88dvh, 720px); overflow-y: auto;`. At `max-width: 390px`, stack the picker fields into one column.

- [ ] **Step 5: Verify and commit**

```bash
node tests/verify-color-picker.mjs
git add index.html styles.css tests/verify-color-picker.mjs
git commit -m "feat: add full color picker interface"
```

---

### Task 3: Browser State, Persistence, Swatches, and Validation

**Files:**
- Modify: `script.js:110-335`
- Modify: `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes helpers and Task 2 DOM IDs.
- Produces immediate application, legacy migration, saved palette, active-target Reset, and focus restoration.

- [ ] **Step 1: Add failing source assertions**

Assert that `script.js` reads/writes each target’s new storage key, reads legacy keys, parses/stringifies `ticketSavedColors`, listens to `colorPicker`, `hexColorInput`, and `saveColor`, renders both swatch containers, uses `aria-pressed`, and resets with `defaultColor`.

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-color-picker.mjs
```

- [ ] **Step 3: Replace hue DOM/state with color DOM/state**

Inside `initializeTicket()`, query the Task 2 IDs, require them in the missing-element guard, and use:

```js
const currentColors = {};
let savedColors = [];
```

Implement `readStoredColor(targetKey)` to prefer a normalized new HEX value, otherwise convert `legacyStorageKey` with `legacyHueToHex`, persist the migrated HEX value, and otherwise return `defaultColor`.

Implement `readSavedColors()` with:

```js
const stored = JSON.parse(localStorage.getItem(SAVED_COLORS_STORAGE_KEY) || '[]');
return normalizeSavedColors(stored);
```

Storage exceptions must log warnings and return safe defaults.

- [ ] **Step 4: Implement UI synchronization and application**

Add:

```js
function applyColor(targetKey, value, { persist = true } = {}) {
  const color = normalizeHexColor(value);
  if (!COLOR_TARGETS[targetKey] || !color) return false;
  currentColors[targetKey] = color;
  document.documentElement.style.setProperty(COLOR_TARGETS[targetKey].cssVariable, color);
  if (persist) localStorage.setItem(COLOR_TARGETS[targetKey].storageKey, color);
  if (targetKey === activeColorTarget) updateColorControls(targetKey);
  return true;
}
```

`updateColorControls()` must synchronize native input, HEX input, preview, output text, sheet title, `--active-picker-color`, validation state, and every swatch’s `aria-pressed` value.

`renderSwatches(container, colors, labelPrefix)` must create real buttons with `dataset.color`, `--swatch-color`, accessible labels containing the HEX value, click-to-apply behavior, and selected state.

- [ ] **Step 5: Wire events**

- Native picker `input`: apply immediately.
- HEX `input`: apply only when normalization succeeds; otherwise show `Enter a 3- or 6-digit HEX color.` and preserve the previous color.
- HEX `blur`: restore the last valid normalized value.
- Save color: `savedColors = addSavedColor(savedColors, currentColors[activeColorTarget])`, persist JSON, rerender.
- Reset: apply only `COLOR_TARGETS[activeColorTarget].defaultColor`.
- Open sheet: focus `colorPicker`.
- Close sheet: keep existing focus return to the trigger.

- [ ] **Step 6: Verify and commit**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: persist full colors and saved palettes"
```

---

### Task 4: Regression Suite, Cache v5, PR, and Pages Deployment

**Files:**
- Modify: `service-worker.js:1`
- Modify: `tests/verify-ticket.mjs:61-104`
- Modify: `tests/verify-interactions.mjs:9-60`

**Interfaces:**
- Produces a clean test suite and deployable `main` commit.

- [ ] **Step 1: Bump the cache**

```js
const CACHE_NAME = 'ticket-pwa-v5';
```

- [ ] **Step 2: Update regressions**

In `verify-ticket.mjs`, replace hue assertions with assertions for `colorPicker`, `hexColorInput`, `quickColors`, `savedColors`, `saveColor`, `colorValidation`, `colorValue`, all four new HEX storage keys, the legacy QR hue key, focus restoration, and `ticket-pwa-v5`.

In `verify-interactions.mjs`, expect strip storage keys:

```js
['ticketFareLeftColor', 'ticketFareMiddleColor', 'ticketFareRightColor']
```

and strip defaults:

```js
['#C96BE8', '#D081EE', '#956F62']
```

Keep zone increment, three strip buttons, and left-to-right progress assertions unchanged. Expect `ticket-pwa-v5`.

- [ ] **Step 3: Run complete verification**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
```

Expected: all four commands exit 0.

- [ ] **Step 4: Commit, review, and deploy**

```bash
git add service-worker.js tests/verify-ticket.mjs tests/verify-interactions.mjs
git commit -m "test: verify full color picker deployment"
git push -u origin fix/full-color-picker
```

Open a PR into `main`, include all four verification commands, review the final diff against the approved design, squash-merge, and confirm the existing Pages workflow deploys:

```text
https://puranjayyadav.github.io/ticket/
```
