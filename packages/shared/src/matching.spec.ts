import { describe, expect, it } from "vitest";
import {
  descriptionMatchesPattern,
  matchingCategoryRule,
  matchingRecurringEntry,
  normalizeDescription,
} from "./matching.js";

describe("normalizeDescription", () => {
  it("lowercases, strips accents, and collapses whitespace", () => {
    expect(normalizeDescription("  iFood  Centro  ")).toBe("ifood centro");
    expect(normalizeDescription("Pão de Minas")).toBe("pao de minas");
  });
});

describe("descriptionMatchesPattern", () => {
  it("matches a normalized substring", () => {
    expect(descriptionMatchesPattern("IFOOD CENTRO", "ifood")).toBe(true);
    expect(descriptionMatchesPattern("Mercado Extra", "ifood")).toBe(false);
  });
});

describe("matchingCategoryRule", () => {
  it("picks the highest priority match", () => {
    const rule = matchingCategoryRule("Netflix mensalidade", [
      { pattern: "netflix", priority: 1, id: "low" },
      { pattern: "netflix mensalidade", priority: 2, id: "high" },
    ]);
    expect(rule?.id).toBe("high");
  });
});

describe("matchingRecurringEntry", () => {
  it("returns the first entry whose matchPattern hits", () => {
    const entry = matchingRecurringEntry("Aluguel apto 12", [
      { matchPattern: null },
      { matchPattern: "aluguel" },
    ]);
    expect(entry?.matchPattern).toBe("aluguel");
  });
});
