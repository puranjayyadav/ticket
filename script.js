const STARTING_SECONDS = (29 * 60) + 55;
const SAVED_COLORS_STORAGE_KEY = 'ticketSavedColors';
const MAX_SAVED_COLORS = 20;

const QUICK_COLORS = Object.freeze([
  '#000000',
  '#FFFFFF',
  '#D3D3D3',
  '#555555',
  '#FF3B30',
  '#FF9500',
  '#FFD60A',
  '#34C759',
  '#007AFF',
  '#AF52DE',
]);

const COLOR_TARGETS = Object.freeze({
  qr: Object.freeze({
    cssVariable: '--qr-color',
    storageKey: 'ticketQrColor',
    legacyStorageKey: 'ticketQrHue',
    legacySaturation: 100,
    legacyLightness: 50,
    defaultColor: '#808080',
    title: 'QR frame color',
  }),
  fareLeft: Object.freeze({
    cssVariable: '--fare-strip-left',
    storageKey: 'ticketFareLeftColor',
    legacyStorageKey: 'ticketFareLeftHue',
    legacySaturation: 73,
    legacyLightness: 66,
    defaultColor: '#56E7BE',
    title: 'Left bar color',
  }),
  fareMiddle: Object.freeze({
    cssVariable: '--fare-strip-middle',
    storageKey: 'ticketFareMiddleColor',
    legacyStorageKey: 'ticketFareMiddleHue',
    legacySaturation: 76,
    legacyLightness: 72,
    defaultColor: '#598B7F',
    title: 'Middle bar color',
  }),
  fareRight: Object.freeze({
    cssVariable: '--fare-strip-right',
    storageKey: 'ticketFareRightColor',
    legacyStorageKey: 'ticketFareRightHue',
    legacySaturation: 21,
    legacyLightness: 48,
    defaultColor: '#A9933E',
    title: 'Right bar color',
  }),
});

function normalizeHexColor(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((character) => character.repeat(2)).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  return null;
}

function hslToHex(hue, saturation, lightness) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = Math.min(100, Math.max(0, Number(saturation))) / 100;
  const l = Math.min(100, Math.max(0, Number(lightness))) / 100;
  const c = (1 - Math.abs((2 * l) - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - (c / 2);
  let rgb;

  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return `#${rgb
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function legacyHueToHex(targetKey, value) {
  const target = COLOR_TARGETS[targetKey];
  const hue = Number(value);
  if (!target || !Number.isFinite(hue) || hue < 0 || hue > 360) {
    return target ? target.defaultColor : null;
  }
  return hslToHex(hue, target.legacySaturation, target.legacyLightness);
}

function normalizeSavedColors(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const result = [];
  values.forEach((value) => {
    const color = normalizeHexColor(value);
    if (color && !result.includes(color)) {
      result.push(color);
    }
  });
  return result.slice(0, MAX_SAVED_COLORS);
}

function addSavedColor(savedColors, value, limit = MAX_SAVED_COLORS) {
  const color = normalizeHexColor(value);
  const normalized = normalizeSavedColors(savedColors);
  if (!color) {
    return normalized.slice(0, limit);
  }
  return [color, ...normalized.filter((savedColor) => savedColor !== color)].slice(0, limit);
}

function nextZoneNumber(value) {
  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue + 1 : 2;
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

function createFareStrip(documentRef, openColorSheet) {
  const fareStrip = documentRef.createElement('div');
  fareStrip.className = 'fare-strip';
  fareStrip.setAttribute('aria-label', 'Tap a bar section to change its color');

  const targets = [
    ['fareLeft', 'left'],
    ['fareMiddle', 'middle'],
    ['fareRight', 'right'],
  ];

  targets.forEach(([targetKey, position]) => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = `fare-strip__segment fare-strip__segment--${position}`;
    button.setAttribute('aria-label', `Change ${position} bar color`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'colorSheet');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => openColorSheet(targetKey, button));
    fareStrip.append(button);
  });

  return fareStrip;
}

function initializeTicket() {
  let remainingSeconds = STARTING_SECONDS;
  let activeColorTarget = 'qr';
  let activeColorTrigger = null;
  const currentColors = {};
  let savedColors = [];

  const countdown = document.getElementById('countdown');
  const progressFill = document.getElementById('progressFill');
  const progressDot = document.getElementById('progressDot');
  const progressTrack = document.querySelector('.progress-track');
  const expirySection = document.querySelector('.expiry-section');
  const zoneNumber = document.querySelector('.zone-number');
  const instructionsLink = document.getElementById('instructionsLink');
  const originalQrButton = document.getElementById('qrColorButton');
  const colorBackdrop = document.getElementById('colorBackdrop');
  const colorSheet = document.getElementById('colorSheet');
  const appHeader = document.querySelector('.app-header');
  const ticketHeading = document.querySelector('.ticket-details h2');
  const passengerCount = document.querySelector('.passenger-count');
  const divider = document.querySelector('.divider');

  if (
    !countdown
    || !progressFill
    || !progressDot
    || !progressTrack
    || !expirySection
    || !zoneNumber
    || !instructionsLink
    || !originalQrButton
    || !colorBackdrop
    || !colorSheet
    || !appHeader
    || !ticketHeading
    || !passengerCount
    || !divider
  ) {
    console.warn('Ticket interface could not be initialized because required elements are missing.');
    return;
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', '#1C87D9');
  }

  appHeader.innerHTML = `
    <button class="back-button" id="backButton" type="button" aria-label="Go back">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
    </button>
    <h1>One Way Ticket</h1>
    <span class="demo-badge">DEMO</span>
  `;

  const backButton = document.getElementById('backButton');
  ticketHeading.textContent = 'INTRASTATE';
  zoneNumber.textContent = '1';
  passengerCount.textContent = '1 Adult';

  const qrEnlargeButton = originalQrButton;
  qrEnlargeButton.id = 'qrEnlargeButton';
  qrEnlargeButton.removeAttribute('aria-controls');
  qrEnlargeButton.removeAttribute('aria-expanded');
  qrEnlargeButton.setAttribute('aria-haspopup', 'dialog');
  qrEnlargeButton.setAttribute('aria-label', 'Enlarge demo QR preview');

  let qrCaption = document.querySelector('.qr-caption');
  if (!qrCaption) {
    qrCaption = document.createElement('p');
    qrCaption.className = 'qr-caption';
    qrCaption.textContent = 'Tap to enlarge';
    qrEnlargeButton.insertAdjacentElement('afterend', qrCaption);
  }

  if (!document.getElementById('qrDialog')) {
    const dialog = document.createElement('dialog');
    dialog.className = 'qr-dialog';
    dialog.id = 'qrDialog';
    dialog.setAttribute('aria-labelledby', 'qrDialogTitle');
    dialog.innerHTML = `
      <div class="qr-dialog__header">
        <h2 id="qrDialogTitle">Ticket QR preview</h2>
        <button class="qr-dialog__close" id="closeQrDialog" type="button" aria-label="Close QR preview">×</button>
      </div>
      <div class="qr-dialog__preview" id="qrDialogPreview"></div>
      <p class="qr-dialog__notice">Demo only — not valid for travel.</p>
      <button class="qr-dialog__color" id="editQrColor" type="button">Change frame color</button>
    `;
    document.body.append(dialog);
  }

  const qrDialog = document.getElementById('qrDialog');
  const qrDialogPreview = document.getElementById('qrDialogPreview');
  const closeQrDialog = document.getElementById('closeQrDialog');
  const editQrColor = document.getElementById('editQrColor');
  const qrFrame = qrEnlargeButton.querySelector('.qr-frame');

  if (qrDialogPreview && qrFrame && !qrDialogPreview.firstElementChild) {
    qrDialogPreview.append(qrFrame.cloneNode(true));
  }

  colorSheet.setAttribute('aria-labelledby', 'colorSheetTitle');
  colorSheet.innerHTML = `
    <div class="sheet-handle" aria-hidden="true"></div>
    <div class="sheet-header">
      <h2 id="colorSheetTitle">QR frame color</h2>
      <button class="sheet-close" id="closeColorSheet" type="button" aria-label="Close color controls">×</button>
    </div>
    <div class="picker-fields">
      <label class="picker-field picker-field--native" for="colorPicker">
        <span>Pick any color</span>
        <input id="colorPicker" type="color" value="#808080" />
      </label>
      <label class="picker-field" for="hexColorInput">
        <span>HEX color</span>
        <input id="hexColorInput" type="text" value="#808080" maxlength="7"
          autocomplete="off" autocapitalize="characters" spellcheck="false"
          aria-describedby="colorValidation" />
      </label>
    </div>
    <p class="picker-validation" id="colorValidation" aria-live="polite" hidden>
      Enter a 3- or 6-digit HEX color.
    </p>
    <section class="picker-section" aria-labelledby="quickColorsTitle">
      <h3 id="quickColorsTitle">Quick colors</h3>
      <div class="color-swatches" id="quickColors"></div>
    </section>
    <section class="picker-section" aria-labelledby="savedColorsTitle">
      <div class="picker-section__heading">
        <h3 id="savedColorsTitle">Saved colors</h3>
        <button class="save-color" id="saveColor" type="button">Save color</button>
      </div>
      <p class="saved-colors-empty" id="savedColorsEmpty">No saved colors yet.</p>
      <div class="color-swatches" id="savedColors"></div>
    </section>
    <div class="picker-actions">
      <span class="color-preview" id="colorPreview" aria-hidden="true"></span>
      <output id="colorValue" for="colorPicker hexColorInput" aria-live="polite">#808080</output>
      <button class="reset-color" id="resetColor" type="button">Reset</button>
    </div>
  `;

  const colorSheetTitle = document.getElementById('colorSheetTitle');
  const closeColorSheetButton = document.getElementById('closeColorSheet');
  const colorPicker = document.getElementById('colorPicker');
  const hexColorInput = document.getElementById('hexColorInput');
  const colorValidation = document.getElementById('colorValidation');
  const quickColors = document.getElementById('quickColors');
  const savedColorsContainer = document.getElementById('savedColors');
  const savedColorsEmpty = document.getElementById('savedColorsEmpty');
  const saveColor = document.getElementById('saveColor');
  const colorPreview = document.getElementById('colorPreview');
  const colorValue = document.getElementById('colorValue');
  const resetColor = document.getElementById('resetColor');

  if (
    !backButton
    || !qrDialog
    || !qrDialogPreview
    || !closeQrDialog
    || !editQrColor
    || !colorSheetTitle
    || !closeColorSheetButton
    || !colorPicker
    || !hexColorInput
    || !colorValidation
    || !quickColors
    || !savedColorsContainer
    || !savedColorsEmpty
    || !saveColor
    || !colorPreview
    || !colorValue
    || !resetColor
  ) {
    console.warn('Color picker or QR preview could not be initialized.');
    return;
  }

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

  function readStoredColor(targetKey) {
    const target = COLOR_TARGETS[targetKey];
    try {
      const storedColor = normalizeHexColor(localStorage.getItem(target.storageKey));
      if (storedColor) {
        return storedColor;
      }

      const legacyValue = localStorage.getItem(target.legacyStorageKey);
      if (legacyValue !== null) {
        const migratedColor = legacyHueToHex(targetKey, legacyValue);
        localStorage.setItem(target.storageKey, migratedColor);
        return migratedColor;
      }
    } catch (error) {
      console.warn(`Unable to read the saved ${target.title.toLowerCase()}.`, error);
    }
    return target.defaultColor;
  }

  function readSavedColors() {
    try {
      return normalizeSavedColors(
        JSON.parse(localStorage.getItem(SAVED_COLORS_STORAGE_KEY) || '[]'),
      );
    } catch (error) {
      console.warn('Unable to read saved colors.', error);
      return [];
    }
  }

  function persistColor(targetKey, color) {
    try {
      localStorage.setItem(COLOR_TARGETS[targetKey].storageKey, color);
    } catch (error) {
      console.warn(`Unable to save ${COLOR_TARGETS[targetKey].title.toLowerCase()}.`, error);
    }
  }

  function persistSavedColors() {
    try {
      localStorage.setItem(SAVED_COLORS_STORAGE_KEY, JSON.stringify(savedColors));
    } catch (error) {
      console.warn('Unable to save the color palette.', error);
    }
  }

  function createSwatch(color) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.setAttribute('aria-label', `Use color ${color}`);
    swatch.setAttribute('aria-pressed', String(currentColors[activeColorTarget] === color));
    swatch.addEventListener('click', () => applyColor(activeColorTarget, color));
    return swatch;
  }

  function renderSwatches() {
    quickColors.replaceChildren(...QUICK_COLORS.map(createSwatch));
    savedColorsContainer.replaceChildren(...savedColors.map(createSwatch));
    savedColorsEmpty.hidden = savedColors.length > 0;
  }

  function syncColorControls() {
    const color = currentColors[activeColorTarget];
    colorPicker.value = color.toLowerCase();
    hexColorInput.value = color;
    colorPreview.style.backgroundColor = color;
    colorValue.textContent = color;
    colorSheetTitle.textContent = COLOR_TARGETS[activeColorTarget].title;
    document.documentElement.style.setProperty('--active-picker-color', color);
    colorValidation.hidden = true;
    hexColorInput.removeAttribute('aria-invalid');
    renderSwatches();
  }

  function applyColor(targetKey, value, { persist = true } = {}) {
    const normalizedColor = normalizeHexColor(value);
    if (!normalizedColor || !COLOR_TARGETS[targetKey]) {
      return false;
    }

    currentColors[targetKey] = normalizedColor;
    document.documentElement.style.setProperty(COLOR_TARGETS[targetKey].cssVariable, normalizedColor);

    if (targetKey === activeColorTarget) {
      syncColorControls();
    }

    if (persist) {
      persistColor(targetKey, normalizedColor);
    }
    return true;
  }

  function openColorSheet(targetKey, trigger) {
    if (!COLOR_TARGETS[targetKey]) {
      return;
    }

    activeColorTarget = targetKey;
    activeColorTrigger = trigger;
    syncColorControls();
    colorBackdrop.hidden = false;
    colorSheet.hidden = false;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    document.body.classList.add('sheet-open');
    colorPicker.focus();
  }

  function closeColorSheet() {
    colorBackdrop.hidden = true;
    colorSheet.hidden = true;
    document.body.classList.remove('sheet-open');
    if (activeColorTrigger) {
      activeColorTrigger.setAttribute('aria-expanded', 'false');
      activeColorTrigger.focus();
    }
  }

  Object.keys(COLOR_TARGETS).forEach((targetKey) => {
    currentColors[targetKey] = readStoredColor(targetKey);
    applyColor(targetKey, currentColors[targetKey], { persist: false });
  });
  savedColors = readSavedColors();
  renderSwatches();

  const existingFareStrip = expirySection.querySelector('.fare-strip');
  if (existingFareStrip) {
    existingFareStrip.remove();
  }
  const fareStrip = createFareStrip(document, openColorSheet);
  expirySection.insertBefore(fareStrip, progressTrack);

  backButton.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = './';
    }
  });

  function openQrDialog() {
    if (typeof qrDialog.showModal === 'function') {
      qrDialog.showModal();
    } else {
      qrDialog.setAttribute('open', '');
    }
  }

  function closeQrPreview({ restoreFocus = true } = {}) {
    if (typeof qrDialog.close === 'function' && qrDialog.open) {
      qrDialog.close();
    } else {
      qrDialog.removeAttribute('open');
    }
    if (restoreFocus) {
      qrEnlargeButton.focus();
    }
  }

  qrEnlargeButton.addEventListener('click', openQrDialog);
  closeQrDialog.addEventListener('click', () => closeQrPreview());
  qrDialog.addEventListener('click', (event) => {
    if (event.target === qrDialog) {
      closeQrPreview();
    }
  });
  editQrColor.addEventListener('click', () => {
    closeQrPreview({ restoreFocus: false });
    openColorSheet('qr', qrEnlargeButton);
  });

  closeColorSheetButton.addEventListener('click', closeColorSheet);
  colorBackdrop.addEventListener('click', closeColorSheet);

  colorPicker.addEventListener('input', () => {
    applyColor(activeColorTarget, colorPicker.value);
  });

  hexColorInput.addEventListener('input', () => {
    const normalizedColor = normalizeHexColor(hexColorInput.value);
    if (normalizedColor) {
      colorValidation.hidden = true;
      hexColorInput.removeAttribute('aria-invalid');
      applyColor(activeColorTarget, normalizedColor);
    } else {
      colorValidation.hidden = false;
      hexColorInput.setAttribute('aria-invalid', 'true');
    }
  });

  hexColorInput.addEventListener('blur', () => {
    if (!normalizeHexColor(hexColorInput.value)) {
      hexColorInput.value = currentColors[activeColorTarget];
      colorValidation.hidden = true;
      hexColorInput.removeAttribute('aria-invalid');
    }
  });

  saveColor.addEventListener('click', () => {
    savedColors = addSavedColor(savedColors, currentColors[activeColorTarget]);
    persistSavedColors();
    renderSwatches();
  });

  resetColor.addEventListener('click', () => {
    applyColor(activeColorTarget, COLOR_TARGETS[activeColorTarget].defaultColor);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (!colorSheet.hidden) {
      closeColorSheet();
    } else if (qrDialog.hasAttribute('open')) {
      closeQrPreview();
    }
  });

  instructionsLink.addEventListener('click', (event) => {
    event.preventDefault();
    alert('Demo only. Hold the displayed code flat and steady beneath a validator in a controlled test environment.');
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
    COLOR_TARGETS,
    QUICK_COLORS,
    addSavedColor,
    calculateElapsedPercent,
    hslToHex,
    legacyHueToHex,
    nextZoneNumber,
    normalizeHexColor,
    normalizeSavedColors,
  };
}

if (typeof document !== 'undefined') {
  initializeTicket();
}
