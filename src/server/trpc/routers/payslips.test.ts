// Integration tests for the payslips tRPC router. The DB singleton is replaced
// with an in-memory SQLite instance (schema migrated on startup) so procedures
// exercise real SQL logic without a running server or test database on disk.
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type BetterSqlite3 from "better-sqlite3";

// var (not let) avoids the temporal dead zone: vi.mock is hoisted before declarations,
// so let would throw "Cannot access before initialization" when the factory assigns it.
// eslint-disable-next-line no-var
var sqlite: InstanceType<typeof BetterSqlite3>;

// Inline (not a __mocks__ file) because the mock must expose `sqlite` back to this
// file so test helpers can reset and seed the DB between tests. That tight coupling
// makes it unsuitable for sharing across test files.
vi.mock("@/server/db", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const schema = await import("@/server/db/schema");
  const { join } = await import("path");

  const db_sqlite = new Database(":memory:");
  db_sqlite.pragma("foreign_keys = ON");
  const db = drizzle(db_sqlite, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });

  sqlite = db_sqlite;
  return { db };
});

import { appRouter } from "@/server/trpc/router";

const caller = appRouter.createCaller({});

// ─── DB helpers ─────────────────────────────────────────────────────────────

function reset() {
  sqlite.pragma("foreign_keys = OFF");
  for (const table of [
    "payslip_snapshots",
    "payslip_line_items",
    "payslips",
    "rates",
    "employees",
    "payment_categories",
  ]) {
    sqlite.prepare(`DELETE FROM ${table}`).run();
  }
  try {
    sqlite.prepare("DELETE FROM sqlite_sequence").run();
  } catch {
    // table doesn't exist before first AUTOINCREMENT insert
  }
  sqlite.pragma("foreign_keys = ON");
}

function addEmployee(name: string, birthday = "1990-01-01"): number {
  return (
    sqlite
      .prepare("INSERT INTO employees (name, birthday) VALUES (?, ?) RETURNING id")
      .get(name, birthday) as { id: number }
  ).id;
}

function addCategory(name: string): number {
  return (
    sqlite.prepare("INSERT INTO payment_categories (name) VALUES (?) RETURNING id").get(name) as {
      id: number;
    }
  ).id;
}

function addRate(
  employeeId: number,
  categoryId: number,
  amount: number,
  effectiveFrom: string,
  dismissed = false
) {
  sqlite
    .prepare(
      "INSERT INTO rates (employee_id, payment_category_id, amount, effective_from, dismissed) VALUES (?, ?, ?, ?, ?)"
    )
    .run(employeeId, categoryId, amount, effectiveFrom, dismissed ? 1 : 0);
}

async function catchTRPC(p: Promise<unknown>): Promise<TRPCError> {
  const err = await p.catch((e) => e);
  if (!(err instanceof TRPCError)) throw new Error(`Expected TRPCError, got: ${String(err)}`);
  return err;
}

// ─── payslips.create ─────────────────────────────────────────────────────────

describe("payslips.create", () => {
  let empId: number;
  let catId: number;

  beforeEach(() => {
    reset();
    empId = addEmployee("John Doe");
    catId = addCategory("Hourly Rate");
  });

  it("throws BAD_REQUEST when the category has no rate for the employee", async () => {
    const err = await catchTRPC(
      caller.payslips.create({
        employeeId: empId,
        date: "2024-06-01",
        lineItems: [{ paymentCategoryId: catId, units: 8 }],
      })
    );
    expect(err.code).toBe("BAD_REQUEST");
  });

  it("throws BAD_REQUEST when the rate's effectiveFrom is after the payslip date", async () => {
    addRate(empId, catId, 25, "2025-01-01"); // future rate
    const err = await catchTRPC(
      caller.payslips.create({
        employeeId: empId,
        date: "2024-06-01",
        lineItems: [{ paymentCategoryId: catId, units: 8 }],
      })
    );
    expect(err.code).toBe("BAD_REQUEST");
  });

  it("throws CONFLICT for a duplicate (employeeId, date) payslip", async () => {
    addRate(empId, catId, 25, "2024-01-01");
    await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [{ paymentCategoryId: catId, units: 8 }],
    });

    const err = await catchTRPC(
      caller.payslips.create({
        employeeId: empId,
        date: "2024-06-01",
        lineItems: [{ paymentCategoryId: catId, units: 8 }],
      })
    );
    expect(err.code).toBe("CONFLICT");
  });

  it("saves the correct originalTotal snapshot for a single line item", async () => {
    addRate(empId, catId, 25, "2024-01-01");
    await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [{ paymentCategoryId: catId, units: 8 }], // 8 × 25 = 200
    });

    const row = sqlite.prepare("SELECT original_total FROM payslip_snapshots LIMIT 1").get() as {
      original_total: number;
    };
    expect(row.original_total).toBe(200);
  });

  it("saves the correct originalTotal snapshot for multiple line items", async () => {
    const cat2Id = addCategory("Overtime");
    addRate(empId, catId, 25, "2024-01-01");
    addRate(empId, cat2Id, 37.5, "2024-01-01");

    await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [
        { paymentCategoryId: catId, units: 8 }, // 200
        { paymentCategoryId: cat2Id, units: 2 }, // 75
      ],
    });

    const row = sqlite.prepare("SELECT original_total FROM payslip_snapshots LIMIT 1").get() as {
      original_total: number;
    };
    expect(row.original_total).toBe(275);
  });

  it("uses the applicable rate at the payslip date, not a later rate", async () => {
    addRate(empId, catId, 25, "2024-01-01"); // rate at creation
    addRate(empId, catId, 50, "2025-01-01"); // future rate — must not be used

    await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [{ paymentCategoryId: catId, units: 8 }],
    });

    const row = sqlite.prepare("SELECT original_total FROM payslip_snapshots LIMIT 1").get() as {
      original_total: number;
    };
    expect(row.original_total).toBe(200); // 8 × $25, not 8 × $50
  });
});

// ─── payslips.dismissLatestRateEdit ─────────────────────────────────────────

describe("payslips.dismissLatestRateEdit", () => {
  let empId: number;
  let catHourly: number;
  let catOvertime: number;

  beforeEach(() => {
    reset();
    empId = addEmployee("John Doe");
    catHourly = addCategory("Hourly Rate");
    catOvertime = addCategory("Overtime Hourly");
  });

  it("throws NOT_FOUND for a non-existent payslipId", async () => {
    const err = await catchTRPC(caller.payslips.dismissLatestRateEdit({ payslipId: 9999 }));
    expect(err.code).toBe("NOT_FOUND");
  });

  it("throws NOT_FOUND when all rates are already dismissed", async () => {
    addRate(empId, catHourly, 25, "2024-01-01");
    const payslip = await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [{ paymentCategoryId: catHourly, units: 8 }],
    });

    // Manually dismiss the only rate after payslip creation
    sqlite.prepare("UPDATE rates SET dismissed = 1").run();

    const err = await catchTRPC(caller.payslips.dismissLatestRateEdit({ payslipId: payslip.id }));
    expect(err.code).toBe("NOT_FOUND");
  });

  it("marks the dismissed rate as dismissed and returns the updated record", async () => {
    addRate(empId, catHourly, 25, "2024-01-01");
    const payslip = await caller.payslips.create({
      employeeId: empId,
      date: "2024-06-01",
      lineItems: [{ paymentCategoryId: catHourly, units: 8 }],
    });

    const result = await caller.payslips.dismissLatestRateEdit({ payslipId: payslip.id });
    expect(result?.dismissed).toBe(true);
  });

  it("across two categories, dismisses the one with the most recent effectiveFrom", async () => {
    // Hourly: 2023-01-01 (older)   Overtime: 2024-01-01 (newer) ← should be dismissed
    addRate(empId, catHourly, 25, "2023-01-01");
    addRate(empId, catOvertime, 37.5, "2024-01-01");

    const payslip = await caller.payslips.create({
      employeeId: empId,
      date: "2025-01-01",
      lineItems: [
        { paymentCategoryId: catHourly, units: 8 },
        { paymentCategoryId: catOvertime, units: 2 },
      ],
    });

    await caller.payslips.dismissLatestRateEdit({ payslipId: payslip.id });

    const dismissed = sqlite
      .prepare("SELECT payment_category_id FROM rates WHERE dismissed = 1")
      .all() as { payment_category_id: number }[];

    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].payment_category_id).toBe(catOvertime);
  });

  it("when two categories share the same effectiveFrom, dismisses the one with the higher id", async () => {
    // Both inserted on the same date — catHourly gets lower id, catOvertime higher id
    addRate(empId, catHourly, 25, "2024-01-01");
    addRate(empId, catOvertime, 37.5, "2024-01-01");

    const payslip = await caller.payslips.create({
      employeeId: empId,
      date: "2025-01-01",
      lineItems: [
        { paymentCategoryId: catHourly, units: 8 },
        { paymentCategoryId: catOvertime, units: 2 },
      ],
    });

    await caller.payslips.dismissLatestRateEdit({ payslipId: payslip.id });

    const dismissed = sqlite
      .prepare("SELECT payment_category_id FROM rates WHERE dismissed = 1")
      .all() as { payment_category_id: number }[];

    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].payment_category_id).toBe(catOvertime); // higher id
  });
});
