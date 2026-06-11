import { db } from "@/server/db";
import { paymentCategories } from "@/server/db/schema";
import { publicProcedure, router } from "../trpc";

export const paymentCategoriesRouter = router({
  getAll: publicProcedure.query(() => {
    return db.select().from(paymentCategories);
  }),
});
