export interface Share {
  cents: number;
  pct: number;
}

export function share(partCents: number, totalCents: number): Share {
  if (totalCents === 0) {
    return { cents: partCents, pct: 0 };
  }
  return { cents: partCents, pct: Math.round((partCents / totalCents) * 10000) / 100 };
}
