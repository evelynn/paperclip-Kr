import { describe, expect, it } from "vitest";
import { normalizeCooldownSec } from "../services/heartbeat.ts";

describe("normalizeCooldownSec", () => {
  it("treats absent / blank / nullish values as no cooldown (0)", () => {
    // Preserves existing burst behavior for agents that never set the field,
    // so wiring enforcement does not silently change current deployments.
    expect(normalizeCooldownSec(undefined)).toBe(0);
    expect(normalizeCooldownSec(null)).toBe(0);
    expect(normalizeCooldownSec("")).toBe(0);
  });

  it("accepts positive numbers", () => {
    expect(normalizeCooldownSec(10)).toBe(10);
    expect(normalizeCooldownSec(3_600)).toBe(3_600);
  });

  it("floors fractional numbers", () => {
    expect(normalizeCooldownSec(30.7)).toBe(30);
  });

  it("clamps zero and negative numbers to 0", () => {
    expect(normalizeCooldownSec(0)).toBe(0);
    expect(normalizeCooldownSec(-5)).toBe(0);
  });

  it("treats non-numeric values (including numeric strings) as 0, matching the sibling heartbeat knobs", () => {
    // asNumber (shared with normalizeMaxConcurrentRuns) only accepts real
    // numbers, so a stringly-typed config value is treated as unset rather than
    // parsed. The agent config UI always commits a number for this field.
    expect(normalizeCooldownSec("30")).toBe(0);
    expect(normalizeCooldownSec("abc")).toBe(0);
    expect(normalizeCooldownSec({})).toBe(0);
    expect(normalizeCooldownSec(Number.NaN)).toBe(0);
  });
});
