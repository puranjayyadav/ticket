import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.match(serviceWorker, /const\s+CACHE_NAME\s*=\s*'ticket-pwa-runtime'/, 'active cache name must stay stable across releases');
assert.match(serviceWorker, /ticket-pwa-v8/, 'the previous numbered cache may be referenced only for one-time cleanup compatibility');

const fetchIndex = serviceWorker.indexOf('const response = await fetch(event.request');
const cacheFallbackIndex = serviceWorker.indexOf('caches.match(event.request');
assert.ok(fetchIndex >= 0, 'network fetch must exist');
assert.ok(cacheFallbackIndex > fetchIndex, 'network must be attempted before cache fallback');
assert.match(serviceWorker, /await\s+cache\.put\(event\.request,\s*response\.clone\(\)\)/, 'successful network responses must refresh the offline cache');
assert.match(serviceWorker, /catch\s*\([^)]*\)\s*\{[\s\S]*caches\.match\(event\.request/, 'cache must remain available as an offline fallback');
assert.match(serviceWorker, /event\.request\.mode\s*===\s*'navigate'[\s\S]*caches\.match\('\.\/index\.html'/, 'navigation must still fall back to cached index.html offline');

console.log('Stable network-first refresh strategy checks passed.');
