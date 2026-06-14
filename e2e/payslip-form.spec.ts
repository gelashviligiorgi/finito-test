import type { Page } from "@playwright/test";
import { test, expect, seedRate } from "./fixtures";

const today = new Date().toISOString().slice(0, 10);

// Predictable IDs after resetAndSeed():
//   employees: John Doe=1, Jane Smith=2, Bob Johnson=3
//   categories: Hourly Rate=1, Overtime Hourly=2, Commission=3, Global Pay=4
const JOHN_DOE_ID = 1;
const HOURLY_RATE_ID = 1;
const OVERTIME_HOURLY_ID = 2;

async function openDialog(page: Page) {
  await page.goto("/payslips");
  await page.getByRole("button", { name: "New Payslip" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Create Payslip Form", () => {
  test.describe("Initial state", () => {
    test.beforeEach(async ({ page }) => {
      await openDialog(page);
    });

    test("employee combobox shows Select an employee… placeholder", async ({ page }) => {
      await expect(page.getByRole("combobox")).toContainText("Select an employee…");
    });

    test("date input defaults to today", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator('input[type="date"]')).toHaveValue(today);
    });

    test("shows prompt to select an employee before line items appear", async ({ page }) => {
      await expect(page.getByText("Select an employee to see available categories.")).toBeVisible();
    });

    test("Create payslip button is disabled", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });

  test.describe("Employee combobox", () => {
    test.beforeEach(async ({ page }) => {
      await openDialog(page);
    });

    test("opens and shows all seeded employees", async ({ page }) => {
      await page.getByRole("combobox").click();
      await expect(page.getByRole("option", { name: "John Doe" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Jane Smith" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Bob Johnson" })).toBeVisible();
    });

    test("shows selected employee name after selection", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      await expect(page.getByRole("combobox")).toContainText("John Doe");
    });

    test("search filters employees by name", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByPlaceholder("Search employees…").fill("Jane");
      await expect(page.getByRole("option", { name: "Jane Smith" })).toBeVisible();
      await expect(page.getByRole("option", { name: "John Doe" })).not.toBeVisible();
    });

    test("search with no match shows empty message", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByPlaceholder("Search employees…").fill("xyz");
      await expect(page.getByText("No employee found.")).toBeVisible();
    });
  });

  test.describe("Employee without rates", () => {
    test.beforeEach(async ({ page }) => {
      await openDialog(page);
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("shows no rates configured warning", async ({ page }) => {
      await expect(page.getByText(/No rates configured for this employee/)).toBeVisible();
    });

    test("includes the payslip date in the warning", async ({ page }) => {
      await expect(page.getByText(new RegExp(`No rates configured.*${today}`))).toBeVisible();
    });

    test("does not show the line items section", async ({ page }) => {
      await expect(page.getByText("Category", { exact: true })).not.toBeVisible();
    });

    test("Create payslip button stays disabled", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });

  test.describe("Employee with rates", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });
      await openDialog(page);
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("shows Category and Units column headers", async ({ page }) => {
      await expect(page.getByText("Category", { exact: true })).toBeVisible();
      await expect(page.getByText("Units", { exact: true })).toBeVisible();
    });

    test("shows one empty row initially", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator('[data-slot="select-trigger"]')).toHaveCount(1);
    });

    test("shows available rated categories in the select", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.locator('[data-slot="select-trigger"]').click();
      await expect(page.getByRole("option", { name: "Hourly Rate" })).toBeVisible();
    });

    test("categories without rates for this employee are not shown", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.locator('[data-slot="select-trigger"]').click();
      await expect(page.getByRole("option", { name: "Overtime Hourly" })).not.toBeVisible();
      await expect(page.getByRole("option", { name: "Commission" })).not.toBeVisible();
      await expect(page.getByRole("option", { name: "Global Pay" })).not.toBeVisible();
    });

    test("button disabled until category and units are both filled", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();

      await dialog.locator('[data-slot="select-trigger"]').click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();

      await dialog.getByRole("spinbutton").fill("8");
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeEnabled();
    });

    test("button disabled when units is 0", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.locator('[data-slot="select-trigger"]').click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();
      await dialog.getByRole("spinbutton").fill("0");
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });

  test.describe("Line item management", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: OVERTIME_HOURLY_ID,
        amount: 37.5,
        effectiveFrom: "2024-01-01",
      });
      await openDialog(page);
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("Remove row button is disabled when only one row exists", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Remove row" })).toBeDisabled();
    });

    test("Add row button adds a second line item row", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Add row" }).click();
      await expect(dialog.locator('[data-slot="select-trigger"]')).toHaveCount(2);
    });

    test("Remove row button is enabled when multiple rows exist", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Add row" }).click();
      const removeButtons = page.getByRole("button", { name: "Remove row" });
      await expect(removeButtons.first()).toBeEnabled();
    });

    test("removing a row reduces row count back to one", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Add row" }).click();
      await expect(dialog.locator('[data-slot="select-trigger"]')).toHaveCount(2);
      await page.getByRole("button", { name: "Remove row" }).first().click();
      await expect(dialog.locator('[data-slot="select-trigger"]')).toHaveCount(1);
    });

    test("selecting a category removes it from other rows' options", async ({ page }) => {
      const dialog = page.getByRole("dialog");

      // Select Hourly Rate in the first row
      const triggers = dialog.locator('[data-slot="select-trigger"]');
      await triggers.first().click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();

      // Add a second row and open its category select
      await dialog.getByRole("button", { name: "Add row" }).click();
      await triggers.nth(1).click();

      // Hourly Rate should be excluded from the second row
      await expect(page.getByRole("option", { name: "Hourly Rate" })).not.toBeVisible();
      // Overtime Hourly should still be available
      await expect(page.getByRole("option", { name: "Overtime Hourly" })).toBeVisible();
    });
  });

  test.describe("Duplicate payslip validation", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });

      // Create the first payslip
      await openDialog(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      await dialog.locator('[data-slot="select-trigger"]').click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();
      await dialog.getByRole("spinbutton").fill("8");
      await dialog.getByRole("button", { name: "Create payslip" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Open dialog again and select the same employee + date
      await page.getByRole("button", { name: "New Payslip" }).click();
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("shows duplicate error message", async ({ page }) => {
      await expect(
        page.getByText(/A payslip for this employee on .+ already exists/)
      ).toBeVisible();
    });

    test("Create payslip button is disabled for duplicate", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });

  test.describe("No rates on selected date", () => {
    test("shows no rates warning when date is set before any rate's effective date", async ({
      page,
    }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2025-06-01",
      });
      await openDialog(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();

      // Change date to before the rate's effective date
      await dialog.locator('input[type="date"]').fill("2024-01-01");

      await expect(page.getByText(/No rates configured for this employee/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });

  test.describe("Form reset", () => {
    test.beforeEach(async ({ page }) => {
      seedRate({
        employeeId: JOHN_DOE_ID,
        paymentCategoryId: HOURLY_RATE_ID,
        amount: 25,
        effectiveFrom: "2024-01-01",
      });
      await openDialog(page);
      // Fill in some fields first
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("Reset clears employee selection", async ({ page }) => {
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(page.getByRole("combobox")).toContainText("Select an employee…");
    });

    test("Reset restores date to today", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.locator('input[type="date"]').fill("2023-06-01");
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(dialog.locator('input[type="date"]')).toHaveValue(today);
    });

    test("Reset shows the select-employee prompt again", async ({ page }) => {
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(page.getByText("Select an employee to see available categories.")).toBeVisible();
    });

    test("Reset disables the Create payslip button", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.locator('[data-slot="select-trigger"]').click();
      await page.getByRole("option", { name: "Hourly Rate" }).click();
      await dialog.getByRole("spinbutton").fill("8");
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeEnabled();
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(page.getByRole("button", { name: "Create payslip" })).toBeDisabled();
    });
  });
});
