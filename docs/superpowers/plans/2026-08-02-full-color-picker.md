# Full Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hue-only controls with a full solid-color picker that supports native visual selection, exact HEX entry, quick swatches, and a reusable saved-color palette for the QR frame and all three fare-strip segments.

**Architecture:** Keep the application dependency-free and move all color state to normalized uppercase `#RRGGBB` strings. Put conversion, validation, migration, and palette-ordering logic in pure exported helpers in `script.js`, then let the existing `initializeTicket()` function wire those helpers to the bottom-sheet controls and `localStorage`. Preserve the current ticket interactions and deploy through the existing GitHub Pages workflow after a service-worker cache bump.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, browser `localStorage`, Node.js `node:assert/strict` source/behavior tests, service worker, GitHub Pages Actions.

## Global Constraints

- Support fully opaque solid colors only; opacity is out of scope.
- Normalize every accepted color to uppercase six-digit HEX in the form `#RRGGBB`.
- Accept `#RRGGBB`, `RRGGBB`, `#RGB`, and `RGB`; reject all other text without changing the active target.
- Keep four independently persisted targets: QR frame, left strip, middle strip, and right strip.
- Keep the shared saved-color palette newest-first, deduplicated, and limited to 20 entries.
- Preserve current defaults exactly: QR `#FFD400`, left `#C96BE8`, middle `#D081EE`, right `#956F62`.
- Include quick swatches for black, white, light grey, dark grey, red, orange, yellow, green, blue, and purple.
- Reset only the active target; never clear the saved-color palette from Reset.
- Migrate existing hue values where possible and fall back to the target default when legacy data is invalid.
- Keep all controls keyboard accessible and comfortable on Android phone screens.
- Add no runtime dependencies and do not introduce real QR-code generation.

---

## File Map

- Modify `script.js`: replace hue state with HEX state; add pure color helpers, legacy migration, per-target persistence, swatch rendering, and picker synchronization.
- Modify `index.html:78-103`: replace the hue slider with native color input, HEX field, quick/saved swatch containers, validation text, Save color, Reset, and preview controls.
- Modify `styles.css:286-445`: replace hue-slider styling with responsive picker, swatch, error, and action styling while preserving the bottom-sheet shell.
- Create `tests/verify-color-picker.mjs`: behavior tests for normalization, conversion, migration inputs, palette ordering, deduplication, limits, defaults, and required UI wiring.
- Modify `tests/verify-ticket.mjs:61-104`: replace hue-specific assertions with full-picker, persistence, accessibility, and cache-version assertions.
- Modify `tests/verify-interactions.mjs:9-60`: keep interaction regressions but update target metadata and cache-version expectations.
- Modify `service-worker.js:1`: bump the cache from `ticket-pwa-v4` to `ticket-pwa-v5`.

---

### Task 1: Pure HEX Color Model, Legacy Conversion, and Palette Helpers

**Files:**
- Create: `tests/verify-color-picker.mjs`
- Modify: `script.js:1-70`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes: Existing target keys `qr`, `fareLeft`, `fareMiddle`, and `fareRight`.
- Produces: `COLOR_TARGETS`, `QUICK_COLORS`, `normalizeHexColor(value)`, `hslToHex(hue, saturation, lightness)`, `legacyHueToHex(targetKey, value)`, `normalizeSavedColors(values)`, and `addSavedColor(savedColors, color, limit)` exported through `module.exports`.

- [ ] **Step 1: Write the failing helper tests**

Create `tests/verify-color-picker.mjs` with:

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
assert.match(legacyHueToHex('fareLeft', '285'), /^#[0-9A-F]{6}$/);

assert.deepEqual(
  normalizeSavedColors(['#fff', '#808080', '#FFFFFF', 'bad', '#000']),
  ['#FFFFFF', '#808080', '#000000'],
);
assert.deepEqual(
  addSavedColor(['#FFFFFF', '#808080'], '#808080'),
  ['#808080', '#FFFFFF'],
);
assert.equal(
  addSavedColor(Array.from({ length: 20 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`), '#ABCDEF').length,
  20,
);
assert.equal(addSavedColor(['#FFFFFF'], 'bad'), ['#FFFFFF'].length);

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

console.log('Full color normalization, migration, and saved-palette helper checks passed.');
```

- [ ] **Step 2: Run the helper tests and verify RED**

Run:

```bash
node tests/verify-color-picker.mjs
```

Expected: FAIL because the new exports and HEX helpers do not exist yet.

- [ ] **Step 3: Replace hue target metadata and add pure helper implementations**

At the top of `script.js`, replace `DEFAULT_HUE`, `HUE_STORAGE_KEY`, hue metadata, `normalizeHue()`, and `colorForTarget()` with:

```js
const STARTING_SECONDS = 59 * 60 + 58;
const SAVED_COLORS_STORAGE_KEY = 'ticketSavedColors';
const MAX_SAVED_COLORS = 20;

const QUICK_COLORS = Object.freeze([
  '#000000',
  '#FFFFFF',
  '#D3D3D3',
  '#555555',
  '#FF3B30',
  '#FF9500',
  '#FFD60A',
  '#34C759',
  '#007AFF',
  '#AF52DE',
]);

const COLOR_TARGETS = Object.freeze({
  qr: Object.freeze({
    cssVariable: '--qr-color',
    storageKey: 'ticketQrColor',
    legacyStorageKey: 'ticketQrHue',
    legacySaturation: 100,
    legacyLightness: 50,
    defaultColor: '#FFD400',
    title: 'QR frame color',
  }),
  fareLeft: Object.freeze({
    cssVariable: '--fare-strip-purple',
    storageKey: 'ticketFareLeftColor',
    legacyStorageKey: 'ticketFareLeftHue',
    legacySaturation: 73,
    legacyLightness: 66,
    defaultColor: '#C96BE8',
    title: 'Left bar color',
  }),
  fareMiddle: Object.freeze({
    cssVariable: '--fare-strip-lilac',
    storageKey: 'ticketFareMiddleColor',
    legacyStorageKey: 'ticketFareMiddleHue',
    legacySaturation: 76,
    legacyLightness: 72,
    defaultColor: '#D081EE',
    title: 'Middle bar color',
  }),
  fareRight: Object.freeze({
    cssVariable: '--fare-strip-brown',
    storageKey: 'ticketFareRightColor',
    legacyStorageKey: 'ticketFareRightHue',
    legacySaturation: 21,
    legacyLightness: 48,
    defaultColor: '#956F62',
    title: 'Right bar color',
  }),
});

function normalizeHexColor(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.split('').map((character) => character.repeat(2)).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return null;
}

function hslToHex(hue, saturation, lightness) {
  const normalizedHue = ((Number(hue) % 360) + 360) % 360;
  const normalizedSaturation = Math.min(100, Math.max(0, Number(saturation))) / 100;
  const normalizedLightness = Math.min(100, Math.max(0, Number(lightness))) / 100;
  const chroma = (1 - Math.abs((2 * normalizedLightness) - 1)) * normalizedSaturation;
  const segment = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = normalizedLightness - (chroma / 2);
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (segment < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (segment < 3) [red, green, blue] = [0, chroma, secondary];
  else if (segment < 4) [red, green, blue] = [0, secondary, chroma];
  else if (segment < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
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
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = [];
  values.forEach((value) => {
    const color = normalizeHexColor(value);
    if (color && !normalized.includes(color)) {
      normalized.push(color);
    }
  });
  return normalized.slice(0, MAX_SAVED_COLORS);
}

function addSavedColor(savedColors, color, limit = MAX_SAVED_COLORS) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return normalizeSavedColors(savedColors).slice(0, limit);
  }
  return [
    normalizedColor,
    ...normalizeSavedColors(savedColors).filter((savedColor) => savedColor !== normalizedColor),
  ].slice(0, limit);
}
```

Update the CommonJS export block to:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COLOR_TARGETS,
    QUICK_COLORS,
    addSavedColor,
    calculateElapsedPercent,
    hslToHex,
    legacyHueToHex,
    nextZoneNumber,
    normalizeHexColor,
    normalizeSavedColors,
  };
}
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run:

```bash
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
```

Expected: `verify-color-picker.mjs` passes; `verify-interactions.mjs` may still fail only on old metadata/cache assertions that Task 4 will update, while zone and progress helper assertions remain valid.

- [ ] **Step 5: Commit Task 1**

```bash
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: add full color model helpers"
```

---

### Task 2: Full Picker Markup and Android-First Styling

**Files:**
- Modify: `index.html:78-103`
- Modify: `styles.css:286-445`
- Modify: `tests/verify-color-picker.mjs`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes: IDs read later by `initializeTicket()`.
- Produces: `colorPicker`, `hexColorInput`, `colorValidation`, `quickColors`, `savedColors`, `savedColorsEmpty`, `saveColor`, `colorPreview`, `colorValue`, `resetColor`, and `closeColorSheet` DOM elements.

- [ ] **Step 1: Add failing markup and CSS assertions**

Append to `tests/verify-color-picker.mjs` before the final `console.log`:

```js
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(html, /id="colorPicker"[^>]+type="color"/);
assert.match(html, /id="hexColorInput"[^>]+maxlength="7"/);
assert.match(html, /id="colorValidation"[^>]+aria-live="polite"/);
assert.match(html, /id="quickColors"/);
assert.match(html, /id="savedColors"/);
assert.match(html, /id="savedColorsEmpty"/);
assert.match(html, /id="saveColor"/);
assert.match(html, /id="colorPreview"/);
assert.match(html, /id="colorValue"[^>]+aria-live="polite"/);
assert.match(html, /id="resetColor"/);
assert.doesNotMatch(html, /id="hueSlider"/);
assert.doesNotMatch(html, /id="hueValue"/);

assert.match(css, /\.picker-fields\s*\{/);
assert.match(css, /\.color-swatches\s*\{[^}]*display:\s*grid/s);
assert.match(css, /\.color-swatch\[aria-pressed="true"\]/);
assert.match(css, /\.picker-validation\s*\{/);
assert.match(css, /\.picker-actions\s*\{/);
assert.match(css, /\.color-sheet\s*\{[^}]*max-height:\s*min\(88dvh,/s);
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node tests/verify-color-picker.mjs
```

Expected: FAIL on the missing full-picker markup.

- [ ] **Step 3: Replace the hue controls in `index.html`**

Replace the content between `.sheet-header` and the closing `</section>` of `#colorSheet` with:

```html
    <div class="picker-fields">
      <label class="picker-field picker-field--native" for="colorPicker">
        <span>Pick any color</span>
        <input id="colorPicker" type="color" value="#FFD400" />
      </label>

      <label class="picker-field" for="hexColorInput">
        <span>HEX color</span>
        <input
          id="hexColorInput"
          type="text"
          value="#FFD400"
          maxlength="7"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          aria-describedby="colorValidation"
        />
      </label>
    </div>

    <p class="picker-validation" id="colorValidation" aria-live="polite" hidden>
      Enter a 3- or 6-digit HEX color.
    </p>

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

Keep the existing sheet header and close button unchanged.

- [ ] **Step 4: Replace hue-slider CSS with full-picker CSS**

Delete `.hue-label`, all `#hueSlider` rules, `.sheet-footer`, and `#hueValue`. Add:

```css
.color-sheet {
  max-height: min(88dvh, 720px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.picker-fields {
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  gap: 12px;
  margin-top: 18px;
}

.picker-field {
  display: grid;
  gap: 7px;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
}

.picker-field input[type="text"] {
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 12px;
  border: 1px solid #c9c9cf;
  border-radius: 12px;
  background: #fff;
  color: #111;
  font: 700 17px/1 Arial, Helvetica, sans-serif;
  text-transform: uppercase;
}

.picker-field input[type="text"][aria-invalid="true"] {
  border-color: #d70015;
}

.picker-field--native input[type="color"] {
  width: 100%;
  height: 48px;
  padding: 4px;
  border: 1px solid #c9c9cf;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}

.picker-validation {
  margin: 8px 0 0;
  color: #b00020;
  font-size: 13px;
}

.picker-section {
  margin-top: 18px;
}

.picker-section h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
}

.picker-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.color-swatches {
  display: grid;
  grid-template-columns: repeat(5, minmax(42px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.color-swatch {
  min-width: 0;
  height: 44px;
  padding: 0;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  background: var(--swatch-color);
  cursor: pointer;
  touch-action: manipulation;
}

.color-swatch[aria-pressed="true"] {
  border-color: #111;
  box-shadow: 0 0 0 3px #fff, 0 0 0 5px #1594eb;
}

.color-swatch:focus-visible,
.save-color:focus-visible,
.reset-color:focus-visible {
  outline: 3px solid #1594eb;
  outline-offset: 2px;
}

.saved-colors-empty {
  margin: 9px 0 0;
  color: #666;
  font-size: 14px;
}

.save-color,
.reset-color {
  min-height: 42px;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  background: #fff;
  color: #111;
  font-weight: 700;
}

.save-color {
  padding: 8px 12px;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.color-preview {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: 50%;
  background: var(--active-picker-color);
}

#colorValue {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.reset-color {
  padding: 9px 14px;
}

@media (max-width: 390px) {
  .picker-fields {
    grid-template-columns: 1fr;
  }

  .color-swatches {
    grid-template-columns: repeat(5, minmax(38px, 1fr));
    gap: 8px;
  }
}
```

Keep the existing fixed sheet positioning, safe-area padding, handle, header, backdrop, and `[hidden]` rule.

- [ ] **Step 5: Run tests and verify GREEN**

```bash
node tests/verify-color-picker.mjs
```

Expected: PASS for helper, markup, and CSS assertions.

- [ ] **Step 6: Commit Task 2**

```bash
git add index.html styles.css tests/verify-color-picker.mjs
git commit -m "feat: add full color picker interface"
```

---

### Task 3: Per-Target Color Persistence, Saved Colors, and Picker Synchronization

**Files:**
- Modify: `script.js:110-335`
- Modify: `tests/verify-color-picker.mjs`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes: Pure helpers and DOM IDs from Tasks 1-2.
- Produces: Immediate color application, valid HEX synchronization, localStorage migration, quick swatches, saved swatches, Save color behavior, active-target Reset, and focus restoration.

- [ ] **Step 1: Add failing integration/source assertions**

Append before the test file's final `console.log`:

```js
assert.match(scriptText, /const\s+SAVED_COLORS_STORAGE_KEY\s*=\s*'ticketSavedColors'/);
assert.match(scriptText, /localStorage\.getItem\(target\.storageKey\)/);
assert.match(scriptText, /localStorage\.getItem\(target\.legacyStorageKey\)/);
assert.match(scriptText, /localStorage\.setItem\(target\.storageKey,\s*color\)/);
assert.match(scriptText, /JSON\.parse\(localStorage\.getItem\(SAVED_COLORS_STORAGE_KEY\)/);
assert.match(scriptText, /localStorage\.setItem\(SAVED_COLORS_STORAGE_KEY,\s*JSON\.stringify\(savedColors\)\)/);
assert.match(scriptText, /colorPicker\.addEventListener\('input'/);
assert.match(scriptText, /hexColorInput\.addEventListener\('input'/);
assert.match(scriptText, /saveColorButton\.addEventListener\('click'/);
assert.match(scriptText, /renderSwatches\(quickColorsContainer,\s*QUICK_COLORS/);
assert.match(scriptText, /renderSwatches\(savedColorsContainer,\s*savedColors/);
assert.match(scriptText, /applyColor\(activeColorTarget,\s*COLOR_TARGETS\[activeColorTarget\]\.defaultColor\)/);
assert.match(scriptText, /aria-pressed/);
assert.match(scriptText, /Enter a 3- or 6-digit HEX color\./);
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node tests/verify-color-picker.mjs
```

Expected: FAIL because browser integration still references hue controls and hue persistence.

- [ ] **Step 3: Replace hue DOM references and required-element guard**

Inside `initializeTicket()`, replace the hue references with:

```js
  const colorPicker = document.getElementById('colorPicker');
  const hexColorInput = document.getElementById('hexColorInput');
  const colorValidation = document.getElementById('colorValidation');
  const quickColorsContainer = document.getElementById('quickColors');
  const savedColorsContainer = document.getElementById('savedColors');
  const savedColorsEmpty = document.getElementById('savedColorsEmpty');
  const saveColorButton = document.getElementById('saveColor');
  const colorPreview = document.getElementById('colorPreview');
  const colorValue = document.getElementById('colorValue');
  const resetColor = document.getElementById('resetColor');
```

Require all of those elements in the existing missing-elements guard and remove `hueSlider` and `hueValue` from that guard.

- [ ] **Step 4: Replace hue state and persistence with HEX state and migration**

Use this state and storage logic inside `initializeTicket()`:

```js
  const currentColors = {};
  let savedColors = [];

  function readStoredColor(targetKey) {
    const target = COLOR_TARGETS[targetKey];
    try {
      const storedColor = normalizeHexColor(localStorage.getItem(target.storageKey));
      if (storedColor) {
        return storedColor;
      }

      const legacyHue = localStorage.getItem(target.legacyStorageKey);
      if (legacyHue !== null) {
        const migratedColor = legacyHueToHex(targetKey, legacyHue);
        localStorage.setItem(target.storageKey, migratedColor);
        return migratedColor;
      }
    } catch (error) {
      console.warn(`Unable to read the saved ${target.title.toLowerCase()}.`, error);
    }
    return target.defaultColor;
  }

  function saveTargetColor(targetKey, color) {
    try {
      localStorage.setItem(COLOR_TARGETS[targetKey].storageKey, color);
    } catch (error) {
      console.warn(`Unable to save the ${COLOR_TARGETS[targetKey].title.toLowerCase()}.`, error);
    }
  }

  function readSavedColors() {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_COLORS_STORAGE_KEY) || '[]');
      return normalizeSavedColors(stored);
    } catch (error) {
      console.warn('Unable to read saved colors.', error);
      return [];
    }
  }

  function persistSavedColors() {
    try {
      localStorage.setItem(SAVED_COLORS_STORAGE_KEY, JSON.stringify(savedColors));
    } catch (error) {
      console.warn('Unable to save the color palette.', error);
    }
  }
```

- [ ] **Step 5: Add picker synchronization, application, validation, and swatch rendering**

Replace `updateColorControls()` and `applyHue()` with:

```js
  function setValidationMessage(message = '') {
    const hasError = Boolean(message);
    colorValidation.textContent = message || 'Enter a 3- or 6-digit HEX color.';
    colorValidation.hidden = !hasError;
    hexColorInput.setAttribute('aria-invalid', String(hasError));
  }

  function updateSelectedSwatches() {
    document.querySelectorAll('.color-swatch').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.color === currentColors[activeColorTarget]));
    });
  }

  function updateColorControls(targetKey) {
    const color = currentColors[targetKey];
    colorPicker.value = color;
    hexColorInput.value = color;
    colorPreview.style.background = color;
    colorValue.textContent = color;
    colorSheetTitle.textContent = COLOR_TARGETS[targetKey].title;
    document.documentElement.style.setProperty('--active-picker-color', color);
    setValidationMessage();
    updateSelectedSwatches();
  }

  function applyColor(targetKey, value, { persist = true } = {}) {
    const color = normalizeHexColor(value);
    if (!COLOR_TARGETS[targetKey] || !color) {
      return false;
    }

    currentColors[targetKey] = color;
    document.documentElement.style.setProperty(COLOR_TARGETS[targetKey].cssVariable, color);
    if (targetKey === activeColorTarget) {
      updateColorControls(targetKey);
    }
    if (persist) {
      saveTargetColor(targetKey, color);
    }
    return true;
  }

  function renderSwatches(container, colors, labelPrefix) {
    container.replaceChildren();
    colors.forEach((color) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-swatch';
      button.dataset.color = color;
      button.style.setProperty('--swatch-color', color);
      button.setAttribute('aria-label', `${labelPrefix} ${color}`);
      button.setAttribute('aria-pressed', String(color === currentColors[activeColorTarget]));
      button.addEventListener('click', () => applyColor(activeColorTarget, color));
      container.append(button);
    });
  }

  function renderSavedColors() {
    renderSwatches(savedColorsContainer, savedColors, 'Apply saved color');
    savedColorsEmpty.hidden = savedColors.length > 0;
  }
```

- [ ] **Step 6: Initialize migrated colors and render palettes**

Replace the `currentHues` initialization loop with:

```js
  Object.keys(COLOR_TARGETS).forEach((targetKey) => {
    currentColors[targetKey] = readStoredColor(targetKey);
    applyColor(targetKey, currentColors[targetKey], { persist: false });
  });

  savedColors = readSavedColors();
  renderSwatches(quickColorsContainer, QUICK_COLORS, 'Apply quick color');
  renderSavedColors();
```

Keep fare-strip creation immediately after this initialization.

- [ ] **Step 7: Replace hue event listeners with full-picker events**

Replace the hue slider and reset listeners with:

```js
  colorPicker.addEventListener('input', () => {
    applyColor(activeColorTarget, colorPicker.value);
  });

  hexColorInput.addEventListener('input', () => {
    const color = normalizeHexColor(hexColorInput.value);
    if (!color) {
      setValidationMessage('Enter a 3- or 6-digit HEX color.');
      return;
    }
    setValidationMessage();
    applyColor(activeColorTarget, color);
  });

  hexColorInput.addEventListener('blur', () => {
    hexColorInput.value = currentColors[activeColorTarget];
    setValidationMessage();
  });

  saveColorButton.addEventListener('click', () => {
    savedColors = addSavedColor(savedColors, currentColors[activeColorTarget]);
    persistSavedColors();
    renderSavedColors();
    updateSelectedSwatches();
  });

  resetColor.addEventListener('click', () => {
    applyColor(activeColorTarget, COLOR_TARGETS[activeColorTarget].defaultColor);
  });
```

In `openColorSheet()`, focus `colorPicker` instead of `hueSlider`.

- [ ] **Step 8: Run behavior and regression tests**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
```

Expected: syntax and full-picker tests pass. Interaction tests may still fail only on old target metadata/cache assertions updated in Task 4.

- [ ] **Step 9: Commit Task 3**

```bash
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: persist full colors and saved palettes"
```

---

### Task 4: Regression Assertions, Cache Refresh, and Deployment Verification

**Files:**
- Modify: `tests/verify-ticket.mjs:61-104`
- Modify: `tests/verify-interactions.mjs:9-60`
- Modify: `service-worker.js:1`
- Test: `tests/verify-ticket.mjs`, `tests/verify-interactions.mjs`, `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes: Completed full-picker implementation.
- Produces: Updated PWA cache, clean regression suite, and a push that triggers the existing Pages workflow.

- [ ] **Step 1: Update the PWA cache version**

Change the first line of `service-worker.js` to:

```js
const CACHE_NAME = 'ticket-pwa-v5';
```

- [ ] **Step 2: Replace hue-specific assertions in `tests/verify-ticket.mjs`**

Replace the old `ticket-pwa-v4`, `hueSlider`, `hueValue`, hue storage, and HSL assertions with:

```js
assert.match(serviceWorker, /ticket-pwa-v5/, 'PWA cache must be bumped for the full color picker');
assert.match(html, /id="colorPicker"[^>]+type="color"/, 'native full color input is required');
assert.match(html, /id="hexColorInput"/, 'HEX input is required');
assert.match(html, /id="quickColors"/, 'quick-color container is required');
assert.match(html, /id="savedColors"/, 'saved-color container is required');
assert.match(html, /id="saveColor"/, 'save-color button is required');
assert.match(html, /id="colorValidation"[^>]+aria-live="polite"/, 'inline validation announcement is required');
assert.match(html, /id="colorValue"[^>]+aria-live="polite"/, 'selected color announcement is required');
assert.match(js, /const\s+SAVED_COLORS_STORAGE_KEY\s*=\s*'ticketSavedColors'/, 'saved palette storage key is required');
assert.match(js, /ticketQrColor/, 'QR HEX storage key is required');
assert.match(js, /ticketFareLeftColor/, 'left strip HEX storage key is required');
assert.match(js, /ticketFareMiddleColor/, 'middle strip HEX storage key is required');
assert.match(js, /ticketFareRightColor/, 'right strip HEX storage key is required');
assert.match(js, /ticketQrHue/, 'legacy QR hue migration key is required');
assert.match(js, /event\.key\s*===\s*'Escape'/, 'Escape must close the sheet');
assert.match(js, /activeColorTrigger\.focus\(\)/, 'focus must return to the opening control');
```

Keep the manifest, offline shell, QR safety, timer direction, responsive layout, and fare-strip assertions unchanged.

- [ ] **Step 3: Update `tests/verify-interactions.mjs` metadata and cache assertions**

Change the target persistence assertion to:

```js
assert.deepEqual(
  stripTargets.map((key) => COLOR_TARGETS[key].storageKey),
  ['ticketFareLeftColor', 'ticketFareMiddleColor', 'ticketFareRightColor'],
  'each fare-strip section must persist its own HEX color',
);
```

Add:

```js
assert.deepEqual(
  stripTargets.map((key) => COLOR_TARGETS[key].defaultColor),
  ['#C96BE8', '#D081EE', '#956F62'],
  'fare-strip visual defaults must remain unchanged',
);
```

Change the service-worker assertion to:

```js
assert.match(serviceWorker, /ticket-pwa-v5/, 'the service-worker cache must be bumped for the full color picker');
```

Keep zone increment, fare-strip click targets, and left-to-right progress assertions unchanged.

- [ ] **Step 4: Run the complete verification suite**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
```

Expected: all commands exit with status 0 and print their success messages.

- [ ] **Step 5: Review the final diff against the approved specification**

Run:

```bash
git diff main...HEAD -- index.html styles.css script.js service-worker.js tests/verify-color-picker.mjs tests/verify-interactions.mjs tests/verify-ticket.mjs
```

Confirm:

- Grey, black, white, muted, and bright colors are accepted.
- Native picker, HEX input, quick swatches, saved swatches, preview, Save color, Reset, and close controls are present.
- All four targets persist independently.
- Saved colors are shared, newest-first, deduplicated, and capped at 20.
- Invalid HEX does not change the active target.
- Legacy hue values migrate.
- Existing zone, timer, QR safety, and fare-strip interactions remain intact.

- [ ] **Step 6: Commit Task 4**

```bash
git add service-worker.js tests/verify-ticket.mjs tests/verify-interactions.mjs
git commit -m "test: verify full color picker deployment"
```

- [ ] **Step 7: Push, open a pull request, and deploy**

```bash
git push -u origin fix/full-color-picker
```

Open a pull request from `fix/full-color-picker` into `main` with:

```markdown
## What changed
- replaced the hue-only slider with a native full-color picker and exact HEX input
- added quick colors including grey, black, and white
- added a reusable, persisted saved-color palette
- kept independent colors for the QR frame and all three fare-strip segments
- migrated existing hue preferences where possible
- bumped the PWA cache to v5

## Verification
- `node --check script.js`
- `node tests/verify-color-picker.mjs`
- `node tests/verify-interactions.mjs`
- `node tests/verify-ticket.mjs`
```

After review, squash-merge the pull request. Confirm the GitHub Pages workflow triggered on the resulting `main` commit and verify the public URL loads the updated picker:

```text
https://puranjayyadav.github.io/ticket/
```
