import { router } from "./trpc";
import { employeesRouter } from "./routers/employees";
import { paymentCategoriesRouter } from "./routers/payment-categories";
import { ratesRouter } from "./routers/rates";
import { payslipsRouter } from "./routers/payslips";

export const appRouter = router({
  employees: employeesRouter,
  paymentCategories: paymentCategoriesRouter,
  rates: ratesRouter,
  payslips: payslipsRouter,
});

export type AppRouter = typeof appRouter;
