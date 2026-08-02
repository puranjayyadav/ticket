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
assert.match(serviceWorker, /const\s+CACHE_NAME\s*=\s*'ticket-pwa-v2'/, 'visual update must use the v2 cache');
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

assert.match(html, /class="fare-color-strip"/, 'segmented fare color strip is required');
assert.match(html, /fare-color-strip__segment--purple/, 'purple fare segment is required');
assert.match(html, /fare-color-strip__segment--lilac/, 'lilac fare segment is required');
assert.match(html, /fare-color-strip__segment--brown/, 'brown fare segment is required');
assert.match(css, /--fare-strip-purple:\s*#c96be8;/, 'approved purple segment color is required');
assert.match(css, /--fare-strip-lilac:\s*#d081ee;/, 'approved lilac segment color is required');
assert.match(css, /--fare-strip-brown:\s*#956f62;/, 'approved brown segment color is required');
assert.match(css, /\.app-header\s*\{[^}]*height:\s*100px/s, 'top header spacing must be reduced');
assert.match(css, /\.ticket\s*\{[^}]*padding:\s*25px 35px 16px/s, 'ticket top padding must be reduced');
assert.match(css, /\.fare-color-strip\s*\{[^}]*display:\s*grid[^}]*height:\s*12px/s, 'fare strip geometry is required');

assert.match(css, /\.qr-art\s*\{[^}]*width:\s*100%/s, 'SVG must scale fluidly');
assert.match(css, /overflow-x:\s*hidden/, 'horizontal overflow protection is required');
assert.match(css, /@media\s*\(max-width:\s*430px\)/, '430px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*390px\)/, '390px responsive rule is required');
assert.match(css, /@media\s*\(max-width:\s*340px\)/, '320px-class responsive rule is required');

console.log('Ticket PWA, offline cache, QR safety, color-sheet, spacing, and fare-strip checks passed.');
