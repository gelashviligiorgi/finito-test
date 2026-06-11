import { db } from "@/server/db";
import { employees } from "@/server/db/schema";
import { publicProcedure, router } from "../trpc";

export const employeesRouter = router({
  getAll: publicProcedure.query(() => {
    return db.select().from(employees);
  }),
});
