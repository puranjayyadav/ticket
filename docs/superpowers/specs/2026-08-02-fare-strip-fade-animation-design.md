# Fare Strip Fade Animation Design

## Goal

Animate the complete three-section fare strip as one unit so it fades in and out continuously without changing its layout, colors, or tap behavior.

## Animation Behavior

- Apply one animation to the `.fare-strip` container so all three sections fade together.
- Animate opacity from `1` to `0.35` and back.
- Use a `2.4s` duration with `ease-in-out` timing.
- Repeat infinitely.
- Keep pointer events enabled throughout the animation so all three color sections remain tappable.
- Do not animate scale, position, blur, or individual segment colors.

## Editing Behavior

When the color picker sheet is open, pause the fare-strip animation. This keeps the selected color stable while the user is editing a strip segment.

The existing `body.sheet-open` class will control the paused state:

- Normal page: animation runs.
- Color sheet open: animation-play-state is `paused` and opacity is forced to `1`.
- Color sheet closed: animation resumes.

## Accessibility

Respect `prefers-reduced-motion: reduce` by disabling the animation and keeping the strip fully opaque.

## Implementation

`styles.css` will add:

```css
@keyframes fare-strip-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.fare-strip {
  animation: fare-strip-fade 2.4s ease-in-out infinite;
}

body.sheet-open .fare-strip {
  animation-play-state: paused;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .fare-strip {
    animation: none;
    opacity: 1;
  }
}
```

No JavaScript changes are required because the existing color-sheet flow already toggles `body.sheet-open`.

## Testing

Automated source checks will verify:

- The `fare-strip-fade` keyframes exist.
- The strip uses a `2.4s ease-in-out infinite` animation.
- The midpoint opacity is `0.35`.
- The animation pauses while `body.sheet-open` is active.
- Reduced-motion disables the animation.
- Existing fare-strip tap interactions and mobile-fit tests still pass.

## Deployment

The change will be made on a dedicated branch, verified with the complete existing Node regression suite, merged into `main`, and deployed through the existing GitHub Pages workflow with a service-worker cache bump.