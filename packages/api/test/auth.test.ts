import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("authentication modes", () => {
  it("dev mode injects the fixed developer identity", async () => {
    const { buildApp } = await import("../src/app.js");
    const app = buildApp({ logger: false });
    const response = await app.inject({ method: "GET", url: "/me" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ email: "dev@haven.local", sub: "dev" });
  });

  it("proxy mode rejects a request carrying no identity header", async () => {
    vi.stubEnv("AUTH_MODE", "proxy");
    vi.stubEnv("AUTH_JWKS_URL", "https://127.0.0.1:9/jwks");
    vi.stubEnv("AUTH_ISSUER", "https://example.invalid");
    vi.stubEnv("AUTH_AUDIENCE", "test");
    vi.resetModules();

    const { buildApp } = await import("../src/app.js");
    const app = buildApp({ logger: false });
    const response = await app.inject({ method: "GET", url: "/accounts" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "missing_access_token" });
  });

  it("proxy mode rejects a garbage identity header (offline JWKS host, deterministic)", async () => {
    vi.stubEnv("AUTH_MODE", "proxy");
    vi.stubEnv("AUTH_JWKS_URL", "https://127.0.0.1:9/jwks");
    vi.stubEnv("AUTH_ISSUER", "https://example.invalid");
    vi.stubEnv("AUTH_AUDIENCE", "test");
    vi.resetModules();

    const { buildApp } = await import("../src/app.js");
    const app = buildApp({ logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/accounts",
      headers: { "cf-access-jwt-assertion": "garbage-token" },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_access_token" });
  });
});
