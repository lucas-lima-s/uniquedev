import { describe, expect, it } from "vitest";
import { centsToBRL, reaisToCents } from "./money.js";

describe("money", () => {
  it("formats cents as BRL", () => {
    expect(centsToBRL(123456).replace(/ /g, " ")).toBe("R$ 1.234,56");
    expect(centsToBRL(-500).replace(/ /g, " ")).toBe("-R$ 5,00");
  });

  it("converts reais to integer cents without float drift", () => {
    expect(reaisToCents(19.99)).toBe(1999);
    expect(reaisToCents(0.1 + 0.2)).toBe(30);
  });

  it("rounds a half-cent up", () => {
    expect(reaisToCents(0.005)).toBe(1);
  });
});
