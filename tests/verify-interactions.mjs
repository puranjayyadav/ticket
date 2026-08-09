import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}
${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const { COLOR_TARGETS, calculateElapsedPercent, nextZoneNumber } = require('../script.js');

assert.equal(nextZoneNumber('1'), 2);
assert.equal(nextZoneNumber('2'), 3);
assert.equal(calculateElapsedPercent(100, 100), 0);
assert.equal(calculateElapsedPercent(100, 50), 50);
assert.equal(calculateElapsedPercent(100, 0), 100);
assert.deepEqual(
  ['fareLeft', 'fareMiddle', 'fareRight'].map((key) => COLOR_TARGETS[key].cssVariable),
  ['--fare-strip-left', '--fare-strip-middle', '--fare-strip-right'],
);
assert.match(script, /zoneNumber\.addEventListener\('click',\s*incrementZone\)/);
assert.match(script, /createFareStrip\(/);
assert.match(script, /progressFill\.style\.width\s*=\s*`\$\{percent\}%`/);
assert.match(script, /progressDot\.style\.left\s*=\s*`\$\{percent\}%`/);
assert.match(css, /\.progress-fill\s*\{[^}]*left:\s*0|inset:\s*0 auto 0 0/s);
assert.match(serviceWorker, /ticket-pwa-v8/);

console.log('Zone, progress, and independent fare-strip checks passed.');
