// Pure-function unit tests — no DB, no tRPC, no mocking. Data is passed directly.
import { describe, it, expect } from "vitest";
import { computeTotal, isRetroactivelyChanged } from "./payslips";
import type { PayslipLineItem, Rate } from "@/types";

function lineItem(paymentCategoryId: number, units: number): PayslipLineItem {
  return { id: 1, payslipId: 1, paymentCategoryId, units };
}

function rateEntry(paymentCategoryId: number, amount: number): Rate {
  return {
    id: 1,
    employeeId: 1,
    paymentCategoryId,
    amount,
    effectiveFrom: "2024-01-01",
    dismissed: false,
  };
}

function rateMap(...entries: Rate[]): Map<number, Rate> {
  return new Map(entries.map((r) => [r.paymentCategoryId, r]));
}

describe("computeTotal", () => {
  it("returns 0 for an empty line items array", () => {
    expect(computeTotal([], rateMap())).toBe(0);
  });

  it("computes a single line item correctly", () => {
    const items = [lineItem(1, 8)];
    const rates = rateMap(rateEntry(1, 25));
    expect(computeTotal(items, rates)).toBe(200);
  });

  it("sums multiple line items", () => {
    const items = [lineItem(1, 8), lineItem(2, 2)];
    const rates = rateMap(rateEntry(1, 25), rateEntry(2, 37.5));
    // 8 × 25 + 2 × 37.5 = 200 + 75 = 275
    expect(computeTotal(items, rates)).toBe(275);
  });

  it("skips a line item whose category has no rate in the map", () => {
    const items = [lineItem(1, 8), lineItem(99, 4)];
    const rates = rateMap(rateEntry(1, 25));
    expect(computeTotal(items, rates)).toBe(200);
  });

  it("returns 0 when no line item has a matching rate", () => {
    const items = [lineItem(99, 8)];
    const rates = rateMap(rateEntry(1, 25));
    expect(computeTotal(items, rates)).toBe(0);
  });

  it("handles fractional units", () => {
    const items = [lineItem(1, 2.5)];
    const rates = rateMap(rateEntry(1, 20));
    expect(computeTotal(items, rates)).toBe(50);
  });

  it("handles fractional rates", () => {
    const items = [lineItem(1, 3)];
    const rates = rateMap(rateEntry(1, 33.33));
    expect(computeTotal(items, rates)).toBeCloseTo(99.99);
  });
});

describe("isRetroactivelyChanged", () => {
  it("returns false when original and current totals are identical", () => {
    expect(isRetroactivelyChanged(200, 200)).toBe(false);
  });

  it("returns false when both totals are zero", () => {
    expect(isRetroactivelyChanged(0, 0)).toBe(false);
  });

  it("returns false when the difference is clearly below EPSILON (floating-point noise)", () => {
    expect(isRetroactivelyChanged(200, 200.00009)).toBe(false);
  });

  it("returns true when the difference is clearly above EPSILON", () => {
    expect(isRetroactivelyChanged(200, 200.001)).toBe(true);
  });

  it("returns true when the current total is higher than original", () => {
    expect(isRetroactivelyChanged(200, 240)).toBe(true);
  });

  it("returns true when the current total is lower than original", () => {
    expect(isRetroactivelyChanged(240, 200)).toBe(true);
  });

  it("returns true when original is zero and current is non-zero", () => {
    expect(isRetroactivelyChanged(0, 100)).toBe(true);
  });
});
