// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OutputRow } from "./OutputRow";
import type { IssueOutputItem } from "@/lib/issue-output";

function makeItem(overrides: Partial<IssueOutputItem> = {}): IssueOutputItem {
  return {
    id: "wp-1",
    title: "guide.html",
    status: "active",
    isPrimary: false,
    createdAt: new Date("2026-05-30T12:00:00Z"),
    metadata: {
      attachmentId: "11111111-1111-4111-8111-111111111111",
      contentType: "text/html",
      byteSize: 202_101,
      contentPath: "/api/attachments/att-1/content",
      openPath: "/api/attachments/att-1/content",
      downloadPath: "/api/attachments/att-1/content?download=1",
      originalFilename: "guide.html",
    },
    degraded: false,
    ...overrides,
  } as unknown as IssueOutputItem;
}

describe("OutputRow", () => {
  it("offers a collapsed inline preview toggle for html guide outputs", () => {
    const markup = renderToStaticMarkup(<OutputRow item={makeItem()} />);
    // Toggle is present, but the (heavy) viewer stays unmounted until expanded.
    expect(markup).toContain("Show preview");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("<iframe");
    expect(markup).toContain("guide.html");
  });

  it("does not offer a preview toggle for non-guide outputs", () => {
    const pdf = makeItem();
    pdf.metadata = { ...pdf.metadata!, contentType: "application/pdf", originalFilename: "report.pdf" };
    const markup = renderToStaticMarkup(<OutputRow item={pdf} />);
    expect(markup).not.toContain("Show preview");
    expect(markup).not.toContain("aria-expanded");
    expect(markup).toContain("report.pdf");
  });

  it("mounts a fully-sandboxed inline viewer when the guide preview is expanded", () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve("<html>guide</html>") } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      flushSync(() => root.render(<OutputRow item={makeItem()} />));
      // Collapsed initially.
      expect(container.querySelector("iframe")).toBeNull();

      const toggle = container.querySelector("button[aria-expanded]") as HTMLButtonElement;
      expect(toggle).not.toBeNull();
      expect(toggle.getAttribute("aria-expanded")).toBe("false");

      flushSync(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));

      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      // Untrusted agent HTML: empty sandbox, no same-origin, no scripts.
      expect(iframe?.getAttribute("sandbox")).toBe("");
      expect(iframe?.getAttribute("sandbox")).not.toContain("allow-scripts");
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
    } finally {
      flushSync(() => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});
