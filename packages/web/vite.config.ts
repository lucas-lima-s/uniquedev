import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { version: string };

const rawBase = process.env.VITE_BASE_PATH ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
const apiPathPrefix = `${base}api`;

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    proxy: {
      [apiPathPrefix]: {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${apiPathPrefix}`), ""),
      },
    },
  },
});
