import { buildApp } from "../../src/app.js";

export function buildTestApp() {
  return buildApp({ logger: false });
}
