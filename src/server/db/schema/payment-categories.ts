import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const paymentCategories = sqliteTable("payment_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});
