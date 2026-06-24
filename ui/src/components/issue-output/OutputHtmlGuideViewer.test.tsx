import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OutputHtmlGuideViewer } from "./OutputHtmlGuideViewer";

describe("OutputHtmlGuideViewer", () => {
  // Guide HTML is agent-generated and untrusted. The frame MUST run with an empty
  // sandbox (opaque origin, no scripts) so it can never reach the host context,
  // and must render via srcDoc rather than pointing `src` at the (downloading)
  // attachment endpoint.
  it("renders inside a fully-restricted sandboxed iframe", () => {
    const markup = renderToStaticMarkup(
      <OutputHtmlGuideViewer src="/api/attachments/att-1/content" title="guide.html" />,
    );

    expect(markup).toContain("<iframe");
    expect(markup).toContain('sandbox=""');
    expect(markup).not.toContain("allow-same-origin");
    expect(markup).not.toContain("allow-scripts");
    expect(markup).toMatch(/referrerpolicy="no-referrer"/i);
    // The content endpoint must not be loaded as a frame source (that downloads
    // the file); the HTML is injected via srcDoc instead.
    expect(markup).not.toContain('src="/api/attachments');
  });
});
