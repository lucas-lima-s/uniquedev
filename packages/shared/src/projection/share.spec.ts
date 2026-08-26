import { describe, expect, it } from "vitest";
import { share } from "./share.js";

describe("share", () => {
  it("returns the part with its percentage of the total rounded to two decimals", () => {
    expect(share(2500, 10000)).toEqual({ cents: 2500, pct: 25 });
    expect(share(1, 3)).toEqual({ cents: 1, pct: 33.33 });
  });

  it("returns zero percent when the total is zero", () => {
    expect(share(500, 0)).toEqual({ cents: 500, pct: 0 });
  });

  it("supports parts larger than the total", () => {
    expect(share(15000, 10000)).toEqual({ cents: 15000, pct: 150 });
  });
});
