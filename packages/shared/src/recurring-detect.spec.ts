import { describe, expect, it } from "vitest";
import { detectRecurringSuggestions } from "./recurring-detect.js";

describe("detectRecurringSuggestions", () => {
  it("suggests a monthly debit that appears across three months", () => {
    const suggestions = detectRecurringSuggestions(
      [
        {
          description: "Netflix",
          amountCents: -5590,
          date: "2026-06-05T12:00:00.000Z",
          recurringEntryId: null,
        },
        {
          description: "NETFLIX",
          amountCents: -5590,
          date: "2026-07-05T12:00:00.000Z",
          recurringEntryId: null,
        },
        {
          description: "Netflix",
          amountCents: -5490,
          date: "2026-08-05T12:00:00.000Z",
          recurringEntryId: null,
        },
      ],
      [],
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.matchPattern).toBe("netflix");
    expect(suggestions[0]?.dueDay).toBe(5);
  });

  it("skips groups already covered by an existing matchPattern", () => {
    const suggestions = detectRecurringSuggestions(
      [
        {
          description: "Aluguel",
          amountCents: -200000,
          date: "2026-06-10T12:00:00.000Z",
          recurringEntryId: null,
        },
        {
          description: "Aluguel",
          amountCents: -200000,
          date: "2026-07-10T12:00:00.000Z",
          recurringEntryId: null,
        },
        {
          description: "Aluguel",
          amountCents: -200000,
          date: "2026-08-10T12:00:00.000Z",
          recurringEntryId: null,
        },
      ],
      ["aluguel"],
    );
    expect(suggestions).toHaveLength(0);
  });

  it("skips transactions already linked to a recurring entry", () => {
    const suggestions = detectRecurringSuggestions(
      [
        {
          description: "Spotify",
          amountCents: -2190,
          date: "2026-06-01T12:00:00.000Z",
          recurringEntryId: "entry-1",
        },
        {
          description: "Spotify",
          amountCents: -2190,
          date: "2026-07-01T12:00:00.000Z",
          recurringEntryId: "entry-1",
        },
        {
          description: "Spotify",
          amountCents: -2190,
          date: "2026-08-01T12:00:00.000Z",
          recurringEntryId: "entry-1",
        },
      ],
      [],
    );
    expect(suggestions).toHaveLength(0);
  });
});
