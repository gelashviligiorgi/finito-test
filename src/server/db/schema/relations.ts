import { relations } from "drizzle-orm";
import { employees } from "./employees";
import { paymentCategories } from "./payment-categories";
import { rates } from "./rates";
import { payslipLineItems, payslips } from "./payslips";

export const employeesRelations = relations(employees, ({ many }) => ({
  rates: many(rates),
  payslips: many(payslips),
}));

export const paymentCategoriesRelations = relations(paymentCategories, ({ many }) => ({
  rates: many(rates),
  payslipLineItems: many(payslipLineItems),
}));
