import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}
${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.match(css, /html,\s*\nbody\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
assert.match(css, /\.screen\s*\{[^}]*height:\s*100dvh[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
assert.match(css, /\.app-header\s*\{[^}]*height:\s*clamp\(76px,\s*11dvh,\s*100px\)/s);
assert.match(css, /\.ticket\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*clamp\(76px,\s*11dvh,\s*100px\)\s*-\s*10px\)[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
assert.match(css, /\.qr-block\s*\{[^}]*width:\s*min\(45vw,\s*188px\)/s);
assert.match(css, /\.zone-number\s*\{[^}]*font-size:\s*clamp\(54px,\s*14vw,\s*72px\)/s);
assert.match(css, /\.fare-strip\s*\{[^}]*height:\s*clamp\(14px,\s*2\.2dvh,\s*20px\)/s);
assert.match(css, /\.instructions-link\s*\{[^}]*margin-top:\s*clamp\(10px,\s*1\.8dvh,\s*18px\)/s);
assert.match(css, /@media\s*\(max-height:\s*620px\)/);
assert.match(css, /@media\s*\(max-height:\s*620px\)[\s\S]*\.qr-block\s*\{[^}]*width:\s*min\(37vw,\s*122px\)/s);
assert.match(css, /@media\s*\(max-height:\s*620px\)[\s\S]*\.instructions-link\s*\{[^}]*margin-top:\s*6px/s);
assert.match(serviceWorker, /ticket-pwa-v7/);
