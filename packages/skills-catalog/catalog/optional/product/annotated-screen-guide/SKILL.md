---
name: annotated-screen-guide
description: >
  Produce an annotated screen guide — numbered, percentage-positioned callout boxes over real
  screenshots with a step-by-step panel — packaged as a single self-contained HTML file and
  uploaded as a Paperclip artifact work product that renders inline in the app. Use to document
  a UI flow, write a click-by-click walkthrough, or create onboarding / how-to instructions.
key: paperclipai/optional/product/annotated-screen-guide
recommendedForRoles:
  - product
  - designer
  - engineer
  - devrel
tags:
  - documentation
  - walkthrough
  - screenshots
  - guide
  - onboarding
---

# Annotated Screen Guide

Build a step-by-step screen guide: each step is a real screenshot with **numbered red callout
boxes** placed by **percentage** over the UI elements, plus a side panel describing what to do in
that step. The whole guide is **one self-contained HTML file** (images inlined as `data:` URIs)
uploaded as a Paperclip artifact work product. Paperclip renders it **inline, sandboxed** on the
issue Output surface, and it is also downloadable.

The one trick that makes this robust: **position boxes in percent, not pixels.** A box at
`left:42%; top:18%; width:9%; height:4%` stays glued to its element no matter how the image is
scaled (panel resize, print, zoom). Pixels break; percentages do not.

## When to use

- Someone asks for a "how do I…" walkthrough, onboarding doc, or click-by-click instructions for a
  web app or screen.
- You need to hand off a UI flow with exact "click here, then here" guidance.
- A feature shipped and needs a usage guide attached to its issue.

## When not to use

- A short answer in prose or a single screenshot is enough — do not over-produce.
- The flow involves credentials/destructive actions you cannot safely exercise. Capture read-only
  states only (see Safety).
- The deliverable is a redesign or a critique — use the relevant skill instead.

## Web capture is primary

Paperclip documents web apps, so capture in a **headless browser** (use the `agent-browser` skill
rather than inventing capture tooling). For each step:

1. Navigate to the state, wait for a stable signal (a selector or network-idle), then screenshot the
   **viewport** at a fixed size (record the width × height — you need the natural pixel size).
2. For every element you want to call out, read its rectangle and convert to percentages of the
   screenshot's natural size:

   ```
   left%   = rect.left   / shotWidth  * 100
   top%    = rect.top    / shotHeight * 100
   width%  = rect.width  / shotWidth  * 100
   height% = rect.height / shotHeight * 100
   ```

   This is the same percentage-over-container model Paperclip already uses in
   `DocumentAnnotationLayer`. A ready helper is in `references/web-capture.md`.
3. Only inspect DevTools / Network when the guide must explain *why* (routing, validation, what gets
   saved) — capture the endpoint/response, not guesses.

If you only have static screenshots (no live page), estimate box rectangles by eye and refine in the
render-verify step. If you have nothing, fall back to text-only numbered steps with placeholder
frames (see Graceful degradation).

## Output: ONE self-contained HTML file

- Emit a **single `.html`** built from the skeleton in `references/guide-template.md`.
- **Inline every screenshot as a `data:` URI.** There is no sibling `img/` folder for an uploaded
  artifact, so relative image paths would 404. Inlining keeps the guide a single portable file and
  works inside the sandboxed viewer (which permits `data:` images).
- Inline all CSS in a `<style>` block. **Do not rely on JavaScript** — the in-app viewer renders the
  guide with scripts disabled, and CSS-positioned boxes need none.
- One section ("slide") per step. Numbered red boxes over the screenshot; a numbered step list beside
  it. Box numbers and step numbers must match **1:1**.
- **Keep it under the attachment size cap** (10 MB by default). Downscale/compress screenshots
  (WebP or JPEG, cap dimensions ~1600px wide); base64 adds ~33%. Warn if a guide approaches the cap.

## Editing happens before upload

The uploaded artifact is **static and read-only**, and the in-app viewer is sandboxed and does not
persist edits. So finalize copy *before* uploading. You may keep `contenteditable` on the step panel
for ad-hoc local tweaking, but make clear that edits made inside the in-app viewer are **not saved**.
To revise a published guide, regenerate the HTML and upload a new revision.

## Upload as a work product

Use the Paperclip helper (content type auto-detects to `text/html`):

```bash
skills/paperclip/scripts/paperclip-upload-artifact.sh guide.html \
  --title "How to <do the thing>" \
  --summary "Step-by-step guide for <flow>"
```

This uploads the file and creates an attachment-backed `artifact` work product (primary for its type
by default). Then post the final issue comment linking the artifact, per the `paperclip` skill's
completion pattern. Background: `doc/AGENT-ARTIFACTS.md` and `skills/paperclip/references/artifacts.md`.

## It renders inline

On the issue, the guide appears on the **Output** surface and renders **inline in a sandboxed frame**
(no scripts, opaque origin). It is also openable/downloadable. Company Artifacts cards deep-link to
the guide inside its issue.

## Verify before handing off (headless)

After generating, load the file in headless Chrome and check:

```bash
chrome --headless --disable-gpu --hide-scrollbars \
  --window-size=1400,4000 --screenshot=verify.png "file://$PWD/guide.html"
```

- Every step renders; **box count == step count**.
- No broken/oversized `data:` images; no layout overflow.
- Boxes sit on their elements (crop/zoom a step to confirm alignment); nudge percentages 1–2× if off.
- Attach `verify.png` (or note the check) so a reviewer can confirm without re-rendering.

`alert()` halts headless — never include it. The guide should be script-free anyway.

## Graceful degradation by available material

| You have | Do |
|---|---|
| Live page + screenshots | Full guide: real shots, auto-computed `%` boxes, accurate step copy. |
| Screenshots only | Estimate box rectangles by eye; refine in render-verify. |
| Description only, no shots | Numbered steps with placeholder frames; mark unknowns `〔confirm〕`. |
| Almost nothing | Skeleton + TODOs; ask for screenshots/flow, then upgrade. |

When unsure, leave a `〔confirm〕` marker rather than inventing UI. A guide that admits a gap beats one
that misleads.

## Safety (live apps)

- Capture **read-only** states. Never click SAVE / DELETE / SUBMIT / SHIP / ACTIVATE / file-pickers
  on a live system — describe them with a box instead.
- Toolbars often put a read/VIEW action first and a write action next to it; confirm by screenshot,
  never click by fixed position.
- Close any modal/alert via the safe (Cancel/No) path; do not exit the app.

## References

- `references/web-capture.md` — headless capture recipe, `getBoundingClientRect → %` helper, DevTools
  notes, multi-viewport guidance, image-size budgeting.
- `references/guide-template.md` — the canonical single-file HTML skeleton (style block, screenshot
  wrapper, `%`-positioned numbered box, step list) with `data:` image placeholders.
