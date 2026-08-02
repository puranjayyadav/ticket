const STARTING_SECONDS = 59 * 60 + 58;
const DEFAULT_HUE = 48;
const HUE_STORAGE_KEY = 'ticketQrHue';

let remainingSeconds = STARTING_SECONDS;
let currentHue = DEFAULT_HUE;

const countdown = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const progressDot = document.getElementById('progressDot');
const instructionsLink = document.getElementById('instructionsLink');
const qrColorButton = document.getElementById('qrColorButton');
const colorBackdrop = document.getElementById('colorBackdrop');
const colorSheet = document.getElementById('colorSheet');
const closeColorSheetButton = document.getElementById('closeColorSheet');
const hueSlider = document.getElementById('hueSlider');
const colorPreview = document.getElementById('colorPreview');
const hueValue = document.getElementById('hueValue');
const resetColor = document.getElementById('resetColor');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderTimer() {
  countdown.textContent = remainingSeconds > 0 ? formatTime(remainingSeconds) : 'Expired';
  const elapsedSeconds = STARTING_SECONDS - remainingSeconds;
  const percent = Math.min(100, Math.max(0, (elapsedSeconds / STARTING_SECONDS) * 100));
  progressFill.style.width = `${percent}%`;
  progressDot.style.left = `${percent}%`;

  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
  }
}

function normalizeHue(value) {
  const hue = Number(value);
  return Number.isFinite(hue) && hue >= 0 && hue <= 360
    ? Math.round(hue)
    : DEFAULT_HUE;
}

function readSavedHue() {
  try {
    const savedHue = localStorage.getItem(HUE_STORAGE_KEY);
    return savedHue === null ? DEFAULT_HUE : normalizeHue(savedHue);
  } catch (error) {
    console.warn('Unable to read the saved QR color.', error);
    return DEFAULT_HUE;
  }
}

function saveHue(hue) {
  try {
    localStorage.setItem(HUE_STORAGE_KEY, String(hue));
  } catch (error) {
    console.warn('Unable to save the QR color.', error);
  }
}

function applyHue(value, { persist = true } = {}) {
  const hue = normalizeHue(value);
  currentHue = hue;
  const color = `hsl(${hue} 100% 50%)`;

  document.documentElement.style.setProperty('--qr-color', color);
  hueSlider.value = String(hue);
  hueValue.textContent = `${hue}°`;
  colorPreview.style.background = color;

  if (persist) {
    saveHue(hue);
  }
}

function openColorSheet() {
  colorBackdrop.hidden = false;
  colorSheet.hidden = false;
  qrColorButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('sheet-open');
  hueSlider.focus();
}

function closeColorSheet() {
  colorBackdrop.hidden = true;
  colorSheet.hidden = true;
  qrColorButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sheet-open');
  qrColorButton.focus();
}

qrColorButton.addEventListener('click', openColorSheet);
closeColorSheetButton.addEventListener('click', closeColorSheet);
colorBackdrop.addEventListener('click', closeColorSheet);

hueSlider.addEventListener('input', () => {
  applyHue(hueSlider.value);
});

resetColor.addEventListener('click', () => {
  applyHue(DEFAULT_HUE);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !colorSheet.hidden) {
    closeColorSheet();
  }
});

instructionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  alert('Hold the QR code flat and steady under the onboard validator until you hear a confirmation tone.');
});

currentHue = readSavedHue();
applyHue(currentHue, { persist: false });
renderTimer();
setInterval(renderTimer, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed.', error);
    });
  });
}
