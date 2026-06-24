import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { OutputFileTile } from "./OutputFileTile";

interface OutputHtmlGuideViewerProps {
  /** Attachment content path, e.g. `/api/attachments/{id}/content`. */
  src: string;
  /** Accessible frame title (the artifact filename). */
  title: string;
}

/**
 * Inline, sandboxed viewer for an HTML artifact (e.g. an annotated screen guide).
 *
 * The guide HTML is agent-generated — therefore untrusted — and the server
 * serves `text/html` with `Content-Disposition: attachment` (it is intentionally
 * excluded from `INLINE_ATTACHMENT_TYPES`), so we cannot point an iframe `src` at
 * the content endpoint: that would download the file. Instead we fetch the bytes
 * and render them through `srcDoc` inside a maximally-restrictive sandbox.
 *
 * Security: `sandbox=""` grants NO capabilities — no `allow-same-origin` and no
 * `allow-scripts`. The frame runs in an opaque origin, so the guide cannot read
 * host cookies / localStorage, call same-origin APIs, run scripts, submit forms,
 * or navigate the top frame. Inline CSS and inlined `data:` images still render.
 * This is strictly safer than opening the raw file in a new tab.
 */
export function OutputHtmlGuideViewer({ src, title }: OutputHtmlGuideViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setErrored(false);
    fetch(src, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (errored) {
    // Fall back to a neutral file tile; the parent card keeps Open / Download
    // actions available for the raw artifact.
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-muted/30">
        <OutputFileTile contentType="text/html" sizeClassName="h-16 w-16 text-base" />
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white">
      <iframe
        // Untrusted, agent-generated HTML: no allow-same-origin, no allow-scripts.
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={html ?? ""}
        title={title}
        className="h-[70vh] min-h-[420px] w-full border-0 bg-white"
      />
      {html === null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
