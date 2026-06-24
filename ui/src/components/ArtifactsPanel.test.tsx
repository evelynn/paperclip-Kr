// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { IssueWorkProduct } from "@paperclipai/shared";
import { isGuideWorkProduct } from "./ArtifactsPanel";

function makeWp(type: string, metadata: unknown): IssueWorkProduct {
  return { type, metadata } as unknown as IssueWorkProduct;
}

describe("isGuideWorkProduct", () => {
  it("is true for an html artifact work product", () => {
    expect(isGuideWorkProduct(makeWp("artifact", { contentType: "text/html" }))).toBe(true);
  });

  it("tolerates a charset parameter on the content type", () => {
    expect(isGuideWorkProduct(makeWp("artifact", { contentType: "text/html; charset=utf-8" }))).toBe(true);
  });

  it("is false for non-html artifacts", () => {
    expect(isGuideWorkProduct(makeWp("artifact", { contentType: "image/png" }))).toBe(false);
    expect(isGuideWorkProduct(makeWp("artifact", { contentType: "text/markdown" }))).toBe(false);
  });

  it("is false for non-artifact work products even when html", () => {
    expect(isGuideWorkProduct(makeWp("document", { contentType: "text/html" }))).toBe(false);
    expect(isGuideWorkProduct(makeWp("pull_request", { contentType: "text/html" }))).toBe(false);
  });

  it("is false when metadata is missing or malformed", () => {
    expect(isGuideWorkProduct(makeWp("artifact", null))).toBe(false);
    expect(isGuideWorkProduct(makeWp("artifact", {}))).toBe(false);
    expect(isGuideWorkProduct(makeWp("artifact", { contentType: 123 }))).toBe(false);
  });
});
