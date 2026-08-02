import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.doesNotMatch(js, /new\s+QRCode|qr-code-generator|toDataURL\s*\(/i);
assert.match(js, /class="demo-badge">DEMO/);
assert.match(js, /id="colorPicker"[^>]+type="color"/);
assert.match(js, /id="hexColorInput"/);
assert.match(js, /dialog\.id\s*=\s*'qrDialog'/);
assert.match(js, /ticketQrColor/);
assert.match(js, /ticketSavedColors/);
assert.match(js, /navigator\.serviceWorker\.register\('\.\/service-worker\.js'\)/);
assert.match(serviceWorker, /ticket-pwa-v6/);
assert.match(serviceWorker, /caches\.match\([^)]*ignoreSearch:\s*true/s);
for (const asset of ['./', './index.html', './styles.css', './script.js', './manifest.webmanifest']) {
  assert.ok(serviceWorker.includes(`'${asset}'`));
}
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /@media\s*\(max-width:\s*390px\)/);
assert.match(css, /@media\s*\(max-width:\s*340px\)/);
assert.match(css, /@media\s*\(max-height:\s*760px\)/);

console.log('Ticket PWA, picker, QR safety, and layout checks passed.');
