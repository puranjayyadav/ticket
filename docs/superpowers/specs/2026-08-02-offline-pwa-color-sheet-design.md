# Offline PWA and QR Color Sheet Design

## Goal

Turn the existing ticket website into an installable Android Progressive Web App that continues to launch after the local Termux server is stopped, while preserving the existing ticket layout and non-scannable QR-style artwork.

Add a tap interaction on the QR area that opens a bottom sheet containing a hue slider. The slider changes only the colored frame around the QR artwork and remembers the selected hue on the device.

## Scope

- Keep the current visual ticket layout unchanged when the color sheet is closed.
- Preserve the existing static, non-scannable QR-style SVG.
- Add installable PWA metadata and icons.
- Cache the complete application shell for offline launch.
- Add a bottom-sheet hue slider opened by tapping the QR area.
- Persist the chosen hue locally and restore it at startup.
- Do not add a visible install button to the ticket screen.

## PWA Architecture

### Web App Manifest

Create `manifest.webmanifest` with:

- `name`: `One Way Ticket`
- `short_name`: `Ticket`
- `start_url`: `./`
- `scope`: `./`
- `display`: `standalone`
- `orientation`: `portrait`
- `theme_color`: the existing app blue
- `background_color`: the existing app blue
- 192×192 and 512×512 PNG icons

The page head will link the manifest and include Android-compatible theme metadata.

### App Icons

Create two simple, unbranded blue ticket icons:

- `icons/icon-192.png`
- `icons/icon-512.png`

The icon will use a blue rounded-square background and a centered white ticket glyph. It will not use NJ Transit or other third-party transit branding.

### Service Worker

Create `service-worker.js` using an offline-first app-shell strategy.

The install step pre-caches:

- `./`
- `./index.html`
- `./styles.css`
- `./script.js`
- `./manifest.webmanifest`
- both icon files

The activate step removes obsolete cache versions. Navigation requests use cache-first behavior with a network fallback when the local server is running. Static app assets also use cache-first behavior.

The page registers the service worker after load. Registration failure must not prevent the ticket from functioning normally in the browser.

## Offline Behavior

After the user opens the site once while Termux is serving it and installs it from Chrome, the installed app must reopen from the home screen with the cached app shell even after the Python server is stopped.

The countdown restarts from its configured starting value whenever the app is opened. No server state is required.

Future updates require:

1. Starting the local server again.
2. Running `git pull`.
3. Opening the site once while online to let the new service worker and cache version install.
4. Reopening the installed app after the update activates.

## QR Color Bottom Sheet

### Opening

The existing QR block becomes a semantic button or receives equivalent accessible tap behavior. A normal tap opens the bottom sheet. No helper label or visible color control appears in the closed ticket view.

### Layout

The sheet is fixed to the bottom edge and includes:

- A drag-handle decoration.
- Title: `QR frame color`.
- A close button.
- A full-width hue slider from `0` to `360`.
- A live color preview.
- A reset action that returns the hue to the current default yellow.

A translucent backdrop covers the rest of the app. Tapping the backdrop or the close button closes the sheet. The sheet must remain within narrow Android viewports and respect the bottom safe area.

### Color Application

Only the CSS variable controlling the QR frame background changes. The SVG modules and white quiet zone remain black and white.

The hue is expressed as `hsl(<hue> 100% 50%)`. The default remains approximately yellow at hue `48`.

### Persistence

Store the selected hue in `localStorage` under one stable key, for example `ticketQrHue`.

At startup:

- Parse the stored value.
- Accept it only when it is a finite number between `0` and `360`.
- Otherwise fall back to `48`.

Slider changes update the frame immediately and persist the value. Reset sets and persists `48`.

## Accessibility

- The QR control has an accessible name describing that it changes the frame color.
- The sheet uses dialog semantics with `aria-modal="true"`.
- Dynamic color text is exposed through an output element.
- Focus moves to the slider or close button when the sheet opens.
- Closing the sheet returns focus to the QR control.
- Escape closes the sheet on hardware keyboards.
- All controls retain native focus outlines.

## Error Handling

- Service-worker registration errors are logged without blocking page behavior.
- Invalid or unavailable local storage falls back to the default hue.
- The ticket remains usable if service workers are unsupported.
- The app does not depend on external URLs, CDNs, APIs, or fonts.

## Files

### Create

- `manifest.webmanifest`
- `service-worker.js`
- `icons/icon-192.png`
- `icons/icon-512.png`

### Modify

- `index.html`: manifest metadata, QR tap control, bottom-sheet markup.
- `styles.css`: sheet, backdrop, responsive sizing, and interaction states.
- `script.js`: color state, sheet interactions, persistence, and service-worker registration while retaining countdown behavior.
- `tests/verify-ticket.mjs`: PWA and interaction structure checks.
- `README.md`: Android installation, offline use, and update instructions.

## Verification

### Automated

Verify that:

- The manifest exists and contains the required installability fields.
- Both icon paths and sizes are declared.
- The service worker pre-caches every app-shell file.
- `index.html` links the manifest.
- `script.js` registers the service worker.
- The QR sheet markup and slider exist.
- No real QR generation or encoded payload is introduced.
- The prior non-scannable SVG remains present.

### Manual Android

1. Start the Termux server and open `http://localhost:8000` in Chrome.
2. Confirm Chrome offers `Install app` or `Add to Home screen`.
3. Install and launch in standalone mode without the browser address bar.
4. Tap the QR, move the hue slider, close the sheet, and confirm only the QR frame changes.
5. Close and reopen the app and confirm the selected hue is restored.
6. Stop the Termux server and confirm the installed app still launches and renders from cache.
7. Confirm the app fits at 320px, 390px, and 430px widths with no horizontal scrolling.

## Non-Goals

- Packaging an APK.
- Push notifications.
- Background sync.
- Remote data or authentication.
- A visible custom install button.
- A valid or scannable QR code.
