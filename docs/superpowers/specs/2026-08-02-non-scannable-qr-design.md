# Non-Scannable Realistic QR Design

## Goal

Replace the current decorative grid with a realistic QR-style graphic that visually matches the ticket reference while remaining permanently non-scannable.

## Scope

- Preserve the yellow QR frame and overall ticket layout.
- Replace the current CSS grid with a static, handcrafted SVG QR-style pattern.
- Keep the pattern sharp at all Android screen sizes.
- Do not encode any payload or generate a valid QR symbol.
- Do not add visible controls or labels for changing the QR appearance.

## Visual Design

The SVG will use a square module grid with:

- Three large finder-style corner squares.
- Irregularly distributed black modules.
- A white quiet margin around the module field.
- A density and visual rhythm similar to a real QR code.

The yellow frame will remain a separate CSS-controlled container so its spacing can be tuned independently from the SVG.

## Non-Scannable Guarantees

The pattern will deliberately violate QR structural requirements:

- No encoded data payload.
- Invalid timing patterns.
- Missing or malformed format and version information.
- Deliberately inconsistent alignment structures.
- Static handcrafted modules rather than QR-generation output.

The design will not use a real QR code with damaged modules, because QR error correction could still allow some scanners to decode it.

## Layout Adjustments

Along with the SVG replacement, spacing will be tuned to match the reference more closely:

- QR frame width and internal yellow padding.
- White quiet-zone size around the pattern.
- Vertical gap between the QR frame and dashed divider.
- Divider width and position.
- Top spacing above the QR block.

## Implementation Structure

- `index.html`: replace the current decorative QR element with inline SVG markup or a static SVG asset reference.
- `styles.css`: adjust QR dimensions, quiet-zone spacing, yellow frame padding, and surrounding vertical spacing.
- `script.js`: no QR-generation logic; the SVG remains static and non-interactive.

## Verification

- Confirm the QR-style graphic renders sharply at 320px, 390px, and 430px viewport widths.
- Confirm no horizontal scrolling appears.
- Confirm common QR scanner apps do not decode the pattern.
- Confirm the visual spacing aligns closely with the supplied reference screenshot.
- Confirm no visible QR color controls or helper text appear.
