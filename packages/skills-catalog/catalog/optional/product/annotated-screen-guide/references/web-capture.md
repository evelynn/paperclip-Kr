# Web capture & percentage boxes

How to capture screenshots and compute callout-box coordinates for an annotated screen guide.

## Capture a stable screenshot

Use the `agent-browser` skill (or any headless browser you control). The essentials:

1. **Fixed viewport.** Pick a size and keep it for every step (e.g. 1366×768 desktop, 390×844 mobile).
   The screenshot's natural pixel size is the denominator for every percentage, so it must be known
   and consistent.
2. **Wait for the right signal** before shooting — a specific selector or network-idle, not a fixed
   sleep. Capture immediately after the wait, before any interaction perturbs state.
3. **Read-only only.** Navigate, open menus, select rows; never trigger writes (SAVE/DELETE/SUBMIT)
   on a live system.

## Compute box percentages from the live page

When you still have the page open, derive boxes directly from element rectangles — no eyeballing:

```js
// Run in the page context for the SAME viewport you screenshotted.
// Returns percentages ready to drop into the box style.
function boxPct(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight; // matches a viewport screenshot
  const pct = (n) => +(n).toFixed(2);
  return {
    left:   pct(r.left   / W * 100),
    top:    pct(r.top    / H * 100),
    width:  pct(r.width  / W * 100),
    height: pct(r.height / H * 100),
  };
}

// Example:
// boxPct('#save-button') -> { left: 74.5, top: 17.8, width: 9.2, height: 3.6 }
```

If you captured a **full-page** screenshot instead of the viewport, divide by the full scroll size
(`document.documentElement.scrollWidth` / `scrollHeight`) and use rectangles relative to the page top
(`r.top + window.scrollY`).

## From a static screenshot (no live page)

Estimate the rectangle by eye in image pixels `(x, y, w, h)` against the screenshot's natural size
`(Wimg, Himg)`:

```
left% = x / Wimg * 100      top%    = y / Himg * 100
width% = w / Wimg * 100     height% = h / Himg * 100
```

Start rough, then fix in render-verify (crop a step and check alignment; nudge 1–2%).

## Explaining behavior (optional)

When a step needs the *why* (what gets saved, why a button is disabled), capture evidence rather than
guessing:

- **Network tab**: the request/response for the action (endpoint, key params, status).
- **Console / UI**: the exact validation or error message text — quote it verbatim.

Only include this when the guide's value depends on it.

## Image size budget

The whole guide is one HTML file with images inlined as `data:` URIs, and it must fit the attachment
cap (10 MB default). Base64 adds ~33%.

- Prefer **WebP** or **JPEG** for screenshots; cap width around 1600px.
- Keep PNG only for crisp UI where compression artifacts hurt.
- Roughly: keep the **sum of raw image bytes under ~7 MB** so the base64 HTML stays under 10 MB.
- If a guide must exceed the cap, split it into two guides by phase rather than degrading quality.
