import { test as base, expect } from "@playwright/test";
import Database from "better-sqlite3";

const TEST_DB_PATH = process.env.TEST_DATABASE_URL ?? "./test.db";

function resetAndSeed() {
  const sqlite = new Database(TEST_DB_PATH);
  sqlite.pragma("busy_timeout = 5000");
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

  // Reset auto-increment counters so IDs are predictable across tests
  try {
    sqlite.prepare("DELETE FROM sqlite_sequence").run();
  } catch {
    // sqlite_sequence doesn't exist until first AUTOINCREMENT insert
  }

  const insertEmployee = sqlite.prepare("INSERT INTO employees (name, birthday) VALUES (?, ?)");
  insertEmployee.run("John Doe", "1990-03-15");
  insertEmployee.run("Jane Smith", "1985-07-22");
  insertEmployee.run("Bob Johnson", "1992-11-08");

  const insertCategory = sqlite.prepare("INSERT INTO payment_categories (name) VALUES (?)");
  insertCategory.run("Hourly Rate");
  insertCategory.run("Overtime Hourly");
  insertCategory.run("Commission");
  insertCategory.run("Global Pay");

  sqlite.pragma("foreign_keys = ON");
  sqlite.close();
}

export function seedRate(opts: {
  employeeId: number;
  paymentCategoryId: number;
  amount: number;
  effectiveFrom: string;
}) {
  const sqlite = new Database(TEST_DB_PATH);
  sqlite.pragma("busy_timeout = 5000");
  sqlite
    .prepare(
      "INSERT INTO rates (employee_id, payment_category_id, amount, effective_from, dismissed) VALUES (?, ?, ?, ?, 0)"
    )
    .run(opts.employeeId, opts.paymentCategoryId, opts.amount, opts.effectiveFrom);
  sqlite.close();
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    resetAndSeed();
    await provide(page);
  },
});

export { expect };
