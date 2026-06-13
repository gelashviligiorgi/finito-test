import type { Rate } from "@/types";

export function getApplicableRate(rates: Rate[], date: string): Rate | undefined {
  return rates
    .filter((r) => !r.dismissed && r.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.id - a.id)[0];
}

export function getAllRatesAsOf(rates: Rate[], date: string): Map<number, Rate> {
  const map = new Map<number, Rate>();

  for (const rate of rates) {
    if (rate.dismissed || rate.effectiveFrom > date) continue;

    const existing = map.get(rate.paymentCategoryId);
    if (
      !existing ||
      rate.effectiveFrom > existing.effectiveFrom ||
      (rate.effectiveFrom === existing.effectiveFrom && rate.id > existing.id)
    ) {
      map.set(rate.paymentCategoryId, rate);
    }
  }

  return map;
}
