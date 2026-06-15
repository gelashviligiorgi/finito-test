import { computeTotal, isRetroactivelyChanged } from "@/lib/payslips";
import { getAllRatesAsOf } from "@/lib/rates";
import { db } from "@/server/db";
import { payslipLineItems, payslipSnapshots, payslips, rates } from "@/server/db/schema";
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { TRPCError, publicProcedure, router } from "../trpc";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const payslipsRouter = router({
  getAll: publicProcedure.query(async () => {
    const allPayslips = await db.query.payslips.findMany({
      with: {
        employee: true,
        lineItems: true,
        snapshot: true,
      },
    });

    const allRates = await db.select().from(rates);

    return allPayslips.map((payslip) => {
      const employeeRates = allRates.filter((r) => r.employeeId === payslip.employeeId);
      const rateMap = getAllRatesAsOf(employeeRates, payslip.date);
      const currentTotal = computeTotal(payslip.lineItems, rateMap);
      const snapshotTotal = payslip.snapshot[0]?.originalTotal ?? 0;

      return {
        ...payslip,
        currentTotal,
        snapshotTotal,
        isRetroactivelyChanged: isRetroactivelyChanged(snapshotTotal, currentTotal),
      };
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        employeeId: z.number().int(),
        date: dateSchema,
        lineItems: z
          .array(
            z.object({
              paymentCategoryId: z.number().int(),
              units: z.number().positive(),
            })
          )
          .min(1),
      })
    )
    .mutation(({ input }) => {
      return db.transaction((tx) => {
        const employeeRates = tx
          .select()
          .from(rates)
          .where(eq(rates.employeeId, input.employeeId))
          .all();

        const rateMap = getAllRatesAsOf(employeeRates, input.date);
        const invalidCategory = input.lineItems.find(
          (item) => !rateMap.has(item.paymentCategoryId)
        );
        if (invalidCategory) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No rate configured for category ${invalidCategory.paymentCategoryId} on ${input.date}`,
          });
        }

        const duplicate = tx
          .select({ id: payslips.id })
          .from(payslips)
          .where(and(eq(payslips.employeeId, input.employeeId), eq(payslips.date, input.date)))
          .get();

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A payslip for this employee on ${input.date} already exists`,
          });
        }

        const [payslip] = tx
          .insert(payslips)
          .values({
            employeeId: input.employeeId,
            date: input.date,
            createdAt: new Date().toISOString(),
            createdBy: "admin",
          })
          .returning()
          .all();

        if (!payslip) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        tx.insert(payslipLineItems)
          .values(
            input.lineItems.map((item) => ({
              payslipId: payslip.id,
              paymentCategoryId: item.paymentCategoryId,
              units: item.units,
            }))
          )
          .run();

        const lineItemsForCompute = input.lineItems.map((item) => ({
          id: 0,
          payslipId: payslip.id,
          paymentCategoryId: item.paymentCategoryId,
          units: item.units,
        }));
        const originalTotal = computeTotal(lineItemsForCompute, rateMap);

        tx.insert(payslipSnapshots)
          .values({
            payslipId: payslip.id,
            originalTotal,
          })
          .run();

        return payslip;
      });
    }),

  dismissLatestRateEdit: publicProcedure
    .input(z.object({ payslipId: z.number().int() }))
    .mutation(async ({ input }) => {
      const payslip = await db.query.payslips.findFirst({
        where: eq(payslips.id, input.payslipId),
        with: { lineItems: true },
      });

      if (!payslip) throw new TRPCError({ code: "NOT_FOUND", message: "Payslip not found" });

      const categoryIds = payslip.lineItems.map((li) => li.paymentCategoryId);
      if (categoryIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payslip has no line items" });
      }

      const candidates = await db
        .select()
        .from(rates)
        .where(
          and(
            eq(rates.employeeId, payslip.employeeId),
            inArray(rates.paymentCategoryId, categoryIds),
            lte(rates.effectiveFrom, payslip.date),
            eq(rates.dismissed, false)
          )
        )
        // desc(id) is the tiebreaker: multiple edits on the same effectiveFrom date
        // form an implicit undo stack — each dismiss steps back to the previous version.
        .orderBy(desc(rates.effectiveFrom), desc(rates.id))
        .limit(1);

      const target = candidates[0];
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active rate edit found" });
      }

      const [updated] = await db
        .update(rates)
        .set({ dismissed: true })
        .where(eq(rates.id, target.id))
        .returning();

      return updated;
    }),
});
