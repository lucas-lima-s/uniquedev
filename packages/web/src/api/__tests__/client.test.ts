import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes requests with the configured base path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/health$/),
      expect.any(Object),
    );
  });

  it("throws an ApiError carrying the response status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "not found" }),
    );

    const error = await apiFetch("/missing").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
