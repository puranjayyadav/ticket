const SCREENSHOT_PALETTE_VERSION = '2026-08-16-blue';
const SCREENSHOT_PALETTE = Object.freeze({
  'QR frame color': { storageKey: 'ticketQrColorV2', cssVariable: '--qr-color', color: '#0166FF' },
  'Left bar color': { storageKey: 'ticketFareLeftColorV2', cssVariable: '--fare-strip-left', color: '#ADAEFE' },
  'Middle bar color': { storageKey: 'ticketFareMiddleColorV2', cssVariable: '--fare-strip-middle', color: '#CA1CDE' },
  'Right bar color': { storageKey: 'ticketFareRightColorV2', cssVariable: '--fare-strip-right', color: '#1FC606' },
});

function persistScreenshotPaletteOnce() {
  try {
    if (localStorage.getItem('ticketPalettePreset') === SCREENSHOT_PALETTE_VERSION) return;
    Object.values(SCREENSHOT_PALETTE).forEach(({ storageKey, color }) => localStorage.setItem(storageKey, color));
    localStorage.setItem('ticketPalettePreset', SCREENSHOT_PALETTE_VERSION);
  } catch (_) {
    // Local storage is optional; stylesheet defaults still provide the palette.
  }
}

persistScreenshotPaletteOnce();

document.addEventListener('click', (event) => {
  const resetButton = event.target.closest?.('#resetColor');
  if (!resetButton) return;

  const title = document.getElementById('colorSheetTitle')?.textContent;
  const target = SCREENSHOT_PALETTE[title];
  if (!target) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  document.documentElement.style.setProperty(target.cssVariable, target.color);

  try {
    localStorage.setItem(target.storageKey, target.color);
  } catch (_) {}

  const picker = document.getElementById('colorPicker');
  const hexInput = document.getElementById('hexColorInput');
  const preview = document.getElementById('colorPreview');
  const output = document.getElementById('colorValue');
  if (picker) picker.value = target.color.toLowerCase();
  if (hexInput) hexInput.value = target.color;
  if (preview) preview.style.backgroundColor = target.color;
  if (output) output.textContent = target.color;
}, true);
