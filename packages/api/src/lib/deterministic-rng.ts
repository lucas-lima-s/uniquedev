const SEED = 20260825;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function createLcg(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function seededRng(...parts: (string | number)[]): () => number {
  const key = `${SEED}:${parts.join(":")}`;
  return createLcg(hashString(key) || 1);
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick() called with an empty list");
  return item;
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

const HEX_DIGITS = "0123456789abcdef";
const UUID_VARIANT_DIGITS = "89ab";

export function deterministicUuid(...parts: (string | number)[]): string {
  const rng = seededRng("uuid", ...parts);
  let hex = "";
  for (let i = 0; i < 32; i += 1) {
    hex += HEX_DIGITS[Math.floor(rng() * 16)];
  }
  const variant = UUID_VARIANT_DIGITS[Math.floor(rng() * 4)];
  const raw = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17)}`;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`;
}
