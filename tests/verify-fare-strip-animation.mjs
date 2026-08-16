import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(
  css,
  /@keyframes\s+fare-strip-blink\s*\{[\s\S]*?0%\s*,\s*100%\s*\{[^}]*opacity:\s*1[^}]*\}[\s\S]*?50%\s*\{[^}]*opacity:\s*0\.2[^}]*\}/,
  'fare strip keyframes must blink from 1 to 0.2 and back',
);
assert.match(
  css,
  /\.fare-strip\s*\{[^}]*animation:\s*fare-strip-blink\s+1s\s+ease-in-out\s+infinite/s,
  'fare strip must blink once per second',
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

console.log('Fare-strip blink animation checks passed.');
