import { initTRPC, TRPCError } from "@trpc/server";
import { flattenError, ZodError } from "zod";

export type Context = {
  user?: { id: string; name: string };
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Expose flattened Zod field errors so the client can map them to form fields.
        zodError: error.cause instanceof ZodError ? flattenError(error.cause) : null,
      },
    };
  },
});

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceAuth);

// Re-export TRPCError so routers import from one place.
export { TRPCError };
