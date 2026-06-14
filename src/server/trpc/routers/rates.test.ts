// The rates router contains no application logic beyond trivial CRUD queries
// (list by employee, insert). The business logic that matters — getApplicableRate
// and getAllRatesAsOf — lives in src/lib/rates.ts and is covered by 19 unit tests
// there. Adding router-level tests here would only verify that Drizzle can INSERT
// and SELECT, not anything we own.

import { describe, it } from "vitest";

describe("rates router", () => {
  it.todo("list: returns all rates for the given employee");
  it.todo("create: inserts a new rate and returns it");
});
