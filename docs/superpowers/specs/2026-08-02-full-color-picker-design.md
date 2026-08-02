# Full Color Picker Design

## Goal

Replace the existing hue-only control with a complete color picker that can produce any solid color, including grey, black, white, muted colors, and bright colors, while preserving quick access and saved colors across sessions.

## Scope

The same picker will be used for four independently editable targets:

1. QR frame
2. Left fare-strip segment
3. Middle fare-strip segment
4. Right fare-strip segment

Each target keeps its own currently applied color. The saved-color palette is shared across all targets so a color saved once can be reused anywhere.

## User Experience

Tapping the QR frame or any fare-strip segment opens the existing bottom sheet, updated with these controls:

- Native full color input for fast visual selection
- HEX text field for exact values such as `#808080`
- Quick-color swatches for black, white, light grey, dark grey, red, orange, yellow, green, blue, and purple
- Live preview of the selected color
- `Save color` button
- Shared `Saved colors` row
- `Reset` button for the active target
- Existing close control and backdrop behavior

Changing the native picker, HEX field, a quick swatch, or a saved swatch updates the active target immediately. The bottom-sheet title identifies the active target.

## Color Model and Validation

Colors are stored and applied as normalized six-digit uppercase HEX strings in the form `#RRGGBB`.

Accepted HEX input forms:

- `#RRGGBB`
- `RRGGBB`
- `#RGB`
- `RGB`

Three-digit values are expanded to six digits. Invalid text does not change the active color and shows a small inline validation message. The last valid color remains applied.

Opacity is not included. All colors are fully opaque solid colors.

## Persistence

Use `localStorage` for:

- Current color for each of the four targets
- Shared saved-color array

Saved colors are normalized, deduplicated, and ordered newest first. Limit the saved palette to 20 colors to prevent unbounded growth. Saving an existing color moves it to the front instead of creating a duplicate.

The implementation must migrate existing hue-based values where possible. Existing users should retain visually similar colors after the update. If an old value cannot be converted safely, use the target's current default color.

## Defaults

The current visual defaults remain unchanged:

- QR frame: `#FFD400`
- Left fare strip: `#C96BE8`
- Middle fare strip: `#D081EE`
- Right fare strip: `#956F62`

Reset affects only the active target and does not remove saved colors.

## Accessibility and Mobile Behavior

- Every swatch is a real button with an accessible name containing its HEX value.
- The active swatch has a visible selected state and `aria-pressed="true"`.
- Keyboard users can operate the HEX field, native color input, swatches, save, reset, and close controls.
- Focus returns to the element that opened the sheet.
- Touch targets remain suitable for Android phone use.
- White and very light swatches include a visible border so they remain distinguishable.

## Architecture

`index.html` will contain the picker controls and saved-color container.

`script.js` will own:

- HEX normalization and validation
- Per-target color state
- Legacy hue migration
- Color application to CSS variables
- Saved-color persistence and rendering
- Synchronization among native picker, HEX field, preview, and swatches

`styles.css` will own the responsive picker layout, swatch grid, validation state, selected state, and mobile spacing.

`service-worker.js` will receive a cache-version bump so installed and previously opened copies receive the new interface.

## Error Handling

- Invalid HEX input leaves the previous valid color unchanged.
- Storage read/write failures do not block color selection during the current session.
- Corrupt stored colors are ignored individually rather than invalidating the entire palette.
- Missing required picker elements cause a clear console warning and leave the ticket display usable.

## Testing

Automated checks will cover:

- Normalizing three- and six-digit HEX input
- Rejecting invalid HEX input
- Grey, black, and white being valid selections
- Independent persistence for all four targets
- Saved-color deduplication, ordering, and 20-color limit
- Reset restoring only the active target
- Required accessible controls and saved-color markup
- Service-worker cache-version bump
- Existing zone increment, progress direction, and ticket layout regressions

## Deployment

The change will be developed on a dedicated branch, verified with the existing Node checks plus new picker tests, merged into `main`, and automatically deployed through the existing GitHub Pages workflow.
