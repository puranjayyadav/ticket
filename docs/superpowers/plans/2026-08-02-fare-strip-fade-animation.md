# Fare Strip Fade Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the complete three-section fare strip as one tappable unit that fades between full opacity and 35% opacity every 2.4 seconds, pauses during color editing, and disables itself for reduced-motion users.

**Architecture:** Implement the effect entirely in `styles.css` because the existing color-sheet flow already toggles `body.sheet-open`. Add one source-level regression test for the animation contract, then bump the service-worker cache so GitHub Pages and installed PWA copies receive the new CSS.

**Tech Stack:** CSS keyframes, existing static HTML/vanilla JavaScript, Node.js `node:assert/strict` source tests, service worker, GitHub Pages Actions.

## Global Constraints

- Animate the `.fare-strip` container, not its individual segments.
- Use `fare-strip-fade 2.4s ease-in-out infinite`.
- Animate opacity only: `1` at the start/end and `0.35` at the midpoint.
- Keep all three segment buttons tappable throughout the animation.
- Pause the animation and force opacity to `1` while `body.sheet-open` is active.
- Disable the animation and keep opacity at `1` for `prefers-reduced-motion: reduce`.
- Do not change ticket sizing, mobile-fit behavior, saved colors, QR behavior, or timer behavior.
- Bump the PWA cache from `ticket-pwa-v6` to `ticket-pwa-v7`.

---

### Task 1: Add the CSS Animation with a Failing Regression Test

**Files:**
- Create: `tests/verify-fare-strip-animation.mjs`
- Modify: `styles.css`
- Test: `tests/verify-fare-strip-animation.mjs`

**Interfaces:**
- Consumes: Existing `.fare-strip` and `body.sheet-open` selectors.
- Produces: `@keyframes fare-strip-fade`, running animation state, editing pause state, and reduced-motion fallback.

- [ ] **Step 1: Write the failing test**

Create `tests/verify-fare-strip-animation.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(
  css,
  /@keyframes\s+fare-strip-fade\s*\{[\s\S]*?0%\s*,\s*100%\s*\{[^}]*opacity:\s*1[^}]*\}[\s\S]*?50%\s*\{[^}]*opacity:\s*0\.35[^}]*\}/,
  'fare strip keyframes must fade from 1 to 0.35 and back',
);
assert.match(
  css,
  /\.fare-strip\s*\{[^}]*animation:\s*fare-strip-fade\s+2\.4s\s+ease-in-out\s+infinite/s,
  'fare strip must use the approved animation timing',
);
assert.match(
  css,
  /body\.sheet-open\s+\.fare-strip\s*\{[^}]*animation-play-state:\s*paused[^}]*opacity:\s*1/s,
  'opening the color sheet must pause the animation at full opacity',
);
assert.match(
  css,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.fare-strip\s*\{[^}]*animation:\s*none[^}]*opacity:\s*1/s,
  'reduced-motion users must receive a static fully opaque strip',
);
assert.doesNotMatch(
  css,
  /\.fare-strip\s*\{[^}]*pointer-events:\s*none/s,
  'the animated strip must remain tappable',
);

console.log('Fare-strip fade animation checks passed.');
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node tests/verify-fare-strip-animation.mjs
```

Expected: FAIL because `fare-strip-fade` does not exist yet.

- [ ] **Step 3: Implement the minimal CSS**

Append to `styles.css` after the mobile-fit rules:

```css
@keyframes fare-strip-fade {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
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

- [ ] **Step 4: Verify GREEN and existing behavior**

Run:

```bash
node tests/verify-fare-strip-animation.mjs
node tests/verify-mobile-fit.mjs
node tests/verify-color-picker.mjs
node tests/verify-reference-layout.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit Task 1**

```bash
git add styles.css tests/verify-fare-strip-animation.mjs
git commit -m "feat: animate fare strip opacity"
```

---

### Task 2: Refresh the PWA Cache and Publish

**Files:**
- Modify: `service-worker.js:1`
- Modify: `tests/verify-interactions.mjs`
- Modify: `tests/verify-ticket.mjs`
- Test: complete Node regression suite

**Interfaces:**
- Produces: `ticket-pwa-v7` release deployed from `main` through the existing Pages workflow.

- [ ] **Step 1: Update cache expectations first**

Change the service-worker cache assertions in both `tests/verify-interactions.mjs` and `tests/verify-ticket.mjs` from:

```js
/ticket-pwa-v6/
```

to:

```js
/ticket-pwa-v7/
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
```

Expected: both fail because `service-worker.js` still contains `ticket-pwa-v6`.

- [ ] **Step 3: Bump the cache**

Change the first line of `service-worker.js` to:

```js
const CACHE_NAME = 'ticket-pwa-v7';
```

Keep the application-shell asset list and `ignoreSearch: true` behavior unchanged.

- [ ] **Step 4: Run the final verification gate**

Run:

```bash
node --check script.js
node tests/verify-fare-strip-animation.mjs
node tests/verify-mobile-fit.mjs
node tests/verify-color-picker.mjs
node tests/verify-reference-layout.mjs
node tests/verify-interactions.mjs
node tests/verify-ticket.mjs
```

Expected: all commands exit 0.

- [ ] **Step 5: Review and publish**

Create branch `feature/fare-strip-fade` from current `main`, commit the verified files, open a pull request titled `Animate fare strip fade`, inspect the complete patch, squash-merge it into `main` using the expected head SHA, and confirm `main` contains `ticket-pwa-v7`.

The existing `.github/workflows/deploy-pages.yml` push trigger will deploy the merge. Open the public site with:

```text
https://puranjayyadav.github.io/ticket/?v=7
```

## Self-Review Checklist

- The whole bar fades together.
- Timing, opacity, easing, and infinite looping match the approved design.
- Editing pause and reduced-motion fallback are covered.
- Segment tap behavior remains enabled.
- Mobile-fit, picker, QR, timer, and layout tests remain unchanged and passing.
- Cache and deployment steps are explicit.
