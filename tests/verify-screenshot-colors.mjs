import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { COLOR_TARGETS } = require('../script.js');
const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.deepEqual(
  Object.fromEntries(Object.entries(COLOR_TARGETS).map(([key, target]) => [key, target.defaultColor])),
  {
    qr: '#FFC0CB',
    fareLeft: '#29BEDE',
    fareMiddle: '#37A1B1',
    fareRight: '#2F8101',
  },
  'default/reset colors must match the supplied screenshot',
);

assert.match(css, /--qr-color:\s*#FFC0CB/i);
assert.match(css, /--fare-strip-left:\s*#29BEDE/i);
assert.match(css, /--fare-strip-middle:\s*#37A1B1/i);
assert.match(css, /--fare-strip-right:\s*#2F8101/i);
assert.match(serviceWorker, /ticket-pwa-v8/);

console.log('Screenshot-exact QR and lower-bar color checks passed.');
