# Offline PWA and QR Color Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing ticket site installable as an offline Android PWA and add a persisted bottom-sheet hue slider that changes only the non-scannable QR frame color.

**Architecture:** Keep the app dependency-free at runtime. `manifest.webmanifest` and two local PNG icons provide installability, `service-worker.js` pre-caches the complete app shell for offline launch, and the existing `script.js` owns countdown behavior, service-worker registration, local hue persistence, and accessible bottom-sheet interactions. The existing handcrafted invalid QR SVG remains unchanged and never receives generated data.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Web App Manifest, Service Worker API, Cache Storage API, `localStorage`, Node.js built-in test modules, Python standard library for deterministic PNG generation.

## Global Constraints

- Keep the current visual ticket layout unchanged when the color sheet is closed.
- Preserve the existing static, non-scannable QR-style SVG.
- Do not add a real QR encoder, payload, canvas QR renderer, external library, CDN, API, font, or remote asset.
- The PWA name is `One Way Ticket`; the short name is `Ticket`.
- The manifest `start_url` and `scope` are `./`.
- The manifest display mode is `standalone` and orientation is `portrait`.
- The app theme and background color are `#238fd8`.
- App icons are local unbranded PNG files at `icons/icon-192.png` and `icons/icon-512.png`.
- The service worker must pre-cache the complete application shell and permit launch after the Termux server is stopped.
- A normal tap on the QR opens a bottom sheet; no helper label or visible color control appears in the closed ticket view.
- The hue range is `0` through `360`, the default is `48`, and the CSS color format is `hsl(<hue> 100% 50%)`.
- Persist the hue under the exact local-storage key `ticketQrHue`.
- Only the QR frame background may change; the SVG modules and white quiet zone remain black and white.
- The sheet closes through its close button, backdrop tap, or Escape key and returns focus to the QR button.
- The page must remain horizontally scroll-free at 320px, 390px, and 430px widths.
- No visible custom install button is added.

---

### Task 1: Expand automated PWA and interaction verification

**Files:**
- Modify: `tests/verify-ticket.mjs`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: `index.html`, `styles.css`, `script.js`, `manifest.webmanifest`, `service-worker.js`, `icons/icon-192.png`, and `icons/icon-512.png`.
- Produces: a zero exit code only when the existing invalid SVG, PWA metadata, offline cache configuration, icon dimensions, bottom-sheet structure, and persisted color behavior are all present.

- [ ] **Step 1: Replace the current verification file with the expanded failing test**

Use this complete content:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const readBinary = (path) => readFileSync(new URL(path, import.meta.url));

const html = readText('../index.html');
const css = readText('../styles.css');
const js = readText('../script.js');
const manifest = JSON.parse(readText('../manifest.webmanifest'));
const serviceWorker = readText('../service-worker.js');

function pngDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', 'icon must be a PNG file');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

assert.match(html, /<svg[^>]+class="qr-art"/i, 'inline QR-style SVG is required');
assert.match(html, /class="finder finder--top-left"/, 'top-left finder is required');
assert.match(html, /class="finder finder--top-right"/, 'top-right finder is required');
assert.match(html, /class="finder finder--bottom-left"/, 'bottom-left finder is required');
assert.match(html, /class="qr-modules"/, 'irregular static module group is required');
assert.doesNotMatch(html + js, /new\s+QRCode|qr-code-generator|toDataURL\s*\(/i, 'real QR generation must not be introduced');

assert.match(html, /<link[^>]+rel="manifest"[^>]+href="manifest\.webmanifest"/i, 'manifest link is required');
assert.match(html, /name="mobile-web-app-capable"[^>]+content="yes"/i, 'Android standalone metadata is required');
assert.equal(manifest.name, 'One Way Ticket');
assert.equal(manifest.short_name, 'Ticket');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.orientation, 'portrait');
assert.equal(manifest.theme_color, '#238fd8');
assert.equal(manifest.background_color, '#238fd8');
assert.deepEqual(
  manifest.icons.map(({ src, sizes, type }) => ({ src, sizes, type })),
  [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
);

assert.deepEqual(pngDimensions(readBinary('../icons/icon-192.png')), { width: 192, height: 192 });
assert.deepEqual(pngDimensions(readBinary('../icons/icon-512.png')), { width: 512, height: 512 });

for (const asset of [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
]) {
  assert.ok(serviceWorker.includes(`'${asset}'`), `service worker must pre-cache ${asset}`);
}
assert.match(serviceWorker, /self\.addEventListener\('install'/, 'service worker install handler is required');
assert.match(serviceWorker, /self\.addEventListener\('activate'/, 'service worker activate handler is required');
assert.match(serviceWorker, /self\.addEventListener\('fetch'/, 'service worker fetch handler is required');
assert.match(serviceWorker, /caches\.match\([^)]*ignoreSearch:\s*true/s, 'offline requests must ignore cache-busting query strings');
assert.match(js, /navigator\.serviceWorker\.register\('\.\/service-worker\.js'\)/, 'service worker registration is required');

assert.match(html, /id="qrColorButton"/, 'QR color button is required');
assert.match(html, /id="colorBackdrop"[^>]+hidden/, 'hidden color backdrop is required');
assert.match(html, /id="colorSheet"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+hidden/, 'hidden modal color sheet is required');
assert.match(html, /id="hueSlider"[^>]+type="range"[^>]+min="0"[^>]+max="360"[^>]+value="48"/, 'hue slider bounds are required');
assert.match(html, /id="colorPreview"/, 'live color preview is required');
assert.match(html, /id="hueValue"/, 'dynamic hue output is required');
assert.match(html, /id="resetColor"/, 'reset control is required');
assert.match(html, /id="closeColorSheet"/, 'close control is required');
assert.match(css, /\.color-sheet\s*\{[^}]*position:\s*fixed/s, 'bottom sheet must be fixed');
assert.match(css, /bottom:\s*0/, 'bottom sheet must attach to the bottom edge');
assert.match(css, /padding-bottom:\s*max\([^)]*env\(safe-area-inset-bottom\)/s, 'bottom sheet must respect the safe area');
assert.match(js, /const\s+HUE_STORAGE_KEY\s*=\s*'ticketQrHue'/, 'stable storage key is required');
assert.match(js, /localStorage\.getItem\(HUE_STORAGE_KEY\)/, 'stored hue must be restored');
assert.match(js, /localStorage\.setItem\(HUE_STORAGE_KEY/, 'hue changes must be persisted');
assert.match(js, /hsl\(\$\{hue\}\s+100%\s+50%\)/, 'hue must use the approved HSL format');
assert.match(js, /event\.key\s*===\s*'Escape'/, 'Escape must close the sheet');
assert.match(js, /qrColorButton\.focus\(\)/, 'focus must return to the QR button');

assert.match(css, /\.qr-art\s*\{[^}]*width:\s*100%/s, 'SVG must scale fluidly');
assert.match(css, /overflow-x:\s*hidden/, 'horizontal overflow protection is required');
assert.match(css, /@media\s*\(max-width:\s*430px\)/, '430px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*390px\)/, '390px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*340px\)/, '320px-class responsive rule is required');

console.log('Ticket PWA, offline cache, QR safety, and color-sheet checks passed.');
```

- [ ] **Step 2: Run the expanded test and confirm it fails before implementation**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected: FAIL with `ENOENT` for `manifest.webmanifest`.

- [ ] **Step 3: Commit the failing verification change**

```bash
git add tests/verify-ticket.mjs
git commit -m "test: add PWA and color sheet checks"
```

---

### Task 2: Add installable manifest and deterministic PNG icons

**Files:**
- Create: `manifest.webmanifest`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: app identity and colors from the approved design.
- Produces: standards-compatible install metadata and two local unbranded blue ticket PNG icons with exact dimensions.

- [ ] **Step 1: Create the web app manifest**

Create `manifest.webmanifest` with this exact JSON:

```json
{
  "name": "One Way Ticket",
  "short_name": "Ticket",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#238fd8",
  "background_color": "#238fd8",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Generate both icon files without adding runtime dependencies**

Run this one-time Python standard-library generator from the repository root. It draws a solid blue icon with a centered white ticket glyph and blue circular notches; do not commit the generator itself.

```bash
mkdir -p icons
python - <<'PY'
from pathlib import Path
import struct
import zlib

BLUE = (35, 143, 216, 255)
WHITE = (255, 255, 255, 255)


def png_chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def write_icon(size, path):
    pixels = [[BLUE for _ in range(size)] for _ in range(size)]
    left, right = round(size * 0.23), round(size * 0.77)
    top, bottom = round(size * 0.29), round(size * 0.71)
    notch_r = round(size * 0.055)
    center_y = size // 2

    for y in range(top, bottom):
        for x in range(left, right):
            pixels[y][x] = WHITE

    for center_x in (left, right - 1):
        for y in range(center_y - notch_r, center_y + notch_r + 1):
            for x in range(center_x - notch_r, center_x + notch_r + 1):
                if 0 <= x < size and 0 <= y < size and (x - center_x) ** 2 + (y - center_y) ** 2 <= notch_r ** 2:
                    pixels[y][x] = BLUE

    dash_x = round(size * 0.60)
    dash_w = max(2, round(size * 0.018))
    dash_h = max(4, round(size * 0.065))
    gap = max(3, round(size * 0.035))
    y = top + gap
    while y + dash_h < bottom - gap:
        for yy in range(y, y + dash_h):
            for xx in range(dash_x, dash_x + dash_w):
                pixels[yy][xx] = BLUE
        y += dash_h + gap

    raw = b''.join(b'\x00' + b''.join(bytes(pixel) for pixel in row) for row in pixels)
    png = b'\x89PNG\r\n\x1a\n'
    png += png_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += png_chunk(b'IDAT', zlib.compress(raw, 9))
    png += png_chunk(b'IEND', b'')
    Path(path).write_bytes(png)


write_icon(192, 'icons/icon-192.png')
write_icon(512, 'icons/icon-512.png')
PY
```

- [ ] **Step 3: Run the verification and confirm the remaining failures are for unimplemented HTML, service-worker, CSS, and JavaScript behavior**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected: FAIL with `ENOENT` for `service-worker.js`.

- [ ] **Step 4: Commit manifest and icons**

```bash
git add manifest.webmanifest icons/icon-192.png icons/icon-512.png
git commit -m "feat: add PWA manifest and icons"
```

---

### Task 3: Add offline-first service worker

**Files:**
- Create: `service-worker.js`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: the complete local app-shell file list.
- Produces: cache `ticket-pwa-v1`, immediate activation, old-cache removal, cache-first app-shell requests, network fallback while Termux is running, and an `index.html` fallback for offline navigation.

- [ ] **Step 1: Create `service-worker.js`**

Use this complete implementation:

```js
const CACHE_NAME = 'ticket-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) {
          return fallback;
        }
      }
      throw error;
    }
  })());
});
```

- [ ] **Step 2: Run the structural verification**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected: FAIL with `manifest link is required` because the page head and interaction markup are not yet updated.

- [ ] **Step 3: Commit the service worker**

```bash
git add service-worker.js
git commit -m "feat: cache ticket app for offline use"
```

---

### Task 4: Add PWA metadata and accessible bottom-sheet markup

**Files:**
- Modify: `index.html`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: the existing `.qr-frame` and inline invalid QR SVG.
- Produces: `#qrColorButton`, `#colorBackdrop`, `#colorSheet`, `#hueSlider`, `#colorPreview`, `#hueValue`, `#resetColor`, and `#closeColorSheet` for the script and CSS tasks.

- [ ] **Step 1: Add installability metadata to `<head>` without changing the visible page**

Immediately after the existing theme-color meta element, add:

```html
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="icon" href="icons/icon-192.png" />
```

- [ ] **Step 2: Convert only the outer QR block into an accessible button**

Change the current opening QR wrapper from:

```html
      <div class="qr-block" aria-label="Decorative non-scannable QR-style ticket graphic">
```

to:

```html
      <button
        class="qr-block"
        id="qrColorButton"
        type="button"
        aria-haspopup="dialog"
        aria-controls="colorSheet"
        aria-label="Change QR frame color"
      >
```

Change its matching closing tag, immediately after `.qr-frame`, from `</div>` to `</button>`. Do not alter the nested inline SVG, its finder groups, or its module path.

- [ ] **Step 3: Add the hidden backdrop and bottom sheet after the closing `</main>` tag and before `script.js`**

Insert:

```html
  <div class="sheet-backdrop" id="colorBackdrop" hidden></div>

  <section
    class="color-sheet"
    id="colorSheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="colorSheetTitle"
    hidden
  >
    <div class="sheet-handle" aria-hidden="true"></div>
    <div class="sheet-header">
      <h2 id="colorSheetTitle">QR frame color</h2>
      <button class="sheet-close" id="closeColorSheet" type="button" aria-label="Close color controls">×</button>
    </div>

    <label class="hue-label" for="hueSlider">Choose color</label>
    <input id="hueSlider" type="range" min="0" max="360" value="48" />

    <div class="sheet-footer">
      <span class="color-preview" id="colorPreview" aria-hidden="true"></span>
      <output id="hueValue" for="hueSlider" aria-live="polite">48°</output>
      <button class="reset-color" id="resetColor" type="button">Reset</button>
    </div>
  </section>
```

- [ ] **Step 4: Run the verification**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected: FAIL with `bottom sheet must be fixed` because the CSS is not yet implemented.

- [ ] **Step 5: Commit the HTML changes**

```bash
git add index.html
git commit -m "feat: add PWA metadata and color sheet markup"
```

---

### Task 5: Style the QR button, backdrop, and safe-area bottom sheet

**Files:**
- Modify: `styles.css`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: the exact IDs and classes introduced in Task 4.
- Produces: a visually unchanged closed ticket, a full-screen translucent backdrop, a fixed responsive bottom sheet, native focus visibility, and a hue-spectrum slider.

- [ ] **Step 1: Preserve the existing QR geometry after converting it to a button**

Extend the existing `.qr-block` rule so it contains these button resets while preserving its current width rules:

```css
.qr-block {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
```

Do not remove the existing responsive widths for `.qr-block`.

- [ ] **Step 2: Add body locking, backdrop, and sheet styles before the first media query**

Add:

```css
body.sheet-open {
  overflow: hidden;
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.42);
}

.color-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 41;
  width: 100%;
  max-width: 690px;
  margin: 0 auto;
  padding: 11px 20px max(22px, env(safe-area-inset-bottom));
  border-radius: 24px 24px 0 0;
  background: #fff;
  color: #111;
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.22);
}

.sheet-handle {
  width: 46px;
  height: 5px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: #c8c8cc;
}

.sheet-header,
.sheet-footer {
  display: flex;
  align-items: center;
}

.sheet-header {
  justify-content: space-between;
  gap: 16px;
}

.sheet-header h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}

.sheet-close,
.reset-color {
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  background: #fff;
  color: #111;
}

.sheet-close {
  width: 42px;
  height: 42px;
  padding: 0;
  font-size: 28px;
  line-height: 1;
}

.hue-label {
  display: block;
  margin-top: 18px;
  font-size: 14px;
  font-weight: 700;
}

#hueSlider {
  width: 100%;
  margin: 12px 0 16px;
  accent-color: var(--qr-color);
  background: linear-gradient(
    to right,
    hsl(0 100% 50%),
    hsl(60 100% 50%),
    hsl(120 100% 50%),
    hsl(180 100% 50%),
    hsl(240 100% 50%),
    hsl(300 100% 50%),
    hsl(360 100% 50%)
  );
}

.sheet-footer {
  gap: 12px;
}

.color-preview {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: 50%;
  background: var(--qr-color);
}

#hueValue {
  flex: 1;
  font-variant-numeric: tabular-nums;
}

.reset-color {
  padding: 9px 14px;
  font-weight: 700;
}

[hidden] {
  display: none !important;
}
```

- [ ] **Step 3: Add a narrow-sheet adjustment inside the existing `@media (max-width: 390px)` block**

Add:

```css
  .color-sheet {
    padding-inline: 16px;
  }
```

- [ ] **Step 4: Run the verification**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected: FAIL with `stable storage key is required` because interaction logic is not yet implemented.

- [ ] **Step 5: Commit the sheet styling**

```bash
git add styles.css
git commit -m "style: add QR color bottom sheet"
```

---

### Task 6: Implement persisted hue state, accessible sheet behavior, and service-worker registration

**Files:**
- Modify: `script.js`
- Test: `tests/verify-ticket.mjs`

**Interfaces:**
- Consumes: `#qrColorButton`, `#colorBackdrop`, `#colorSheet`, `#closeColorSheet`, `#hueSlider`, `#colorPreview`, `#hueValue`, `#resetColor`, and existing countdown elements.
- Produces: validated persisted hue state, immediate frame updates, open/close/focus behavior, Escape support, and non-blocking PWA registration.

- [ ] **Step 1: Replace `script.js` with the complete integrated behavior**

Use:

```js
const STARTING_SECONDS = 59 * 60 + 58;
const DEFAULT_HUE = 48;
const HUE_STORAGE_KEY = 'ticketQrHue';

let remainingSeconds = STARTING_SECONDS;
let currentHue = DEFAULT_HUE;

const countdown = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const progressDot = document.getElementById('progressDot');
const instructionsLink = document.getElementById('instructionsLink');
const qrColorButton = document.getElementById('qrColorButton');
const colorBackdrop = document.getElementById('colorBackdrop');
const colorSheet = document.getElementById('colorSheet');
const closeColorSheetButton = document.getElementById('closeColorSheet');
const hueSlider = document.getElementById('hueSlider');
const colorPreview = document.getElementById('colorPreview');
const hueValue = document.getElementById('hueValue');
const resetColor = document.getElementById('resetColor');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderTimer() {
  countdown.textContent = remainingSeconds > 0 ? formatTime(remainingSeconds) : 'Expired';
  const percent = Math.max(0, (remainingSeconds / STARTING_SECONDS) * 100);
  progressFill.style.width = `${percent}%`;
  progressDot.style.left = `${percent}%`;

  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
  }
}

function normalizeHue(value) {
  const hue = Number(value);
  return Number.isFinite(hue) && hue >= 0 && hue <= 360 ? Math.round(hue) : DEFAULT_HUE;
}

function readSavedHue() {
  try {
    return normalizeHue(localStorage.getItem(HUE_STORAGE_KEY));
  } catch (error) {
    console.warn('Unable to read the saved QR color.', error);
    return DEFAULT_HUE;
  }
}

function saveHue(hue) {
  try {
    localStorage.setItem(HUE_STORAGE_KEY, String(hue));
  } catch (error) {
    console.warn('Unable to save the QR color.', error);
  }
}

function applyHue(value, { persist = true } = {}) {
  const hue = normalizeHue(value);
  currentHue = hue;
  const color = `hsl(${hue} 100% 50%)`;

  document.documentElement.style.setProperty('--qr-color', color);
  hueSlider.value = String(hue);
  hueValue.textContent = `${hue}°`;
  colorPreview.style.background = color;

  if (persist) {
    saveHue(hue);
  }
}

function openColorSheet() {
  colorBackdrop.hidden = false;
  colorSheet.hidden = false;
  document.body.classList.add('sheet-open');
  hueSlider.focus();
}

function closeColorSheet() {
  colorBackdrop.hidden = true;
  colorSheet.hidden = true;
  document.body.classList.remove('sheet-open');
  qrColorButton.focus();
}

qrColorButton.addEventListener('click', openColorSheet);
closeColorSheetButton.addEventListener('click', closeColorSheet);
colorBackdrop.addEventListener('click', closeColorSheet);

hueSlider.addEventListener('input', () => {
  applyHue(hueSlider.value);
});

resetColor.addEventListener('click', () => {
  applyHue(DEFAULT_HUE);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !colorSheet.hidden) {
    closeColorSheet();
  }
});

instructionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  alert('Hold the QR code flat and steady under the onboard validator until you hear a confirmation tone.');
});

currentHue = readSavedHue();
applyHue(currentHue, { persist: false });
renderTimer();
setInterval(renderTimer, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed.', error);
    });
  });
}
```

- [ ] **Step 2: Run the full automated verification**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected output:

```text
Ticket PWA, offline cache, QR safety, and color-sheet checks passed.
```

Expected exit code: `0`.

- [ ] **Step 3: Commit the integrated client behavior**

```bash
git add script.js
git commit -m "feat: persist QR hue and register PWA"
```

---

### Task 7: Document Android installation, offline launch, and update workflow

**Files:**
- Modify: `README.md`
- Test: manual command review

**Interfaces:**
- Consumes: the completed PWA behavior.
- Produces: exact Android setup, installation, offline verification, and service-worker update instructions for the user.

- [ ] **Step 1: Replace `README.md` with accurate end-user instructions**

Use:

```markdown
# One Way Ticket PWA

Android-friendly ticket UI prototype with a static non-scannable QR-style graphic, live countdown, installable offline PWA support, and a saved QR-frame hue control.

## First-time setup in Termux

```bash
pkg install git python
cd /storage/emulated/0/Download
git clone https://github.com/puranjayyadav/ticket.git
cd ticket
python -m http.server 8000
```

Open this address in Chrome:

```text
http://localhost:8000
```

Keep the server running for the first load so Chrome can download and cache every PWA file.

## Install on Android

1. Open `http://localhost:8000` in Chrome.
2. Wait a few seconds for the service worker to finish caching the app.
3. Open Chrome's menu.
4. Tap **Install app** or **Add to Home screen**.
5. Launch **Ticket** from the Android home screen.

The installed app opens in standalone mode without Chrome's address bar.

## Use offline

After the app has loaded and been installed once:

1. Close the installed app.
2. Stop the Termux server with `Ctrl + C`.
3. Launch **Ticket** again from the home screen.

The cached app shell should open without the local server.

## Change the QR frame color

Tap the QR area to open the bottom sheet. Move the hue slider to change only the colored frame. The selected hue is saved on the device and restored on the next launch. Tap outside the sheet, use the close button, or press Escape to dismiss it.

## Pull future updates

```bash
cd /storage/emulated/0/Download/ticket
git pull
python -m http.server 8000
```

Then open `http://localhost:8000` in Chrome once while the server is running. Reopen the installed app after the updated service worker activates.

When cached files change in a future release, increment `CACHE_NAME` in `service-worker.js` so the old cache is deleted during activation.

## Automated verification

```bash
node tests/verify-ticket.mjs
```
```

- [ ] **Step 2: Review the documented commands for the actual repository path and localhost port**

Confirm every command uses `/storage/emulated/0/Download/ticket` and port `8000`, matching the user's existing setup.

- [ ] **Step 3: Commit the documentation**

```bash
git add README.md
git commit -m "docs: explain PWA install and offline use"
```

---

### Task 8: Verify installability, persistence, offline launch, and responsive layout on Android

**Files:**
- Modify only if verification exposes a defect: `index.html`, `styles.css`, `script.js`, `manifest.webmanifest`, or `service-worker.js`
- Test: `tests/verify-ticket.mjs` and Android Chrome

**Interfaces:**
- Consumes: the complete PWA.
- Produces: evidence that the app is installable, the hue persists, the installed app launches with Termux stopped, and the closed ticket layout remains unchanged.

- [ ] **Step 1: Run the automated verification from a clean repository checkout**

Run:

```bash
node tests/verify-ticket.mjs
```

Expected output:

```text
Ticket PWA, offline cache, QR safety, and color-sheet checks passed.
```

- [ ] **Step 2: Start the local server and clear the old installed version before testing the first install**

Run:

```bash
python -m http.server 8000
```

In Android Chrome, remove any earlier home-screen installation of this prototype, then open:

```text
http://localhost:8000/?pwa=1
```

The query string intentionally tests the service worker's `ignoreSearch: true` cache matching.

- [ ] **Step 3: Verify installability and standalone launch**

Confirm Chrome offers **Install app** or **Add to Home screen**. Install it, launch it from the home screen, and confirm there is no browser address bar.

- [ ] **Step 4: Verify the color bottom sheet**

Tap the QR and confirm:

- the translucent backdrop appears;
- the bottom sheet remains fully inside the viewport;
- the hue slider updates only the QR frame;
- the SVG remains black and white;
- Reset returns to hue `48`;
- backdrop tap and the close button dismiss the sheet;
- the closed ticket view matches the pre-PWA layout.

- [ ] **Step 5: Verify hue persistence**

Select a non-yellow hue, close the installed app completely, reopen it, and confirm the chosen frame color is restored.

- [ ] **Step 6: Verify offline launch**

Stop the server with `Ctrl + C`, then launch the installed app from the Android home screen. Confirm the full ticket, CSS, JavaScript, icon, countdown, QR artwork, and color sheet all load from cache.

- [ ] **Step 7: Verify narrow widths**

Use Chrome responsive tools or physical devices to confirm no horizontal scrolling at widths `320`, `390`, and `430` CSS pixels. Confirm the bottom sheet respects the bottom safe area at each width.

- [ ] **Step 8: Commit only genuine corrections found during manual verification**

When a correction is required, update the affected file, increment `CACHE_NAME` from `ticket-pwa-v1` to `ticket-pwa-v2`, rerun `node tests/verify-ticket.mjs`, and commit:

```bash
git add index.html styles.css script.js manifest.webmanifest service-worker.js tests/verify-ticket.mjs README.md
git commit -m "fix: finalize offline PWA behavior"
```

When no correction is required, do not create an empty commit.
