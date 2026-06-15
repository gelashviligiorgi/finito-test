import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";
import { paymentCategories } from "./payment-categories";

export const rates = sqliteTable("rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  paymentCategoryId: integer("payment_category_id")
    .notNull()
    .references(() => paymentCategories.id),
  amount: real("amount").notNull(),
  effectiveFrom: text("effective_from").notNull(), // YYYY-MM-DD
  // Rates are never updated or deleted. To change a rate, insert a new record with
  // a newer effectiveFrom. Dismissing marks a record as superseded without erasing history.
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
});

export const ratesRelations = relations(rates, ({ one }) => ({
  employee: one(employees, {
    fields: [rates.employeeId],
    references: [employees.id],
  }),
  paymentCategory: one(paymentCategories, {
    fields: [rates.paymentCategoryId],
    references: [paymentCategories.id],
  }),
}));
