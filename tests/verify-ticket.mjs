import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

assert.match(html, /<svg[^>]+class="qr-art"/i, 'inline QR-style SVG is required');
assert.match(html, /class="finder finder--top-left"/, 'top-left finder is required');
assert.match(html, /class="finder finder--top-right"/, 'top-right finder is required');
assert.match(html, /class="finder finder--bottom-left"/, 'bottom-left finder is required');
assert.match(html, /class="qr-modules"/, 'irregular module group is required');
assert.doesNotMatch(html, /fake-qr|hueSlider|colorPanel|resetColor|closePanel/, 'old QR grid and color controls must be removed');
assert.doesNotMatch(js, /setQrColor|longPress|hueSlider|colorPanel|qrButton/, 'QR controls must not remain in JavaScript');
assert.match(css, /\.qr-art\s*\{[^}]*width:\s*100%/s, 'SVG must scale fluidly');
assert.match(css, /overflow-x:\s*hidden/, 'horizontal overflow protection is required');
assert.match(css, /@media\s*\(max-width:\s*430px\)/, '430px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*390px\)/, '390px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*340px\)/, '320px-class responsive rule is required');

console.log('Ticket structure and safety checks passed.');
