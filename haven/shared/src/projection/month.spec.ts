import { describe, expect, it } from "vitest";
import {
  addMonths,
  dateInMonth,
  daysInMonth,
  monthEnd,
  monthLabel,
  monthOf,
  monthStart,
} from "./month.js";

describe("month helpers", () => {
  it("returns the first day of the month in local time", () => {
    expect(monthStart(new Date(2026, 7, 25))).toBe("2026-08-01");
    expect(monthStart(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("shifts months across year boundaries", () => {
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(addMonths("2026-08-01", 12)).toBe("2027-08-01");
  });

  it("knows month lengths including leap years", () => {
    expect(daysInMonth("2026-02-01")).toBe(28);
    expect(daysInMonth("2028-02-01")).toBe(29);
    expect(monthEnd("2026-04-01")).toBe("2026-04-30");
  });

  it("clamps a day of month into the month", () => {
    expect(dateInMonth("2026-02-01", 31)).toBe("2026-02-28");
    expect(dateInMonth("2026-08-01", 5)).toBe("2026-08-05");
    expect(dateInMonth("2026-08-01", 0)).toBe("2026-08-01");
  });

  it("derives the month of a date", () => {
    expect(monthOf("2026-08-25")).toBe("2026-08-01");
    expect(monthOf("2026-08-25T13:00:00.000Z")).toBe("2026-08-01");
  });

  it("formats a month label in pt-BR", () => {
    expect(monthLabel("2026-08-01")).toBe("agosto de 2026");
  });
});
