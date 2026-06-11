import { getAllRatesAsOf } from "@/lib/rates";
import { db } from "@/server/db";
import { rates } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError, publicProcedure, router } from "../trpc";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const ratesRouter = router({
  getByEmployee: publicProcedure
    .input(
      z.object({
        employeeId: z.number().int(),
        asOfDate: dateSchema,
      })
    )
    .query(async ({ input }) => {
      const allRates = await db.select().from(rates).where(eq(rates.employeeId, input.employeeId));

      const rateMap = getAllRatesAsOf(allRates, input.asOfDate);
      return Array.from(rateMap.values());
    }),

  upsert: publicProcedure
    .input(
      z.object({
        employeeId: z.number().int(),
        paymentCategoryId: z.number().int(),
        amount: z.number().positive(),
        effectiveFrom: dateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [rate] = await db.insert(rates).values(input).returning();
      if (!rate) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return rate;
    }),
});
