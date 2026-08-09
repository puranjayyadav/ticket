import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

assert.match(serviceWorker, /const\s+CACHE_NAME\s*=\s*'ticket-pwa-runtime'/, 'cache name must be stable so releases do not require URL versions');
assert.doesNotMatch(serviceWorker, /ticket-pwa-v\d+/, 'service worker must not depend on numbered cache versions');

const fetchIndex = serviceWorker.indexOf('const response = await fetch(event.request');
const cacheFallbackIndex = serviceWorker.indexOf('caches.match(event.request');
assert.ok(fetchIndex >= 0, 'network fetch must exist');
assert.ok(cacheFallbackIndex > fetchIndex, 'network must be attempted before cache fallback');
assert.match(serviceWorker, /await\s+cache\.put\(event\.request,\s*response\.clone\(\)\)/, 'successful network responses must refresh the offline cache');
assert.match(serviceWorker, /catch\s*\([^)]*\)\s*\{[\s\S]*caches\.match\(event\.request/, 'cache must remain available as an offline fallback');
assert.match(serviceWorker, /event\.request\.mode\s*===\s*'navigate'[\s\S]*caches\.match\('\.\/index\.html'/, 'navigation must still fall back to cached index.html offline');

assert.match(script, /navigator\.serviceWorker\.register\('\.\/service-worker\.js',\s*\{\s*updateViaCache:\s*'none'\s*\}\)/, 'service worker registration must bypass HTTP cache when checking for updates');
assert.match(script, /registration\.update\(\)/, 'page load must explicitly check for a newer service worker');

console.log('Network-first refresh strategy checks passed.');
