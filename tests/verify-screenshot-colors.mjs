import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
const paletteBootstrap = readFileSync(new URL('../palette-bootstrap.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.match(css, /--qr-color:\s*#0166FF/i);
assert.match(css, /--fare-strip-left:\s*#ADAEFE/i);
assert.match(css, /--fare-strip-middle:\s*#CA1CDE/i);
assert.match(css, /--fare-strip-right:\s*#1FC606/i);

assert.match(paletteBootstrap, /ticketQrColorV2[^\n]*#0166FF/);
assert.match(paletteBootstrap, /ticketFareLeftColorV2[^\n]*#ADAEFE/);
assert.match(paletteBootstrap, /ticketFareMiddleColorV2[^\n]*#CA1CDE/);
assert.match(paletteBootstrap, /ticketFareRightColorV2[^\n]*#1FC606/);
assert.match(serviceWorker, /ticket-pwa-runtime/);

console.log('Latest screenshot QR and lower-bar color checks passed.');
