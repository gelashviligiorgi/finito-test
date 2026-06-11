import type { InferSelectModel } from "drizzle-orm";
import type {
  employees,
  paymentCategories,
  payslipLineItems,
  payslipSnapshots,
  payslips,
  rates,
} from "@/server/db/schema";

export type Employee = InferSelectModel<typeof employees>;
export type PaymentCategory = InferSelectModel<typeof paymentCategories>;
export type Rate = InferSelectModel<typeof rates>;
export type Payslip = InferSelectModel<typeof payslips>;
export type PayslipLineItem = InferSelectModel<typeof payslipLineItems>;
export type PayslipSnapshot = InferSelectModel<typeof payslipSnapshots>;
