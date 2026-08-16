import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

assert.match(workflow, /cp index\.html styles\.css base-styles\.css palette-bootstrap\.js script\.js manifest\.webmanifest service-worker\.js _site\//);
assert.ok(worker.includes("'./palette-bootstrap.js'"), 'palette bootstrap must be cached for offline use');

console.log('Palette deployment checks passed.');
