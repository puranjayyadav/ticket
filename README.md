# One Way Ticket PWA

Android-friendly ticket UI prototype with a static non-scannable QR-style graphic, live countdown, installable offline PWA support, and a saved QR-frame hue control.

## First-time setup in Termux

```bash
pkg install git python
cd /storage/emulated/0/Download
git clone https://github.com/puranjayyadav/ticket.git
cd ticket
python -m http.server 8000
```

Open this address in Chrome:

```text
http://localhost:8000
```

Keep the server running for the first load so Chrome can download and cache every PWA file.

## Install on Android

1. Open `http://localhost:8000` in Chrome.
2. Wait a few seconds for the service worker to finish caching the app.
3. Open Chrome's menu.
4. Tap **Install app** or **Add to Home screen**.
5. Launch **Ticket** from the Android home screen.

The installed app opens in standalone mode without Chrome's address bar.

## Use offline

After the app has loaded and been installed once:

1. Close the installed app.
2. Stop the Termux server with `Ctrl + C`.
3. Launch **Ticket** again from the home screen.

The cached app shell should open without the local server.

## Change the QR frame color

Tap the QR area to open the bottom sheet. Move the hue slider to change only the colored frame. The selected hue is saved on the device and restored on the next launch. Tap outside the sheet, use the close button, or press Escape to dismiss it.

## Pull future updates

```bash
cd /storage/emulated/0/Download/ticket
git pull
python -m http.server 8000
```

Then open `http://localhost:8000` in Chrome once while the server is running. Reopen the installed app after the updated service worker activates.

When cached files change in a future release, increment `CACHE_NAME` in `service-worker.js` so the old cache is deleted during activation.

## Automated verification

```bash
node tests/verify-ticket.mjs
```
