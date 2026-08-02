const STARTING_SECONDS = 59 * 60 + 58;
let remainingSeconds = STARTING_SECONDS;

const countdown = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const progressDot = document.getElementById('progressDot');
const qrButton = document.getElementById('qrButton');
const colorPanel = document.getElementById('colorPanel');
const hueSlider = document.getElementById('hueSlider');
const colorValue = document.getElementById('colorValue');
const colorPreview = document.getElementById('colorPreview');
const resetColor = document.getElementById('resetColor');
const closePanel = document.getElementById('closePanel');
const instructionsLink = document.getElementById('instructionsLink');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderTimer() {
  countdown.textContent = remainingSeconds > 0 ? formatTime(remainingSeconds) : 'Expired';
  const percent = Math.max(0, (remainingSeconds / STARTING_SECONDS) * 100);
  progressFill.style.width = `${percent}%`;
  progressDot.style.left = `${percent}%`;
  if (remainingSeconds > 0) remainingSeconds -= 1;
}

function setQrColor(hue) {
  const color = `hsl(${hue} 100% 50%)`;
  document.documentElement.style.setProperty('--qr-color', color);
  colorValue.textContent = color;
  colorPreview.style.background = color;
}

let pressTimer;
let longPressTriggered = false;

function startLongPress() {
  longPressTriggered = false;
  pressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    colorPanel.hidden = false;
    hueSlider.focus();
  }, 700);
}

function cancelLongPress() {
  window.clearTimeout(pressTimer);
}

qrButton.addEventListener('pointerdown', startLongPress);
qrButton.addEventListener('pointerup', cancelLongPress);
qrButton.addEventListener('pointercancel', cancelLongPress);
qrButton.addEventListener('pointerleave', cancelLongPress);
qrButton.addEventListener('click', (event) => {
  if (longPressTriggered) event.preventDefault();
});

hueSlider.addEventListener('input', () => setQrColor(hueSlider.value));
resetColor.addEventListener('click', () => {
  hueSlider.value = 48;
  setQrColor(48);
});
closePanel.addEventListener('click', () => {
  colorPanel.hidden = true;
});

instructionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  alert('Hold the QR code flat and steady under the onboard validator until you hear a confirmation tone.');
});

setQrColor(hueSlider.value);
renderTimer();
setInterval(renderTimer, 1000);
