import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const script = readText('../script.js');
const css = readText('../styles.css');
const serviceWorker = readText('../service-worker.js');

assert.match(
  script,
  /module\.exports\s*=\s*\{[^}]*nextZoneNumber[^}]*calculateElapsedPercent[^}]*COLOR_TARGETS/s,
  'script must expose the interaction helpers for behavior tests',
);

const require = createRequire(import.meta.url);
const {
  COLOR_TARGETS,
  calculateElapsedPercent,
  nextZoneNumber,
} = require('../script.js');

assert.equal(nextZoneNumber('2'), 3, 'tapping 2 must produce 3');
assert.equal(nextZoneNumber('3'), 4, 'repeated taps must keep incrementing');
assert.equal(nextZoneNumber('not-a-number'), 3, 'an invalid value must safely recover from the displayed starting zone');

assert.equal(calculateElapsedPercent(100, 100), 0, 'progress must start at the left edge');
assert.equal(calculateElapsedPercent(100, 50), 50, 'progress must move toward the right as time elapses');
assert.equal(calculateElapsedPercent(100, 0), 100, 'progress must finish at the right edge');

const stripTargets = ['fareLeft', 'fareMiddle', 'fareRight'];
assert.deepEqual(
  stripTargets.map((key) => COLOR_TARGETS[key].cssVariable),
  ['--fare-strip-purple', '--fare-strip-lilac', '--fare-strip-brown'],
  'all three fare-strip sections must control separate CSS variables',
);
assert.equal(
  new Set(stripTargets.map((key) => COLOR_TARGETS[key].storageKey)).size,
  3,
  'each fare-strip section must persist its own color',
);

assert.match(script, /zoneNumber\.addEventListener\('click',\s*incrementZone\)/, 'the displayed zone number must handle taps');
assert.match(script, /createFareStrip\(/, 'the fare strip must be rendered as real tappable elements');
assert.match(script, /openColorSheet\('fareLeft'/, 'the left fare section must open the color controls');
assert.match(script, /openColorSheet\('fareMiddle'/, 'the middle fare section must open the color controls');
assert.match(script, /openColorSheet\('fareRight'/, 'the right fare section must open the color controls');

assert.match(css, /\.fare-strip\s*\{[^}]*display:\s*grid/s, 'fare-strip sections must be laid out as three real controls');
assert.match(css, /\.fare-strip__segment--left\s*\{[^}]*var\(--fare-strip-purple\)/s, 'left section must use its own color variable');
assert.match(css, /\.fare-strip__segment--middle\s*\{[^}]*var\(--fare-strip-lilac\)/s, 'middle section must use its own color variable');
assert.match(css, /\.fare-strip__segment--right\s*\{[^}]*var\(--fare-strip-brown\)/s, 'right section must use its own color variable');
assert.doesNotMatch(css, /\.expiry-section::before\s*\{[^}]*display:\s*block/s, 'the non-interactive pseudo-element strip must be removed');

assert.match(css, /\.progress-fill\s*\{[^}]*position:\s*absolute[^}]*left:\s*0/s, 'progress fill must be explicitly anchored to the left');
assert.match(script, /progressFill\.style\.width\s*=\s*`\$\{percent\}%`/, 'progress width must increase with elapsed percentage');
assert.match(script, /progressDot\.style\.left\s*=\s*`\$\{percent\}%`/, 'progress dot must move from left to right');
assert.match(serviceWorker, /ticket-pwa-v4/, 'the service-worker cache must be bumped for the interaction update');

console.log('Zone increment, left-to-right progress, and independent fare-strip color checks passed.');
