import { test, expect } from "./fixtures";

test.describe("Rates page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/rates");
  });

  test.describe("Page structure", () => {
    test("shows Rates heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Rates" })).toBeVisible();
    });

    test("shows effective date subtitle", async ({ page }) => {
      await expect(page.getByText(/Viewing rates as of/)).toBeVisible();
    });

    test("shows employee combobox with placeholder", async ({ page }) => {
      await expect(page.getByRole("combobox")).toContainText("Select an employee");
    });

    test("shows empty state when no employee selected", async ({ page }) => {
      await expect(page.getByText("Select an employee to view their rates.")).toBeVisible();
    });

    test("does not show rate table before employee is selected", async ({ page }) => {
      await expect(page.getByRole("table")).not.toBeVisible();
    });
  });

  test.describe("Employee combobox", () => {
    test("opens and shows all seeded employees", async ({ page }) => {
      await page.getByRole("combobox").click();
      await expect(page.getByRole("option", { name: "John Doe" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Jane Smith" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Bob Johnson" })).toBeVisible();
    });

    test("shows selected employee name after selection", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      await expect(page.locator('[data-slot="popover-trigger"]')).toContainText("John Doe");
    });

    test("shows rate table after selecting an employee", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      await expect(page.getByRole("table")).toBeVisible();
    });

    test("hides empty state after selecting an employee", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      await expect(page.getByText("Select an employee to view their rates.")).not.toBeVisible();
    });

    test("search filters employees by name", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByPlaceholder("Search employees…").fill("Jane");
      await expect(page.getByRole("option", { name: "Jane Smith" })).toBeVisible();
      await expect(page.getByRole("option", { name: "John Doe" })).not.toBeVisible();
      await expect(page.getByRole("option", { name: "Bob Johnson" })).not.toBeVisible();
    });

    test("search with no match shows empty message", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByPlaceholder("Search employees…").fill("xyz");
      await expect(page.getByText("No employee found.")).toBeVisible();
    });

    test("clearing search restores full employee list", async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByPlaceholder("Search employees…").fill("Jane");
      await page.getByPlaceholder("Search employees…").clear();
      await expect(page.getByRole("option", { name: "John Doe" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Jane Smith" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Bob Johnson" })).toBeVisible();
    });
  });

  test.describe("Rate table", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("shows correct column headers", async ({ page }) => {
      await expect(page.getByRole("columnheader", { name: "Payment Category" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Rate Amount" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Effective From" })).toBeVisible();
    });

    test("shows all four payment categories", async ({ page }) => {
      await expect(page.getByRole("cell", { name: "Hourly Rate" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Overtime Hourly" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Commission" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Global Pay" })).toBeVisible();
    });

    test("shows Add rate button for every category when no rates exist", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Add rate" })).toHaveCount(4);
    });
  });

  test.describe("Adding a rate", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
    });

    test("clicking Add rate shows amount input and Save/Cancel buttons", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await expect(row.getByRole("spinbutton")).toBeVisible();
      await expect(row.getByRole("button", { name: "Save" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    test("shows effective date in the row while editing", async ({ page }) => {
      const today = new Date().toISOString().slice(0, 10);
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await expect(row.getByText(today)).toBeVisible();
    });

    test("Cancel discards the edit and restores Add rate button", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await row.getByRole("button", { name: "Cancel" }).click();
      await expect(row.getByRole("button", { name: "Add rate" })).toBeVisible();
      await expect(row.getByRole("spinbutton")).not.toBeVisible();
    });

    test("saving a rate displays the formatted amount and Edit button", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await row.getByRole("spinbutton").fill("25.50");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$25.50")).toBeVisible();
      await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    });

    test("saving a rate reduces Add rate button count by one", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await row.getByRole("spinbutton").fill("25.50");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$25.50")).toBeVisible();
      await expect(page.getByRole("button", { name: "Add rate" })).toHaveCount(3);
    });
  });

  test.describe("Editing a rate", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await row.getByRole("spinbutton").fill("25.50");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$25.50")).toBeVisible();
    });

    test("Edit button shows input pre-filled with current amount", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Edit" }).click();
      await expect(row.getByRole("spinbutton")).toHaveValue("25.5");
    });

    test("can update amount and save", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Edit" }).click();
      await row.getByRole("spinbutton").fill("30.00");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$30.00")).toBeVisible();
    });

    test("Cancel while editing restores the original displayed amount", async ({ page }) => {
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Edit" }).click();
      await row.getByRole("button", { name: "Cancel" }).click();
      await expect(row.getByText("$25.50")).toBeVisible();
      await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    });
  });

  test.describe("Effective date filtering", () => {
    test.beforeEach(async ({ page }) => {
      // Add a rate for John Doe effective from today (the default date)
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "John Doe" }).click();
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await row.getByRole("button", { name: "Add rate" }).click();
      await row.getByRole("spinbutton").fill("25.50");
      await row.getByRole("button", { name: "Save" }).click();
      await expect(row.getByText("$25.50")).toBeVisible();
    });

    test("rate is hidden when effective date is set before the rate's effective from", async ({
      page,
    }) => {
      await page.locator('input[type="date"]').fill("2020-01-01");

      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await expect(row.getByText("$25.50")).not.toBeVisible();
      await expect(row.getByRole("button", { name: "Add rate" })).toBeVisible();
    });

    test("subtitle reflects the newly selected effective date", async ({ page }) => {
      await page.locator('input[type="date"]').fill("2020-01-01");

      await expect(page.getByText(/Viewing rates as of/)).toContainText("2020-01-01");
    });

    test("rate reappears when effective date is set back to or after rate date", async ({
      page,
    }) => {
      const today = new Date().toISOString().slice(0, 10);

      await page.locator('input[type="date"]').fill("2020-01-01");
      const row = page.getByRole("row").filter({ hasText: "Hourly Rate" });
      await expect(row.getByRole("button", { name: "Add rate" })).toBeVisible();

      await page.locator('input[type="date"]').fill(today);
      await expect(row.getByText("$25.50")).toBeVisible();
      await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    });
  });
});
