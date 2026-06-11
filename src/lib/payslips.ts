import type { PayslipLineItem, Rate } from "@/types";

const EPSILON = 0.0001;

export function computeTotal(lineItems: PayslipLineItem[], rateMap: Map<number, Rate>): number {
  return lineItems.reduce((sum, item) => {
    const rate = rateMap.get(item.paymentCategoryId);
    if (!rate) return sum;
    return sum + item.units * rate.amount;
  }, 0);
}

export function isRetroactivelyChanged(originalTotal: number, currentTotal: number): boolean {
  return Math.abs(originalTotal - currentTotal) > EPSILON;
}
