import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = `${readFileSync(new URL('../base-styles.css', import.meta.url), 'utf8')}
${readFileSync(new URL('../styles.css', import.meta.url), 'utf8')}`;
const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

for (const requiredText of [
  'id="backButton"',
  'class="demo-badge">DEMO',
  "qrEnlargeButton.id = 'qrEnlargeButton'",
  "qrCaption.textContent = 'Tap to enlarge'",
  "dialog.id = 'qrDialog'",
  'id="qrDialogPreview"',
  'id="editQrColor"',
  'id="closeQrDialog"',
  "ticketHeading.textContent = 'INTRASTATE'",
  "zoneNumber.textContent = '1'",
  "passengerCount.textContent = '1 Adult'",
  'qrDialog.showModal()',
]) {
  assert.ok(js.includes(requiredText), `missing reference layout behavior: ${requiredText}`);
}

assert.doesNotMatch(js, /1 Sr\/Dis\*/);
assert.doesNotMatch(js, /\*ID REQUIRED/);
assert.doesNotMatch(js, /new\s+QRCode|toDataURL\s*\(/i);
assert.match(css, /\.screen::before\s*\{[^}]*border-radius:\s*0 0 20px 20px/s);
assert.match(css, /\.ticket\s*\{[^}]*border-radius:\s*20px/s);
assert.match(css, /\.qr-frame\s*\{[^}]*padding:\s*19px/s);
assert.match(css, /\.ticket-details h2\s*\{[^}]*color:\s*#000/s);
assert.match(css, /\.zone-number\s*\{[^}]*font-size:\s*clamp\(88px,\s*15vw,\s*104px\)/s);
assert.match(css, /\.fare-strip\s*\{[^}]*width:\s*80%[^}]*height:\s*30px/s);
assert.match(css, /\.progress-track\s*\{[^}]*width:\s*60%[^}]*height:\s*10px/s);
assert.match(css, /\.instructions-link\s*\{[^}]*margin-top:\s*52px/s);
assert.match(js, /const\s+STARTING_SECONDS\s*=\s*\(29\s*\*\s*60\)\s*\+\s*55/);

console.log('Reference layout and safe demo checks passed.');
