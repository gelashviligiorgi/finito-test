import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";
import { paymentCategories } from "./payment-categories";

export const payslips = sqliteTable(
  "payslips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    date: text("date").notNull(), // YYYY-MM-DD
    createdAt: text("created_at").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (t) => [uniqueIndex("payslips_employee_date_unique").on(t.employeeId, t.date)]
);

export const payslipLineItems = sqliteTable("payslip_line_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  payslipId: integer("payslip_id")
    .notNull()
    .references(() => payslips.id),
  paymentCategoryId: integer("payment_category_id")
    .notNull()
    .references(() => paymentCategories.id),
  units: real("units").notNull(),
});

export const payslipSnapshots = sqliteTable("payslip_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  payslipId: integer("payslip_id")
    .notNull()
    .references(() => payslips.id),
  originalTotal: real("original_total").notNull(),
});

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  lineItems: many(payslipLineItems),
  snapshot: many(payslipSnapshots),
}));

export const payslipLineItemsRelations = relations(payslipLineItems, ({ one }) => ({
  payslip: one(payslips, {
    fields: [payslipLineItems.payslipId],
    references: [payslips.id],
  }),
  paymentCategory: one(paymentCategories, {
    fields: [payslipLineItems.paymentCategoryId],
    references: [paymentCategories.id],
  }),
}));

export const payslipSnapshotsRelations = relations(payslipSnapshots, ({ one }) => ({
  payslip: one(payslips, {
    fields: [payslipSnapshots.payslipId],
    references: [payslips.id],
  }),
}));
