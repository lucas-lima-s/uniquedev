const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function centsToBRL(cents: number): string {
  return brl.format(cents / 100);
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}
