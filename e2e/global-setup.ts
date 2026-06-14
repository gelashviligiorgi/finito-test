import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export default function globalSetup() {
  const dbPath = process.env.TEST_DATABASE_URL ?? "./test.db";

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  sqlite.close();
}
