#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");

const result = spawnSync("vitest", ["run", ...forwardedArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
