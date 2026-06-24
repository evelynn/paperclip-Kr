# Guide HTML template

Canonical **single-file** skeleton for an annotated screen guide. Self-contained: inline `<style>`,
screenshots inlined as `data:` URIs, **no JavaScript** (the in-app viewer renders with scripts
disabled). One `<section class="step">` per step; box numbers match the step-list numbers 1:1.

Boxes are positioned in **percent** (`left/top/width/height`) so they stay aligned at any scale.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Screen guide</title>
<style>
  :root { --red:#e53935; --ink:#1f2933; --sub:#5b6b7b; --line:#d7dee6; --bg:#eef1f5; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, "Malgun Gothic", sans-serif; color:var(--ink); background:var(--bg); }
  header { padding:14px 20px; background:#0f2233; color:#fff; }
  header h1 { margin:0; font-size:16px; }
  .deck { max-width:1400px; margin:0 auto; padding:20px; }
  .step { background:#fff; border:1px solid var(--line); border-radius:12px; margin-bottom:22px; overflow:hidden; }
  .step .head { display:flex; gap:10px; align-items:center; padding:12px 16px; border-bottom:1px solid var(--line); }
  .step .head .badge { background:var(--red); color:#fff; font-weight:800; font-size:12px; border-radius:20px; padding:3px 11px; }
  .step .head h2 { margin:0; font-size:16px; }
  .body { display:flex; flex-wrap:wrap; }
  /* Screenshot stage: position:relative so % boxes anchor to it. No padding/border (would skew %). */
  .stagewrap { flex:1.7; min-width:320px; background:#11202e; padding:12px; display:flex; align-items:center; }
  .stage { position:relative; width:100%; line-height:0; border-radius:6px; overflow:hidden; }
  .stage img { width:100%; display:block; }            /* display:block removes inline gap */
  .box { position:absolute; border:3px solid var(--red); border-radius:6px;
         box-shadow:0 0 0 2px rgba(255,255,255,.55), 0 2px 8px rgba(0,0,0,.35); }
  .box .num { position:absolute; top:-13px; left:-13px; width:26px; height:26px; background:var(--red);
              color:#fff; border-radius:50%; font-weight:800; font-size:14px; line-height:26px;
              text-align:center; border:2px solid #fff; }
  .panel { flex:1; min-width:280px; padding:16px 18px; background:#fbfcfe; border-left:1px solid var(--line); }
  .panel h3 { margin:0 0 8px; font-size:14px; color:#2563eb; }
  ol.steps { list-style:none; margin:0; padding:0; counter-reset:st; }
  ol.steps > li { position:relative; padding:9px 9px 9px 38px; margin-bottom:7px; border:1px solid #e4e9ef;
                  border-radius:8px; background:#fff; font-size:13.5px; line-height:1.5; }
  ol.steps > li::before { counter-increment:st; content:counter(st); position:absolute; left:8px; top:9px;
                          width:22px; height:22px; background:var(--red); color:#fff; border-radius:50%;
                          font-weight:800; font-size:12px; line-height:22px; text-align:center; }
  .note { margin-top:10px; font-size:12px; border-radius:8px; padding:9px 11px;
          color:#8a1c1c; background:#fdecea; border:1px solid #f5c2bd; }
  @media print { body { background:#fff; } .step { break-inside: avoid; } }
</style>
</head>
<body>
  <header><h1>〔Guide title〕</h1></header>
  <div class="deck">

    <!-- ===== Step 1 ===== -->
    <section class="step">
      <div class="head"><span class="badge">Step 1</span><h2>〔Step title — e.g. Open the panel〕</h2></div>
      <div class="body">
        <div class="stagewrap"><div class="stage">
          <!-- Inline the screenshot as a data: URI (no external files). -->
          <img src="data:image/webp;base64,〔BASE64〕" alt="Step 1 screen" />
          <!-- Box style = element rect as % of the screenshot's natural size (see web-capture.md). -->
          <div class="box" style="left:74.5%;top:17.8%;width:9.2%;height:3.6%"><span class="num">1</span></div>
          <div class="box" style="left:28.8%;top:17.8%;width:22.9%;height:3.6%"><span class="num">2</span></div>
        </div></div>
        <div class="panel">
          <h3>What to do</h3>
          <ol class="steps">
            <li><b>〔Element 1〕</b> — 〔what / why. If unknown: 〔confirm〕〕</li>
            <li><b>〔Element 2〕</b> — 〔what happens next〕</li>
          </ol>
          <!-- Optional caution; delete if not needed. -->
          <div class="note">〔Branch/warning, e.g. required field, NG retry〕</div>
        </div>
      </div>
    </section>

    <!-- Duplicate the <section class="step"> block per step; bump the badge + box numbers. -->

  </div>
</body>
</html>
```

Notes:

- Keep `.stage` free of padding/border — they shift the percentage origin.
- `.stage img { display:block; width:100% }` is required (removes the inline-image bottom gap and lets
  the image — and the boxes over it — scale with the container).
- If you keep an editable panel for local tweaking, add `contenteditable="true"` to `.panel`, but note
  edits inside the in-app viewer are **not saved**.
- Numbered badge color is a single red for all steps; if you want per-phase coloring, vary the `.head
  .badge` background per section.
