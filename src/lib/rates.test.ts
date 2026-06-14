// Pure-function unit tests — no DB, no tRPC, no mocking. Data is passed directly.
import { describe, it, expect } from "vitest";
import { getApplicableRate, getAllRatesAsOf } from "./rates";
import type { Rate } from "@/types";

function rate(overrides: Partial<Rate> & { id: number }): Rate {
  return {
    employeeId: 1,
    paymentCategoryId: 1,
    amount: 10,
    effectiveFrom: "2024-01-01",
    dismissed: false,
    ...overrides,
  };
}

describe("getApplicableRate", () => {
  it("returns undefined for an empty array", () => {
    expect(getApplicableRate([], "2024-06-01")).toBeUndefined();
  });

  it("returns undefined when all rates are dismissed", () => {
    const rates = [rate({ id: 1, dismissed: true }), rate({ id: 2, dismissed: true })];
    expect(getApplicableRate(rates, "2024-06-01")).toBeUndefined();
  });

  it("returns undefined when all rates are after the requested date", () => {
    const rates = [
      rate({ id: 1, effectiveFrom: "2025-01-01" }),
      rate({ id: 2, effectiveFrom: "2026-01-01" }),
    ];
    expect(getApplicableRate(rates, "2024-06-01")).toBeUndefined();
  });

  it("returns the only matching rate", () => {
    const r = rate({ id: 1, effectiveFrom: "2024-01-01", amount: 25 });
    expect(getApplicableRate([r], "2024-06-01")).toEqual(r);
  });

  it("includes a rate whose effectiveFrom equals the requested date", () => {
    const r = rate({ id: 1, effectiveFrom: "2024-06-01" });
    expect(getApplicableRate([r], "2024-06-01")).toEqual(r);
  });

  it("excludes a rate whose effectiveFrom is one day after the requested date", () => {
    const r = rate({ id: 1, effectiveFrom: "2024-06-02" });
    expect(getApplicableRate([r], "2024-06-01")).toBeUndefined();
  });

  it("picks the rate with the highest effectiveFrom among multiple candidates", () => {
    const old = rate({ id: 1, effectiveFrom: "2023-01-01", amount: 20 });
    const mid = rate({ id: 2, effectiveFrom: "2024-01-01", amount: 25 });
    const latest = rate({ id: 3, effectiveFrom: "2024-06-01", amount: 30 });
    expect(getApplicableRate([old, latest, mid], "2025-01-01")).toEqual(latest);
  });

  it("breaks ties on the same effectiveFrom by picking the higher id", () => {
    const first = rate({ id: 10, effectiveFrom: "2024-01-01", amount: 25 });
    const second = rate({ id: 20, effectiveFrom: "2024-01-01", amount: 30 });
    expect(getApplicableRate([first, second], "2024-06-01")).toEqual(second);
  });

  it("ignores a dismissed rate even when it has the highest effectiveFrom", () => {
    const active = rate({ id: 1, effectiveFrom: "2024-01-01", amount: 25 });
    const dismissed = rate({ id: 2, effectiveFrom: "2024-06-01", amount: 30, dismissed: true });
    expect(getApplicableRate([active, dismissed], "2025-01-01")).toEqual(active);
  });

  it("returns the only non-dismissed candidate when others are dismissed or future", () => {
    const target = rate({ id: 2, effectiveFrom: "2024-03-01", amount: 25 });
    const rates = [
      rate({ id: 1, effectiveFrom: "2024-01-01", dismissed: true }),
      target,
      rate({ id: 3, effectiveFrom: "2025-01-01" }),
    ];
    expect(getApplicableRate(rates, "2024-06-01")).toEqual(target);
  });
});

describe("getAllRatesAsOf", () => {
  it("returns an empty map for an empty array", () => {
    expect(getAllRatesAsOf([], "2024-06-01").size).toBe(0);
  });

  it("returns one entry per payment category", () => {
    const rates = [
      rate({ id: 1, paymentCategoryId: 1, amount: 25 }),
      rate({ id: 2, paymentCategoryId: 2, amount: 37.5 }),
    ];
    const map = getAllRatesAsOf(rates, "2024-06-01");
    expect(map.size).toBe(2);
    expect(map.has(1)).toBe(true);
    expect(map.has(2)).toBe(true);
  });

  it("picks the most recent effectiveFrom for each category", () => {
    const old = rate({ id: 1, paymentCategoryId: 1, effectiveFrom: "2023-01-01", amount: 20 });
    const latest = rate({ id: 2, paymentCategoryId: 1, effectiveFrom: "2024-01-01", amount: 25 });
    const map = getAllRatesAsOf([old, latest], "2025-01-01");
    expect(map.get(1)).toEqual(latest);
  });

  it("breaks ties on the same effectiveFrom by picking the higher id", () => {
    const first = rate({ id: 5, paymentCategoryId: 1, effectiveFrom: "2024-01-01", amount: 25 });
    const second = rate({ id: 9, paymentCategoryId: 1, effectiveFrom: "2024-01-01", amount: 30 });
    expect(getAllRatesAsOf([first, second], "2024-06-01").get(1)).toEqual(second);
  });

  it("excludes dismissed rates", () => {
    const dismissed = rate({ id: 1, paymentCategoryId: 1, dismissed: true, amount: 25 });
    const map = getAllRatesAsOf([dismissed], "2024-06-01");
    expect(map.has(1)).toBe(false);
  });

  it("falls back to an older active rate when the newest is dismissed", () => {
    const active = rate({ id: 1, paymentCategoryId: 1, effectiveFrom: "2023-01-01", amount: 20 });
    const dismissed = rate({
      id: 2,
      paymentCategoryId: 1,
      effectiveFrom: "2024-01-01",
      amount: 25,
      dismissed: true,
    });
    expect(getAllRatesAsOf([active, dismissed], "2025-01-01").get(1)).toEqual(active);
  });

  it("excludes rates whose effectiveFrom is after the requested date", () => {
    const future = rate({ id: 1, paymentCategoryId: 1, effectiveFrom: "2025-01-01" });
    expect(getAllRatesAsOf([future], "2024-06-01").has(1)).toBe(false);
  });

  it("includes a rate whose effectiveFrom equals the requested date", () => {
    const r = rate({ id: 1, paymentCategoryId: 1, effectiveFrom: "2024-06-01" });
    expect(getAllRatesAsOf([r], "2024-06-01").has(1)).toBe(true);
  });

  it("handles multiple categories independently with mixed dismissed/future rates", () => {
    const rates = [
      rate({ id: 1, paymentCategoryId: 1, effectiveFrom: "2023-01-01", amount: 20 }),
      rate({
        id: 2,
        paymentCategoryId: 1,
        effectiveFrom: "2024-01-01",
        amount: 25,
        dismissed: true,
      }),
      rate({ id: 3, paymentCategoryId: 2, effectiveFrom: "2024-01-01", amount: 37.5 }),
      rate({ id: 4, paymentCategoryId: 2, effectiveFrom: "2026-01-01", amount: 40 }),
    ];
    const map = getAllRatesAsOf(rates, "2024-06-01");
    expect(map.get(1)?.amount).toBe(20); // newest active for cat 1
    expect(map.get(2)?.amount).toBe(37.5); // cat 2 future rate excluded
  });
});
