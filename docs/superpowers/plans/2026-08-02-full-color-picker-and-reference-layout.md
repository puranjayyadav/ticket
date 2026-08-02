# Full Color Picker and Reference Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete saved-color picker and align the ticket demo with the supplied reference image, excluding the `1 Sr/Dis*` and `*ID REQUIRED` lines and retaining `1 Adult`.

**Architecture:** Store all editable colors as normalized uppercase `#RRGGBB` strings and expose pure color helpers for Node tests. Keep DOM behavior inside `initializeTicket()`, split QR enlargement from QR-frame color editing, and use CSS variables for the sampled reference colors. Preserve the existing static/PWA architecture, non-scannable QR-style artwork, service worker, and GitHub Pages deployment.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, `localStorage`, native `<input type="color">`, native `<dialog>` with hidden-modal fallback, Node.js `node:assert/strict`, service worker, GitHub Pages Actions.

## Global Constraints

- The page must remain visibly marked `DEMO` and must not contain a real scannable transit QR code.
- Fully opaque solid colors only; no alpha channel.
- Accept `#RRGGBB`, `RRGGBB`, `#RGB`, and `RGB`; normalize to uppercase `#RRGGBB`.
- Invalid HEX input must leave the last valid color applied.
- Persist four independent targets: QR frame, left strip, middle strip, right strip.
- Use reset defaults sampled from the reference: QR `#808080`, left `#56E7BE`, middle `#598B7F`, right `#A9933E`.
- Use reference layout colors: blue panel `#1C87D9`, progress `#BBD9F1`, progress dot `#4D82C4`, page background `#F7F7F7`.
- Share saved colors across all four targets, newest-first, deduplicated, maximum 20.
- Include black, white, light grey, dark grey, red, orange, yellow, green, blue, and purple quick swatches.
- Reset only the active target and never clear saved colors.
- Migrate legacy hue values where possible.
- Main QR tap enlarges the QR; QR-frame editing is accessed from the enlargement dialog.
- Use `INTRASTATE`, starting zone `1`, `ZONE RIDE`, and `1 Adult`.
- Do not add `1 Sr/Dis*` or `*ID REQUIRED`.
- Initial countdown is `29:55`; progress continues left-to-right.
- Keep controls keyboard-accessible and usable from 320 px through large Android phone widths.
- Do not recreate phone status bars or gesture-navigation chrome.
- Add no runtime dependencies.

## File Map

- Modify `index.html`: header/back/demo structure, QR caption, enlargement dialog, full color-picker controls.
- Modify `styles.css`: reference geometry, sampled colors, responsive card/QR/status styling, picker and dialog styling.
- Modify `script.js`: HEX model, migration, persistence, saved palette, picker synchronization, QR dialog, back control, 29:55 timer.
- Create `tests/verify-color-picker.mjs`: pure color and saved-palette tests.
- Create `tests/verify-reference-layout.mjs`: reference structure/content/CSS/source assertions.
- Modify `tests/verify-ticket.mjs`: replace hue-only assertions and retain PWA/QR-safety checks.
- Modify `tests/verify-interactions.mjs`: retain increment/progress/strip tests and update defaults/cache assertions.
- Modify `service-worker.js`: bump cache to `ticket-pwa-v5`.

---

### Task 1: HEX Color Model, Sampled Defaults, Migration, and Saved Palette

**Files:**
- Create: `tests/verify-color-picker.mjs`
- Modify: `script.js:1-110`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Produces `COLOR_TARGETS`, `QUICK_COLORS`, `normalizeHexColor(value)`, `hslToHex(hue, saturation, lightness)`, `legacyHueToHex(targetKey, value)`, `normalizeSavedColors(values)`, and `addSavedColor(savedColors, value, limit)`.

- [ ] **Step 1: Write the failing helper test**

Create `tests/verify-color-picker.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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
assert.equal(normalizeHexColor('#000'), '#000000');
assert.equal(normalizeHexColor('#fff'), '#FFFFFF');
assert.equal(normalizeHexColor('#12'), null);
assert.equal(normalizeHexColor('#12345G'), null);
assert.equal(normalizeHexColor('rgb(1,2,3)'), null);

assert.equal(hslToHex(0, 0, 50), '#808080');
assert.equal(hslToHex(0, 100, 50), '#FF0000');
assert.equal(hslToHex(120, 100, 50), '#00FF00');
assert.equal(hslToHex(240, 100, 50), '#0000FF');
assert.equal(legacyHueToHex('qr', 'invalid'), '#808080');
assert.match(legacyHueToHex('fareLeft', '285'), /^#[0-9A-F]{6}$/);

assert.deepEqual(
  Object.fromEntries(Object.entries(COLOR_TARGETS).map(([key, target]) => [key, target.defaultColor])),
  {
    qr: '#808080',
    fareLeft: '#56E7BE',
    fareMiddle: '#598B7F',
    fareRight: '#A9933E',
  },
);

assert.deepEqual(
  QUICK_COLORS,
  ['#000000', '#FFFFFF', '#D3D3D3', '#555555', '#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#AF52DE'],
);

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

console.log('Full color helper checks passed.');
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node tests/verify-color-picker.mjs
```

Expected: FAIL because the HEX helpers and new defaults do not exist.

- [ ] **Step 3: Replace hue metadata with HEX metadata**

Use:

```js
const STARTING_SECONDS = (29 * 60) + 55;
const SAVED_COLORS_STORAGE_KEY = 'ticketSavedColors';
const MAX_SAVED_COLORS = 20;

const QUICK_COLORS = Object.freeze([
  '#000000', '#FFFFFF', '#D3D3D3', '#555555', '#FF3B30',
  '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#AF52DE',
]);

const COLOR_TARGETS = Object.freeze({
  qr: Object.freeze({
    cssVariable: '--qr-color',
    storageKey: 'ticketQrColor',
    legacyStorageKey: 'ticketQrHue',
    legacySaturation: 100,
    legacyLightness: 50,
    defaultColor: '#808080',
    title: 'QR frame color',
  }),
  fareLeft: Object.freeze({
    cssVariable: '--fare-strip-left',
    storageKey: 'ticketFareLeftColor',
    legacyStorageKey: 'ticketFareLeftHue',
    legacySaturation: 73,
    legacyLightness: 66,
    defaultColor: '#56E7BE',
    title: 'Left bar color',
  }),
  fareMiddle: Object.freeze({
    cssVariable: '--fare-strip-middle',
    storageKey: 'ticketFareMiddleColor',
    legacyStorageKey: 'ticketFareMiddleHue',
    legacySaturation: 76,
    legacyLightness: 72,
    defaultColor: '#598B7F',
    title: 'Middle bar color',
  }),
  fareRight: Object.freeze({
    cssVariable: '--fare-strip-right',
    storageKey: 'ticketFareRightColor',
    legacyStorageKey: 'ticketFareRightHue',
    legacySaturation: 21,
    legacyLightness: 48,
    defaultColor: '#A9933E',
    title: 'Right bar color',
  }),
});
```

Implement strict HEX normalization, HSL-to-HEX conversion, legacy conversion, saved-color normalization, and newest-first insertion exactly as asserted by the test. Export all helpers with `module.exports` alongside `nextZoneNumber` and `calculateElapsedPercent`.

- [ ] **Step 4: Verify GREEN**

```bash
node tests/verify-color-picker.mjs
node --check script.js
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit Task 1**

```bash
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: add sampled full color model"
```

---

### Task 2: Full Picker Markup and Mobile Styling

**Files:**
- Modify: `index.html:78-103`
- Modify: `styles.css:286-445`
- Modify: `tests/verify-color-picker.mjs`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Produces DOM IDs `colorPicker`, `hexColorInput`, `colorValidation`, `quickColors`, `savedColors`, `savedColorsEmpty`, `saveColor`, `colorPreview`, `colorValue`, and `resetColor`.

- [ ] **Step 1: Add failing source assertions**

Append to `tests/verify-color-picker.mjs`:

```js
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(html, /id="colorPicker"[^>]+type="color"/);
assert.match(html, /id="hexColorInput"[^>]+maxlength="7"/);
assert.match(html, /id="colorValidation"[^>]+aria-live="polite"/);
assert.match(html, /id="quickColors"/);
assert.match(html, /id="savedColors"/);
assert.match(html, /id="savedColorsEmpty"/);
assert.match(html, /id="saveColor"/);
assert.match(html, /id="colorValue"[^>]+aria-live="polite"/);
assert.doesNotMatch(html, /id="hueSlider"/);
assert.doesNotMatch(html, /id="hueValue"/);
assert.match(css, /\.picker-fields\s*\{[^}]*display:\s*grid/s);
assert.match(css, /\.color-swatches\s*\{[^}]*display:\s*grid/s);
assert.match(css, /\.color-swatch\[aria-pressed="true"\]/);
assert.match(css, /max-height:\s*min\(88dvh,\s*720px\)/);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-color-picker.mjs
```

- [ ] **Step 3: Replace the hue slider markup**

Insert beneath the picker sheet header:

```html
<div class="picker-fields">
  <label class="picker-field picker-field--native" for="colorPicker">
    <span>Pick any color</span>
    <input id="colorPicker" type="color" value="#808080" />
  </label>
  <label class="picker-field" for="hexColorInput">
    <span>HEX color</span>
    <input id="hexColorInput" type="text" value="#808080" maxlength="7"
      autocomplete="off" autocapitalize="characters" spellcheck="false"
      aria-describedby="colorValidation" />
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
  <output id="colorValue" for="colorPicker hexColorInput" aria-live="polite">#808080</output>
  <button class="reset-color" id="resetColor" type="button">Reset</button>
</div>
```

- [ ] **Step 4: Add exact picker CSS**

Use these minimum geometry rules:

```css
.color-sheet {
  max-height: min(88dvh, 720px);
  overflow-y: auto;
}

.picker-fields {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 14px;
  margin-top: 18px;
}

.picker-field {
  display: grid;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
}

#colorPicker,
#hexColorInput {
  width: 100%;
  min-height: 48px;
  border: 1px solid #D2D2D7;
  border-radius: 12px;
  background: #FFFFFF;
}

.color-swatches {
  display: grid;
  grid-template-columns: repeat(5, minmax(44px, 1fr));
  gap: 10px;
}

.color-swatch {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid rgba(0, 0, 0, 0.24);
  border-radius: 12px;
}

.color-swatch[aria-pressed="true"] {
  outline: 3px solid #1C87D9;
  outline-offset: 2px;
}

@media (max-width: 390px) {
  .picker-fields { grid-template-columns: 1fr; }
}
```

Add specific styles for `.picker-validation`, `.picker-section`, `.picker-section__heading`, `.saved-colors-empty`, `.save-color`, and `.picker-actions`; keep every action at least 44 px tall.

- [ ] **Step 5: Verify and commit**

```bash
node tests/verify-color-picker.mjs
git add index.html styles.css tests/verify-color-picker.mjs
git commit -m "feat: add complete color picker interface"
```

---

### Task 3: Picker State, Persistence, Swatches, and Validation

**Files:**
- Modify: `script.js:110-380`
- Modify: `tests/verify-color-picker.mjs`
- Test: `tests/verify-color-picker.mjs`

**Interfaces:**
- Consumes Task 1 helpers and Task 2 DOM IDs.
- Produces immediate color application, four-target persistence, legacy migration, shared saved colors, active-target reset, and focus restoration.

- [ ] **Step 1: Add failing source assertions**

Append assertions that `script.js`:

```js
assert.match(scriptText, /ticketSavedColors/);
assert.match(scriptText, /localStorage\.getItem\(target\.storageKey\)/);
assert.match(scriptText, /localStorage\.getItem\(target\.legacyStorageKey\)/);
assert.match(scriptText, /colorPicker\.addEventListener\('input'/);
assert.match(scriptText, /hexColorInput\.addEventListener\('input'/);
assert.match(scriptText, /saveColor\.addEventListener\('click'/);
assert.match(scriptText, /aria-pressed/);
assert.match(scriptText, /target\.defaultColor/);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-color-picker.mjs
```

- [ ] **Step 3: Replace hue state with HEX state**

Inside `initializeTicket()` use:

```js
const currentColors = {};
let savedColors = [];
let activeColorTarget = 'qr';
let activeColorTrigger = null;
```

Implement `readStoredColor(targetKey)` with this priority:

1. Normalize `localStorage.getItem(target.storageKey)`.
2. If absent/invalid, read `target.legacyStorageKey`, convert with `legacyHueToHex`, and persist the migrated HEX value.
3. Otherwise return `target.defaultColor`.

Implement saved-color reading as:

```js
function readSavedColors() {
  try {
    return normalizeSavedColors(
      JSON.parse(localStorage.getItem(SAVED_COLORS_STORAGE_KEY) || '[]'),
    );
  } catch (error) {
    console.warn('Unable to read saved colors.', error);
    return [];
  }
}
```

- [ ] **Step 4: Implement synchronized application**

Create `applyColor(targetKey, value, { persist = true } = {})`. It must normalize the value, update `currentColors[targetKey]`, set the target CSS variable, update the picker/HEX/preview/output for the active target, rerender selected states, and persist only a valid normalized color.

Create swatches with real `<button type="button">` elements, `aria-label="Use color #RRGGBB"`, `aria-pressed`, a visible background, and a click handler calling `applyColor(activeColorTarget, color)`.

- [ ] **Step 5: Wire validation, save, reset, and sheet behavior**

- Native color `input`: immediately apply `colorPicker.value`.
- HEX `input`: apply only when `normalizeHexColor()` succeeds; otherwise reveal `colorValidation` and retain the previous color.
- HEX `blur`: restore the active normalized color when invalid.
- Save: `savedColors = addSavedColor(savedColors, currentColors[activeColorTarget])`, persist JSON, rerender.
- Reset: apply only `COLOR_TARGETS[activeColorTarget].defaultColor`.
- Open: set active target/trigger, synchronize controls, show sheet, focus `colorPicker`.
- Close: hide sheet, clear `aria-expanded`, return focus to the trigger.

- [ ] **Step 6: Verify and commit**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-interactions.mjs
git add script.js tests/verify-color-picker.mjs
git commit -m "feat: persist full picker colors"
```

---

### Task 4: Header, Overlapping Card, QR Enlargement, and Safe Demo Structure

**Files:**
- Modify: `index.html:10-80`
- Modify: `script.js:110-430`
- Modify: `styles.css:20-185`
- Create: `tests/verify-reference-layout.mjs`
- Test: `tests/verify-reference-layout.mjs`

**Interfaces:**
- Produces `backButton`, `qrEnlargeButton`, `qrDialog`, `qrDialogPreview`, `closeQrDialog`, and `editQrColor`.

- [ ] **Step 1: Write failing structure tests**

Create `tests/verify-reference-layout.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

assert.match(html, /id="backButton"/);
assert.match(html, /class="demo-badge"[^>]*>DEMO</);
assert.match(html, /id="qrEnlargeButton"/);
assert.match(html, />Tap to enlarge</);
assert.match(html, /id="qrDialog"/);
assert.match(html, /id="qrDialogPreview"/);
assert.match(html, /id="editQrColor"/);
assert.match(html, /id="closeQrDialog"/);
assert.match(css, /\.screen::before\s*\{[^}]*border-radius:\s*0 0 20px 20px/s);
assert.match(css, /\.ticket\s*\{[^}]*border-radius:\s*20px/s);
assert.match(css, /\.qr-frame\s*\{[^}]*padding:\s*19px/s);
assert.match(js, /qrDialog\.showModal\(\)/);
assert.match(js, /openColorSheet\('qr',\s*editQrColor\)/);
assert.doesNotMatch(html + js, /new\s+QRCode|toDataURL\s*\(/i);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-reference-layout.mjs
```

- [ ] **Step 3: Replace the header structure**

Use:

```html
<header class="app-header">
  <button class="back-button" id="backButton" type="button" aria-label="Go back">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
  </button>
  <h1>One Way Ticket</h1>
  <span class="demo-badge">DEMO</span>
</header>
```

Keep the header centered by giving the back button and demo badge equal grid columns.

- [ ] **Step 4: Separate QR enlargement from color editing**

Make `qrEnlargeButton` wrap only the QR artwork inside the colored frame. Add `<p class="qr-caption">Tap to enlarge</p>` below it.

Add after the ticket card:

```html
<dialog class="qr-dialog" id="qrDialog" aria-labelledby="qrDialogTitle">
  <div class="qr-dialog__header">
    <h2 id="qrDialogTitle">Ticket QR preview</h2>
    <button id="closeQrDialog" type="button" aria-label="Close QR preview">×</button>
  </div>
  <div class="qr-dialog__preview" id="qrDialogPreview"></div>
  <p class="qr-dialog__notice">Demo only — not valid for travel.</p>
  <button class="qr-dialog__color" id="editQrColor" type="button">Change frame color</button>
</dialog>
```

At initialization, clone `.qr-art` into `qrDialogPreview`. `qrEnlargeButton` opens the dialog and `closeQrDialog` closes it. `editQrColor` closes the dialog, then calls `openColorSheet('qr', editQrColor)`. Restore focus to `qrEnlargeButton` when the QR dialog closes normally.

- [ ] **Step 5: Add exact header/card/QR geometry**

```css
:root {
  --blue: #1C87D9;
  --page-gray: #F7F7F7;
  --qr-color: #808080;
}

.screen {
  position: relative;
  isolation: isolate;
  background: var(--page-gray);
}

.screen::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0 0 auto;
  height: clamp(420px, 46dvh, 500px);
  border-radius: 0 0 20px 20px;
  background: var(--blue);
}

.app-header {
  height: 194px;
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  padding: max(18px, env(safe-area-inset-top)) 32px 0;
}

.ticket {
  width: calc(100% - 62px);
  max-width: 630px;
  margin: 0 auto 24px;
  padding: 52px clamp(30px, 7vw, 52px) 28px;
  border-radius: 20px;
  box-shadow: 0 9px 18px rgba(0, 0, 0, 0.16);
}

.qr-block { width: min(55vw, 350px); }
.qr-frame { padding: 19px; border-radius: 20px; }
.qr-caption { margin: 34px 0 8px; }
.divider { width: calc(100% - 16px); border-top: 2px dashed #D8D8DD; }
```

Add a centered responsive QR dialog, matching frame background, backdrop styling, and 44 px actions.

- [ ] **Step 6: Wire back behavior**

```js
backButton.addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = './';
  }
});
```

- [ ] **Step 7: Verify and commit**

```bash
node --check script.js
node tests/verify-reference-layout.mjs
node tests/verify-ticket.mjs
git add index.html styles.css script.js tests/verify-reference-layout.mjs
git commit -m "feat: align header card and QR preview"
```

---

### Task 5: Ticket Information and Bottom Status Geometry

**Files:**
- Modify: `index.html:65-78`
- Modify: `styles.css:185-286`
- Modify: `script.js:1-40`
- Modify: `tests/verify-reference-layout.mjs`
- Modify: `tests/verify-interactions.mjs`
- Test: both files

**Interfaces:**
- Preserves click/keyboard increment on `.zone-number`.
- Preserves three independently editable strip buttons and left-to-right progress.

- [ ] **Step 1: Add failing content and geometry assertions**

Append:

```js
assert.match(html, /<h2>INTRASTATE<\/h2>/);
assert.match(html, /class="zone-number">1<\/div>/);
assert.match(html, /class="passenger-count">1 Adult<\/div>/);
assert.doesNotMatch(html, /1 Sr\/Dis\*/);
assert.doesNotMatch(html, /\*ID REQUIRED/);
assert.match(css, /\.ticket-details h2\s*\{[^}]*color:\s*#000/s);
assert.match(css, /\.zone-number\s*\{[^}]*font-size:\s*clamp\(88px,\s*15vw,\s*104px\)/s);
assert.match(css, /\.fare-strip\s*\{[^}]*width:\s*80%[^}]*height:\s*30px/s);
assert.match(css, /\.progress-track\s*\{[^}]*width:\s*60%[^}]*height:\s*10px/s);
assert.match(css, /\.instructions-link\s*\{[^}]*margin-top:\s*52px/s);
assert.match(js, /const\s+STARTING_SECONDS\s*=\s*\(29\s*\*\s*60\)\s*\+\s*55/);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/verify-reference-layout.mjs
node tests/verify-interactions.mjs
```

- [ ] **Step 3: Correct ticket content**

Use:

```html
<section class="ticket-details">
  <h2>INTRASTATE</h2>
  <div class="zone-number">1</div>
  <div class="zone-label">ZONE RIDE</div>
  <div class="passenger-count">1 Adult</div>
</section>
```

- [ ] **Step 4: Apply reference typography and spacing**

```css
.ticket-details h2 {
  margin: 18px 0 18px;
  color: #000;
  font-size: clamp(34px, 7.2vw, 48px);
}

.zone-number {
  font-size: clamp(88px, 15vw, 104px);
  line-height: 0.95;
}

.zone-label {
  margin-top: 18px;
  font-size: clamp(27px, 5.2vw, 36px);
}

.passenger-count {
  margin-top: 4px;
  color: #55515C;
  font-size: clamp(18px, 3.8vw, 25px);
}

.fare-strip {
  width: 80%;
  height: 30px;
  margin: 0 auto 40px;
}

.progress-track {
  width: 60%;
  height: 10px;
  margin-bottom: 18px;
  background: #E8F0F7;
}

.progress-fill { background: #BBD9F1; }
.progress-dot { width: 9px; height: 9px; background: #4D82C4; }
.expiry-text { color: #111125; }
.instructions-link { margin-top: 52px; }
```

Update the strip segment variables to `--fare-strip-left`, `--fare-strip-middle`, and `--fare-strip-right`.

- [ ] **Step 5: Set the 29:55 countdown and preserve progress**

Use `const STARTING_SECONDS = (29 * 60) + 55;`. Keep `calculateElapsedPercent()` based on elapsed time and keep the fill anchored at `left: 0`.

- [ ] **Step 6: Add short-screen rules**

At `max-height: 760px`, reduce header height to 150 px, ticket top padding to 30 px, QR width to `min(43vw, 210px)`, caption margin to 18 px, strip margin-bottom to 24 px, and instruction margin-top to 28 px. Do not hide `1 Adult`, the strip, countdown, or link.

- [ ] **Step 7: Verify and commit**

```bash
node tests/verify-reference-layout.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
git add index.html styles.css script.js tests/verify-reference-layout.mjs tests/verify-interactions.mjs
git commit -m "style: align ticket details and status area"
```

---

### Task 6: Regression Suite, PWA Cache, Review, Merge, and Pages Deployment

**Files:**
- Modify: `tests/verify-ticket.mjs`
- Modify: `tests/verify-interactions.mjs`
- Modify: `service-worker.js:1`
- Test: all Node checks

**Interfaces:**
- Produces a verified `ticket-pwa-v5` release on `main` and triggers GitHub Pages.

- [ ] **Step 1: Update failing regression expectations**

In `tests/verify-ticket.mjs`, remove assertions for `hueSlider`, `hueValue`, `ticketQrHue` as the active storage format, and fixed HSL application. Assert instead:

```js
assert.match(html, /id="colorPicker"[^>]+type="color"/);
assert.match(html, /id="hexColorInput"/);
assert.match(html, /id="qrDialog"/);
assert.match(html, /class="demo-badge"[^>]*>DEMO</);
assert.match(js, /ticketQrColor/);
assert.match(js, /ticketSavedColors/);
assert.match(serviceWorker, /ticket-pwa-v5/);
```

In `tests/verify-interactions.mjs`, assert the four sampled default colors and the new strip CSS-variable names, while retaining zone increment and left-to-right progress assertions.

- [ ] **Step 2: Verify RED before the cache bump**

```bash
node tests/verify-ticket.mjs
node tests/verify-interactions.mjs
```

Expected: FAIL on the v5 cache expectation.

- [ ] **Step 3: Bump the service-worker cache**

Change:

```js
const CACHE_NAME = 'ticket-pwa-v5';
```

Keep all existing application-shell assets and `ignoreSearch: true` behavior.

- [ ] **Step 4: Run the complete verification gate**

```bash
node --check script.js
node tests/verify-color-picker.mjs
node tests/verify-reference-layout.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
git diff --check
```

Expected: all commands exit 0 with no warnings or whitespace errors.

- [ ] **Step 5: Review exact requirements**

Confirm manually in the source and rendered phone viewport:

- `DEMO` is visible.
- QR remains non-scannable.
- QR tap enlarges; dialog action opens frame picker.
- Grey, black, white, and arbitrary HEX values work.
- Saved colors persist and deduplicate.
- Bar segments remain individually editable.
- Blue panel has rounded lower corners.
- Card overlaps the blue panel.
- `INTRASTATE`, zone `1`, `ZONE RIDE`, and `1 Adult` appear.
- `1 Sr/Dis*` and `*ID REQUIRED` do not appear.
- Strip is 80%/30 px; progress is 60%/10 px.
- Countdown starts at `29:55` and fills left-to-right.
- Instruction link has the larger reference gap.
- 320 px width and short-height layouts remain usable.

- [ ] **Step 6: Commit, open PR, and merge after review**

```bash
git add service-worker.js tests/verify-ticket.mjs tests/verify-interactions.mjs
git commit -m "test: verify picker and reference layout"
git push -u origin agent/full-color-reference-layout
```

Open a PR into `main` titled `Add full color picker and reference layout`, include the verification commands in the body, inspect the full patch, then squash-merge with the expected head SHA.

- [ ] **Step 7: Verify deployment**

Confirm the GitHub Pages workflow triggered from the merge commit. Verify the public page at:

```text
https://puranjayyadav.github.io/ticket/
```

Open once with a cache-busting query such as `?v=5`, then confirm the service worker updates to `ticket-pwa-v5` and subsequent normal loads show the new version.

---

## Self-Review Checklist

- Spec coverage: picker, saved colors, sampled defaults, layout, QR enlargement, demo marker, content exclusions, timer, accessibility, tests, cache, and Pages deployment are represented.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step remains.
- Type/name consistency: `fareLeft`, `fareMiddle`, `fareRight`, new storage keys, new CSS variables, and DOM IDs are consistent across tasks.
- Scope: one coordinated static UI release; no unrelated backend, authentication, payment, or real ticket-validation work is included.

This plan supersedes `docs/superpowers/plans/2026-08-02-full-color-picker.md`.
