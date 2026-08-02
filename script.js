const STARTING_SECONDS = 59 * 60 + 58;
const DEFAULT_HUE = 48;
const HUE_STORAGE_KEY = 'ticketQrHue';

const COLOR_TARGETS = Object.freeze({
  qr: Object.freeze({
    cssVariable: '--qr-color',
    storageKey: HUE_STORAGE_KEY,
    defaultHue: DEFAULT_HUE,
    saturation: 100,
    lightness: 50,
    title: 'QR frame color',
  }),
  fareLeft: Object.freeze({
    cssVariable: '--fare-strip-purple',
    storageKey: 'ticketFareLeftHue',
    defaultHue: 285,
    saturation: 73,
    lightness: 66,
    title: 'Left bar color',
  }),
  fareMiddle: Object.freeze({
    cssVariable: '--fare-strip-lilac',
    storageKey: 'ticketFareMiddleHue',
    defaultHue: 283,
    saturation: 76,
    lightness: 72,
    title: 'Middle bar color',
  }),
  fareRight: Object.freeze({
    cssVariable: '--fare-strip-brown',
    storageKey: 'ticketFareRightHue',
    defaultHue: 15,
    saturation: 21,
    lightness: 48,
    title: 'Right bar color',
  }),
});

function nextZoneNumber(value) {
  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue + 1 : 3;
}

function calculateElapsedPercent(startingSeconds, remainingSeconds) {
  if (!Number.isFinite(startingSeconds) || startingSeconds <= 0) {
    return 0;
  }

  const safeRemaining = Number.isFinite(remainingSeconds)
    ? Math.min(startingSeconds, Math.max(0, remainingSeconds))
    : startingSeconds;
  const elapsedSeconds = startingSeconds - safeRemaining;
  return Math.min(100, Math.max(0, (elapsedSeconds / startingSeconds) * 100));
}

function normalizeHue(value, fallback = DEFAULT_HUE) {
  const hue = Number(value);
  return Number.isFinite(hue) && hue >= 0 && hue <= 360
    ? Math.round(hue)
    : fallback;
}

function colorForTarget(targetKey, hue) {
  const target = COLOR_TARGETS[targetKey];
  if (targetKey === 'qr') {
    return `hsl(${hue} 100% 50%)`;
  }
  return `hsl(${hue} ${target.saturation}% ${target.lightness}%)`;
}

function createFareStrip(documentRef, openColorSheet) {
  const fareStrip = documentRef.createElement('div');
  fareStrip.className = 'fare-strip';
  fareStrip.setAttribute('aria-label', 'Tap a bar section to change its color');

  const leftButton = documentRef.createElement('button');
  leftButton.type = 'button';
  leftButton.className = 'fare-strip__segment fare-strip__segment--left';
  leftButton.setAttribute('aria-label', 'Change left bar color');
  leftButton.setAttribute('aria-haspopup', 'dialog');
  leftButton.setAttribute('aria-controls', 'colorSheet');
  leftButton.setAttribute('aria-expanded', 'false');
  leftButton.addEventListener('click', () => openColorSheet('fareLeft', leftButton));

  const middleButton = documentRef.createElement('button');
  middleButton.type = 'button';
  middleButton.className = 'fare-strip__segment fare-strip__segment--middle';
  middleButton.setAttribute('aria-label', 'Change middle bar color');
  middleButton.setAttribute('aria-haspopup', 'dialog');
  middleButton.setAttribute('aria-controls', 'colorSheet');
  middleButton.setAttribute('aria-expanded', 'false');
  middleButton.addEventListener('click', () => openColorSheet('fareMiddle', middleButton));

  const rightButton = documentRef.createElement('button');
  rightButton.type = 'button';
  rightButton.className = 'fare-strip__segment fare-strip__segment--right';
  rightButton.setAttribute('aria-label', 'Change right bar color');
  rightButton.setAttribute('aria-haspopup', 'dialog');
  rightButton.setAttribute('aria-controls', 'colorSheet');
  rightButton.setAttribute('aria-expanded', 'false');
  rightButton.addEventListener('click', () => openColorSheet('fareRight', rightButton));

  fareStrip.append(leftButton, middleButton, rightButton);
  return fareStrip;
}

function initializeTicket() {
  let remainingSeconds = STARTING_SECONDS;
  let activeColorTarget = 'qr';
  let activeColorTrigger = null;

  const countdown = document.getElementById('countdown');
  const progressFill = document.getElementById('progressFill');
  const progressDot = document.getElementById('progressDot');
  const progressTrack = document.querySelector('.progress-track');
  const expirySection = document.querySelector('.expiry-section');
  const zoneNumber = document.querySelector('.zone-number');
  const instructionsLink = document.getElementById('instructionsLink');
  const qrColorButton = document.getElementById('qrColorButton');
  const colorBackdrop = document.getElementById('colorBackdrop');
  const colorSheet = document.getElementById('colorSheet');
  const colorSheetTitle = document.getElementById('colorSheetTitle');
  const closeColorSheetButton = document.getElementById('closeColorSheet');
  const hueSlider = document.getElementById('hueSlider');
  const colorPreview = document.getElementById('colorPreview');
  const hueValue = document.getElementById('hueValue');
  const resetColor = document.getElementById('resetColor');

  if (
    !countdown
    || !progressFill
    || !progressDot
    || !progressTrack
    || !expirySection
    || !zoneNumber
    || !instructionsLink
    || !qrColorButton
    || !colorBackdrop
    || !colorSheet
    || !colorSheetTitle
    || !closeColorSheetButton
    || !hueSlider
    || !colorPreview
    || !hueValue
    || !resetColor
  ) {
    console.warn('Ticket interface could not be initialized because required elements are missing.');
    return;
  }

  const currentHues = {};

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function renderTimer() {
    countdown.textContent = remainingSeconds > 0 ? formatTime(remainingSeconds) : 'Expired';
    const percent = calculateElapsedPercent(STARTING_SECONDS, remainingSeconds);
    progressFill.style.width = `${percent}%`;
    progressDot.style.left = `${percent}%`;

    if (remainingSeconds > 0) {
      remainingSeconds -= 1;
    }
  }

  function incrementZone() {
    zoneNumber.textContent = String(nextZoneNumber(zoneNumber.textContent));
    zoneNumber.setAttribute('aria-label', `Zone ${zoneNumber.textContent}. Tap to increment`);
  }

  zoneNumber.setAttribute('role', 'button');
  zoneNumber.setAttribute('tabindex', '0');
  zoneNumber.setAttribute('aria-label', `Zone ${zoneNumber.textContent}. Tap to increment`);
  zoneNumber.addEventListener('click', incrementZone);
  zoneNumber.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      incrementZone();
    }
  });

  function readSavedHue(targetKey) {
    const target = COLOR_TARGETS[targetKey];
    try {
      const savedHue = targetKey === 'qr'
        ? localStorage.getItem(HUE_STORAGE_KEY)
        : localStorage.getItem(target.storageKey);
      return savedHue === null
        ? target.defaultHue
        : normalizeHue(savedHue, target.defaultHue);
    } catch (error) {
      console.warn(`Unable to read the saved ${target.title.toLowerCase()}.`, error);
      return target.defaultHue;
    }
  }

  function saveHue(targetKey, hue) {
    const target = COLOR_TARGETS[targetKey];
    try {
      if (targetKey === 'qr') {
        localStorage.setItem(HUE_STORAGE_KEY, String(hue));
      } else {
        localStorage.setItem(target.storageKey, String(hue));
      }
    } catch (error) {
      console.warn(`Unable to save the ${target.title.toLowerCase()}.`, error);
    }
  }

  function updateColorControls(targetKey) {
    const target = COLOR_TARGETS[targetKey];
    const hue = currentHues[targetKey];
    const color = colorForTarget(targetKey, hue);

    hueSlider.value = String(hue);
    hueValue.textContent = `${hue}°`;
    colorPreview.style.background = color;
    colorSheetTitle.textContent = target.title;
    document.documentElement.style.setProperty('--active-picker-color', color);
  }

  function applyHue(targetKey, value, { persist = true } = {}) {
    const target = COLOR_TARGETS[targetKey];
    const hue = normalizeHue(value, target.defaultHue);
    const color = colorForTarget(targetKey, hue);

    currentHues[targetKey] = hue;
    document.documentElement.style.setProperty(target.cssVariable, color);

    if (targetKey === activeColorTarget) {
      updateColorControls(targetKey);
    }

    if (persist) {
      saveHue(targetKey, hue);
    }
  }

  function openColorSheet(targetKey, trigger = qrColorButton) {
    if (!COLOR_TARGETS[targetKey]) {
      return;
    }

    activeColorTarget = targetKey;
    activeColorTrigger = trigger;
    updateColorControls(targetKey);
    colorBackdrop.hidden = false;
    colorSheet.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sheet-open');
    hueSlider.focus();
  }

  function closeColorSheet() {
    colorBackdrop.hidden = true;
    colorSheet.hidden = true;
    if (activeColorTrigger) {
      activeColorTrigger.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('sheet-open');

    if (activeColorTrigger === qrColorButton) {
      qrColorButton.focus();
    } else if (activeColorTrigger) {
      activeColorTrigger.focus();
    }
  }

  Object.keys(COLOR_TARGETS).forEach((targetKey) => {
    currentHues[targetKey] = readSavedHue(targetKey);
    applyHue(targetKey, currentHues[targetKey], { persist: false });
  });

  const existingFareStrip = expirySection.querySelector('.fare-strip');
  if (existingFareStrip) {
    existingFareStrip.remove();
  }
  const fareStrip = createFareStrip(document, openColorSheet);
  expirySection.insertBefore(fareStrip, progressTrack);

  qrColorButton.addEventListener('click', () => openColorSheet('qr', qrColorButton));
  closeColorSheetButton.addEventListener('click', closeColorSheet);
  colorBackdrop.addEventListener('click', closeColorSheet);

  hueSlider.addEventListener('input', () => {
    applyHue(activeColorTarget, hueSlider.value);
  });

  resetColor.addEventListener('click', () => {
    applyHue(activeColorTarget, COLOR_TARGETS[activeColorTarget].defaultHue);
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

  renderTimer();
  setInterval(renderTimer, 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.warn('Service worker registration failed.', error);
      });
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    nextZoneNumber,
    calculateElapsedPercent,
    COLOR_TARGETS,
  };
}

if (typeof document !== 'undefined') {
  initializeTicket();
}
