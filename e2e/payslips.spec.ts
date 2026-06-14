import type { Page } from "@playwright/test";
import { test, expect, seedRate } from "./fixtures";

const today = new Date().toISOString().slice(0, 10);

// Predictable IDs after resetAndSeed():
//   employees: John Doe=1, Jane Smith=2, Bob Johnson=3
//   categories: Hourly Rate=1, Overtime Hourly=2, Commission=3, Global Pay=4
const JOHN_DOE_ID = 1;
const JANE_SMITH_ID = 2;
const HOURLY_RATE_ID = 1;

async function createPayslip(
  page: Page,
  opts: { employee?: string; category?: string; units?: string; date?: string } = {}
) {
  const { employee = "John Doe", category = "Hourly Rate", units = "8", date } = opts;

  await page.getByRole("button", { name: "New Payslip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: employee }).click();
  if (date) {
    await dialog.locator('input[type="date"]').fill(date);
  }
  await dialog.locator('[data-slot="select-trigger"]').click();
  await page.getByRole("option", { name: category }).click();
  await dialog.getByRole("spinbutton").fill(units);
  await dialog.getByRole("button", { name: "Create payslip" }).click();
}

test.describe("Payslips page", () => {
  test.describe("Page structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/payslips");
    });

    test("shows Payslips heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Payslips" })).toBeVisible();
    });

    test("shows effective date subtitle", async ({ page }) => {
      await expect(page.getByText(/Rates applied as of/)).toBeVisible();
    });

    test("shows New Payslip button", async ({ page }) => {
      await expect(page.getByRole("button", { name: "New Payslip" })).toBeVisible();
    });

    test("shows empty state when no payslips exist", async ({ page }) => {
      await expect(page.getByText("No payslips yet.")).toBeVisible();
    });

    test("does not show table when no payslips exist", async ({ page }) => {
      await expect(page.getByRole("table")).not.toBeVisible();
    });
  });

  test.describe("New Payslip dialog", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/payslips");
    });

    test("opens dialog with New Payslip title", async ({ page }) => {
      await page.getByRole("button", { name: "New Payslip" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("heading", { name: "New Payslip" })).toBeVisible();
    });

    test("dialog closes when close button is clicked", async ({ page }) => {
      await page.getByRole("button", { name: "New Payslip" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("Creating a payslip", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });
      await page.goto("/payslips");
    });

    test("payslip appears in the table after creation", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("row").filter({ hasText: "John Doe" })).toBeVisible();
    });

    test("shows correct employee name", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("cell", { name: "John Doe" })).toBeVisible();
    });

    test("shows today as the payslip date", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("cell", { name: today })).toBeVisible();
    });

    test("shows correct total (8 units × $25.00 = $200.00)", async ({ page }) => {
      await createPayslip(page);
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("$200.00").first()).toBeVisible();
    });

    test("shows OK status badge", async ({ page }) => {
      await createPayslip(page);
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("OK")).toBeVisible();
    });

    test("no Dismiss button on newly created payslip", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("button", { name: "Dismiss" })).not.toBeVisible();
    });

    test("dialog closes after successful creation", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("empty state disappears after first payslip is created", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByText("No payslips yet.")).not.toBeVisible();
    });

    test("shows correct table column headers", async ({ page }) => {
      await createPayslip(page);
      await expect(page.getByRole("columnheader", { name: "Employee" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Original Total" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Current Total" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    });

    test("payslips for multiple employees appear as separate rows", async ({ page }) => {
      seedRate({
        employeeId: JANE_SMITH_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 30,
        effectiveFrom: "2024-01-01",
      });
      await createPayslip(page, { employee: "John Doe", units: "8" });
      await createPayslip(page, { employee: "Jane Smith", units: "4" });
      await expect(page.getByRole("cell", { name: "John Doe" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Jane Smith" })).toBeVisible();
    });
  });

  test.describe("Retroactive rate change", () => {
    // Setup: seed $25/hr → create payslip (8 units = $200) → raise rate to $30 via UI
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });

      await page.goto("/payslips");
      await createPayslip(page);
      await expect(page.getByRole("cell", { name: "John Doe" })).toBeVisible();

      // Edit rate to $30 (inserts new rate record with effectiveFrom = today)
      await page.goto("/rates");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Edit" }).click();
      await row.getByRole("spinbutton").fill("30");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$30.00")).toBeVisible();

      await page.goto("/payslips");
    });

    test("shows Rate changed badge", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("Rate changed")).toBeVisible();
    });

    test("original total is preserved at the snapshot amount ($200.00)", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("$200.00")).toBeVisible();
    });

    test("current total reflects the new rate (8 × $30.00 = $240.00)", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("$240.00")).toBeVisible();
    });

    test("Dismiss button appears on the changed row", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByRole("button", { name: "Dismiss" })).toBeVisible();
    });
  });

  test.describe("Dismissing a retroactive change", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });

      await page.goto("/payslips");
      await createPayslip(page);
      await expect(page.getByRole("cell", { name: "John Doe" })).toBeVisible();

      await page.goto("/rates");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Edit" }).click();
      await row.getByRole("spinbutton").fill("30");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$30.00")).toBeVisible();

      await page.goto("/payslips");
      // Verify the changed state before dismissing
      await expect(
        page.getByRole("row").filter({ hasText: "John Doe" }).getByText("Rate changed")
      ).toBeVisible();
    });

    test("status changes to OK after dismissing", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await row.getByRole("button", { name: "Dismiss" }).click();
      await expect(row.getByText("OK")).toBeVisible();
      await expect(row.getByText("Rate changed")).not.toBeVisible();
    });

    test("current total reverts to original amount after dismissing", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await row.getByRole("button", { name: "Dismiss" }).click();
      await expect(row.getByText("$240.00")).not.toBeVisible();
    });

    test("Dismiss button disappears after dismissing", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await row.getByRole("button", { name: "Dismiss" }).click();
      await expect(row.getByRole("button", { name: "Dismiss" })).not.toBeVisible();
    });
  });

  test.describe("Multiple retroactive rate changes", () => {
    // Three distinct effectiveFrom dates so each dismiss peels back exactly one layer:
    //   Rate 1  $25  2024-01-01  ← snapshot rate at payslip creation
    //   Rate 2  $30  2025-01-01  ← first raise (retroactive)
    //   Rate 3  $35  2026-01-01  ← second raise (retroactive), most recent
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });

      await page.goto("/payslips");
      await createPayslip(page); // 8 × $25 = $200 snapshot
      await expect(page.getByRole("cell", { name: "John Doe" })).toBeVisible();

      // Seed two additional rates after the payslip is created
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 30,
        effectiveFrom: "2025-01-01",
      });
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 35,
        effectiveFrom: "2026-01-01",
      });

      await page.goto("/payslips");
    });

    test("current total reflects the highest applicable rate ($35)", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("$280.00")).toBeVisible(); // 8 × $35
      await expect(row.getByText("Rate changed")).toBeVisible();
    });

    test("first dismiss peels back to intermediate rate and keeps Rate changed badge", async ({
      page,
    }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await row.getByRole("button", { name: "Dismiss" }).click();
      await expect(row.getByText("$280.00")).not.toBeVisible();
      await expect(row.getByText("$240.00")).toBeVisible(); // 8 × $30
      await expect(row.getByText("Rate changed")).toBeVisible(); // still different from $200 snapshot
    });

    test("second dismiss reverts to original snapshot rate and clears Rate changed", async ({
      page,
    }) => {
      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await row.getByRole("button", { name: "Dismiss" }).click(); // dismiss $35
      await row.getByRole("button", { name: "Dismiss" }).click(); // dismiss $30
      await expect(row.getByText("$240.00")).not.toBeVisible();
      await expect(row.getByText("OK")).toBeVisible();
      await expect(row.getByRole("button", { name: "Dismiss" })).not.toBeVisible();
    });
  });

  test.describe("Payslip with multiple line items", () => {
    // Full standalone setup — no shared beforeEach that would create a conflicting payslip
    test("dismissing a rate change reverts the combined total correctly", async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: 2, // Overtime Hourly
        amount: 37.5,
        effectiveFrom: "2024-01-01",
      });

      await page.goto("/payslips");

      // Create payslip with two line items: 8 × $25 + 2 × $37.50 = $275
      await page.getByRole("button", { name: "New Payslip" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();

      const triggers = dialog.locator('[data-slot="select-trigger"]');
      await triggers.first().click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();
      await dialog.getByRole("spinbutton").first().fill("8");

      await dialog.getByRole("button", { name: "Add row" }).click();
      await triggers.nth(1).click();
      await page.getByRole("option", { name: "Overtime Hourly" }).click();
      await dialog.getByRole("spinbutton").nth(1).fill("2");

      await dialog.getByRole("button", { name: "Create payslip" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      const row = page.getByRole("row").filter({ hasText: "John Doe" });
      await expect(row.getByText("$275.00").first()).toBeVisible();
      await expect(row.getByText("OK")).toBeVisible();

      // Retroactively raise Overtime Hourly: $37.50 → $45
      await page.goto("/rates");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      const rateRow = page.getByRole("row").filter({ hasText: "Overtime Hourly" });
      await rateRow.getByRole("button", { name: "Edit" }).click();
      await rateRow.getByRole("spinbutton").fill("45");
      await rateRow.getByRole("button", { name: "Save" }).click();
      await expect(rateRow.getByText("$45.00")).toBeVisible();

      await page.goto("/payslips");

      // Current: 8 × $25 + 2 × $45 = $290
      await expect(row.getByText("$290.00")).toBeVisible();
      await expect(row.getByText("Rate changed")).toBeVisible();

      // Dismiss: reverts Overtime Hourly to $37.50 → total back to $275
      await row.getByRole("button", { name: "Dismiss" }).click();
      await expect(row.getByText("$290.00")).not.toBeVisible();
      await expect(row.getByText("OK")).toBeVisible();
      await expect(row.getByRole("button", { name: "Dismiss" })).not.toBeVisible();
    });
  });
});
