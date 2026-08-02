# Full Color Picker and Reference Layout Design

## Goal

Upgrade the ticket demo in two coordinated ways:

1. Replace the hue-only control with a complete solid-color picker that supports grey, black, white, muted colors, bright colors, exact HEX entry, quick colors, and saved colors.
2. Align the overall visual composition with the supplied reference image while keeping the page visibly marked as a demo and keeping the QR-style graphic non-scannable.

## Scope

The full picker controls four independently editable targets:

1. QR frame
2. Left fare-strip segment
3. Middle fare-strip segment
4. Right fare-strip segment

Each target keeps its own applied color. The saved-color palette is shared across all targets so a color saved once can be reused anywhere.

The layout work covers the header panel, navigation, ticket card geometry, QR presentation, information hierarchy, bottom strips, progress indicator, countdown, instruction link, responsive spacing, and standalone-PWA presentation.

## Color Picker User Experience

The bottom sheet contains:

- Android/browser native full-color input
- HEX text field for exact values such as `#808080`
- Quick swatches for black, white, light grey, dark grey, red, orange, yellow, green, blue, and purple
- Live preview and normalized HEX output
- `Save color` button
- Shared `Saved colors` row
- `Reset` button for the active target
- Existing close control, backdrop, Escape behavior, and focus restoration

Changing the native picker, HEX field, quick swatch, or saved swatch updates the active target immediately. The sheet title identifies the active target.

The three fare-strip sections remain directly tappable. Tapping the QR itself opens an enlarged QR preview, matching the reference. The enlarged preview contains a clearly labeled `Change frame color` action that opens the same picker for the QR frame, avoiding a conflict between enlargement and color editing.

## Color Model and Validation

Colors are stored and applied as normalized six-digit uppercase HEX strings in the form `#RRGGBB`.

Accepted input forms:

- `#RRGGBB`
- `RRGGBB`
- `#RGB`
- `RGB`

Three-digit values are expanded to six digits. Invalid text does not change the active color and shows an inline validation message. The last valid color remains applied.

Opacity is not included. All colors are fully opaque.

## Persistence

Use `localStorage` for:

- Current color for each target
- Shared saved-color array

Saved colors are normalized, deduplicated, newest-first, and limited to 20. Saving an existing color moves it to the front.

Existing hue-based values are migrated where possible. Existing valid new-format colors take precedence over legacy hue values. Invalid or corrupt values fall back to the target default without breaking the interface.

## Reference-Aligned Defaults

Use the sampled reference-image colors as reset defaults:

- QR frame: `#808080`
- Left fare strip: `#56E7BE`
- Middle fare strip: `#598B7F`
- Right fare strip: `#A9933E`
- Blue header panel: `#1C87D9`
- Progress track/fill: `#BBD9F1`
- Progress dot: `#4D82C4`
- Page background: `#F7F7F7`

Reset affects only the active color target and does not remove saved colors.

## Reference Layout Alignment

### Background and Header

- Replace the flat gradient cutoff with a real blue header panel.
- Give the panel rounded lower corners.
- Let the white ticket card overlap the panel.
- Add a left back-chevron button.
- Keep `One Way Ticket` centered with slightly lighter weight than the current heading.
- Add a compact visible `DEMO` marker in the header so the page cannot be mistaken for a valid transit ticket.

### Ticket Card

- Use approximately 31–32 px phone-side margins.
- Reduce the corner radius to approximately 20 px.
- Use a softer downward shadow.
- Increase the top padding above the QR to approximately 50 px.
- Use a near-white page background so the card remains distinct through its shadow.
- Keep explicit bottom padding beneath the instruction link.

### QR Section

- Use a thicker QR frame, approximately 18–20 px.
- Use rounded frame corners close to the reference.
- Keep the QR-style graphic deliberately non-scannable.
- Add centered `Tap to enlarge` text below the QR.
- Tapping the QR opens an accessible enlargement dialog.
- The enlargement dialog contains `Change frame color` and Close actions.
- Keep the divider light, thin, short-dashed, and inset from the card edges.

### Ticket Information

- Change `INTERSTATE` to `INTRASTATE`.
- Render the heading in black.
- Start the zone number at `1`.
- Increase the number to approximately 96–104 px on typical phones while keeping it responsive.
- Preserve tap-to-increment behavior: `1 → 2 → 3 → …`.
- Preserve `ZONE RIDE`.
- Keep `1 Adult` as the passenger line.
- Do not add `1 Sr/Dis*` or `*ID REQUIRED`.
- Adjust vertical spacing to reproduce the reference hierarchy.

### Bottom Status Area

- Make the three-color strip approximately 28–30 px tall.
- Center it at approximately 80% of the ticket’s inner width.
- Keep the three sections equal and independently tappable.
- Make the progress bar narrower than the color strip, centered, and approximately 10 px tall.
- Keep left-to-right progress and a small right-edge dot.
- Change the initial countdown from `59:58` to `29:55`.
- Use a very dark navy/black countdown color and strong weight.
- Increase the gap between countdown and instruction link to approximately 48–56 px.

### Responsive Behavior

- Preserve the reference proportions from 320 px through large Android phone widths.
- Use `clamp()` and percentage widths where needed instead of relying on one fixed screenshot size.
- On short screens, reduce gaps and QR size without hiding the passenger line, strip, countdown, or instruction link.
- Do not recreate system status-bar or gesture-navigation elements.

## Accessibility

- Every swatch is a real button with an accessible name containing its HEX value.
- The active swatch uses a visible selected state and `aria-pressed="true"`.
- Keyboard users can operate the HEX field, native color input, swatches, save, reset, back, QR enlargement, frame-color action, and close controls.
- Focus returns to the element that opened a dialog or sheet.
- White and light swatches have visible borders.
- The QR enlargement dialog has an accessible title and modal semantics.

## Architecture

`index.html` contains:

- Blue header panel, back control, centered title, and demo marker
- Ticket content and `Tap to enlarge` label
- QR enlargement dialog
- Full picker controls and saved-color container

`script.js` owns:

- HEX normalization and validation
- Per-target color state
- Legacy hue migration
- CSS-variable application
- Saved-color persistence and rendering
- Picker synchronization
- Zone increment behavior
- QR enlargement and focus management
- Back-button behavior
- Countdown and progress calculation

`styles.css` owns:

- Reference-aligned responsive layout
- Header panel and overlapping card
- QR/card/detail/status geometry
- Picker layout, swatches, validation, selected states, and mobile spacing
- Enlargement dialog

`service-worker.js` receives a cache-version bump so installed and previously opened copies receive the new interface.

## Error Handling

- Invalid HEX input leaves the previous valid color unchanged.
- Storage failures do not block current-session color selection.
- Corrupt saved colors are ignored individually.
- Missing picker elements log a clear warning and leave the ticket display usable.
- If browser history cannot navigate back, the back control returns to the site root.
- If the enlargement dialog API is unavailable, use the existing hidden/modal fallback behavior rather than failing.

## Testing

Automated checks cover:

- Three- and six-digit HEX normalization
- Invalid HEX rejection
- Grey, black, and white selections
- Independent target persistence
- Legacy hue migration
- Saved-color ordering, deduplication, and 20-color limit
- Active-target reset
- Required accessible picker and dialog controls
- `INTRASTATE`, zone `1`, and `1 Adult`
- Explicit absence of `1 Sr/Dis*` and `*ID REQUIRED`
- Rounded header panel and overlapping card structure
- QR enlargement and separate frame-color action
- Reference-aligned sampled default colors
- Color-strip and progress geometry
- `29:55` initial countdown
- Existing zone increment and left-to-right progress regressions
- Service-worker cache-version bump

## Deployment

Develop on a dedicated branch, verify with all Node checks, review the diff, merge into `main`, and deploy automatically through the existing GitHub Pages workflow.
