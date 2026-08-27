import { addMonths, dateInMonth, monthOf } from "./projection/month.js";

export interface InstallmentSource {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface RemainingInstallment {
  sourceId: string;
  name: string;
  amountCents: number;
  dueDate: string;
  installmentNumber: number;
  installmentTotal: number;
}

function groupKey(tx: InstallmentSource): string {
  return `${tx.description}|${Math.abs(tx.amountCents)}|${tx.installmentTotal}`;
}

export function latestInstallmentTransactions(
  transactions: InstallmentSource[],
): InstallmentSource[] {
  const latest = new Map<string, InstallmentSource>();
  for (const tx of transactions) {
    if (
      !tx.installmentNumber ||
      !tx.installmentTotal ||
      tx.installmentNumber >= tx.installmentTotal
    ) {
      continue;
    }
    const key = groupKey(tx);
    const current = latest.get(key);
    if (!current || (tx.installmentNumber ?? 0) > (current.installmentNumber ?? 0)) {
      latest.set(key, tx);
    }
  }
  return [...latest.values()];
}

export function expandRemainingInstallments(
  tx: InstallmentSource,
  dueDay?: number,
): RemainingInstallment[] {
  const number = tx.installmentNumber;
  const total = tx.installmentTotal;
  if (!number || !total || number >= total) return [];
  const amountCents = Math.abs(tx.amountCents);
  const day = dueDay ?? Number(tx.date.slice(8, 10));
  const lines: RemainingInstallment[] = [];
  for (let offset = 1; offset <= total - number; offset += 1) {
    const installmentNumber = number + offset;
    lines.push({
      sourceId: tx.id,
      name: tx.description,
      amountCents,
      dueDate: dateInMonth(addMonths(monthOf(tx.date), offset), day),
      installmentNumber,
      installmentTotal: total,
    });
  }
  return lines;
}

export function remainingInstallmentsForMonth(
  transactions: InstallmentSource[],
  month: string,
  dueDay?: number,
): RemainingInstallment[] {
  return latestInstallmentTransactions(transactions)
    .flatMap((tx) => expandRemainingInstallments(tx, dueDay))
    .filter((line) => monthOf(line.dueDate) === month);
}
