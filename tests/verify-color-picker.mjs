import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const scriptText = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}
${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
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
  normalizeSavedColors(['#fff', '#808080', '#FFFFFF', 'nope', '#000']),
  ['#FFFFFF', '#808080', '#000000'],
);
assert.deepEqual(addSavedColor(['#FFFFFF', '#808080'], '#808080'), ['#808080', '#FFFFFF']);
assert.deepEqual(addSavedColor(['#FFFFFF'], 'nope'), ['#FFFFFF']);
assert.equal(
  addSavedColor(
    Array.from({ length: 20 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`),
    '#ABCDEF',
  ).length,
  20,
);

for (const requiredText of [
  'id="colorPicker"',
  'type="color"',
  'id="hexColorInput"',
  'maxlength="7"',
  'id="colorValidation"',
  'id="quickColors"',
  'id="savedColors"',
  'id="saveColor"',
  'id="colorValue"',
  'ticketSavedColors',
  "colorPicker.addEventListener('input'",
  "hexColorInput.addEventListener('input'",
  "saveColor.addEventListener('click'",
  'aria-pressed',
]) {
  assert.ok(scriptText.includes(requiredText), `missing picker implementation: ${requiredText}`);
}

assert.match(css, /\.picker-fields\s*\{[^}]*display:\s*grid/s);
assert.match(css, /\.color-swatches\s*\{[^}]*display:\s*grid/s);
assert.match(css, /\.color-swatch\[aria-pressed="true"\]/);
assert.match(css, /max-height:\s*min\(88dvh,\s*720px\)/);

console.log('Full color picker checks passed.');
