import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(
  css,
  /@keyframes\s+fare-strip-blink\s*\{[\s\S]*?0%\s*,\s*49%\s*\{[^}]*opacity:\s*1[^}]*\}[\s\S]*?50%\s*,\s*99%\s*\{[^}]*opacity:\s*0[^}]*\}[\s\S]*?100%\s*\{[^}]*opacity:\s*1[^}]*\}/,
  'fare strip must switch fully on, fully off, then fully on',
);
assert.match(
  css,
  /\.fare-strip\s*\{[^}]*animation:\s*fare-strip-blink\s+1s\s+steps\(1,\s*end\)\s+infinite/s,
  'fare strip must use a discrete one-second hard blink',
);
assert.match(
  css,
  /body\.sheet-open\s+\.fare-strip\s*\{[^}]*animation-play-state:\s*paused[^}]*opacity:\s*1/s,
  'opening the color sheet must pause the animation at full opacity',
);
assert.match(
  css,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.fare-strip\s*\{[^}]*animation:\s*none[^}]*opacity:\s*1/s,
  'reduced-motion users must receive a static fully opaque strip',
);
assert.doesNotMatch(
  css,
  /\.fare-strip\s*\{[^}]*pointer-events:\s*none/s,
  'the blinking strip must remain tappable',
);

console.log('Fare-strip hard blink animation checks passed.');
