import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle("Finito");
  });

  test("shows heading and subtitle", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Welcome to Finito" })).toBeVisible();
    await expect(page.getByText("Select a section to get started.")).toBeVisible();
  });

  test.describe("Navigation bar", () => {
    test("shows Finito logo linking to home", async ({ page }) => {
      const logo = page.getByRole("link", { name: "Finito" }).first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("href", "/");
    });

    test("shows Rates nav link", async ({ page }) => {
      const link = page.getByRole("navigation").getByRole("link", { name: "Rates" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/rates");
    });

    test("shows Payslips nav link", async ({ page }) => {
      const link = page.getByRole("navigation").getByRole("link", { name: "Payslips" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/payslips");
    });

    test("shows effective date input with label", async ({ page }) => {
      await expect(page.getByText("Viewing as of:")).toBeVisible();
      await expect(page.getByRole("textbox")).toBeVisible();
    });

    test("effective date defaults to today", async ({ page }) => {
      const today = new Date().toISOString().slice(0, 10);
      await expect(page.getByRole("textbox")).toHaveValue(today);
    });

    test("effective date can be changed", async ({ page }) => {
      const input = page.getByRole("textbox");
      await input.fill("2024-01-15");
      await expect(input).toHaveValue("2024-01-15");
    });
  });

  test.describe("Section cards", () => {
    test("shows Rates card with correct content", async ({ page }) => {
      const card = page
        .getByRole("link", { name: /Rates/ })
        .filter({ hasText: "Manage employee payment rates" });
      await expect(card).toBeVisible();
      await expect(card.getByText("Rates", { exact: true })).toBeVisible();
      await expect(
        card.getByText("Manage employee payment rates and view rate history.")
      ).toBeVisible();
    });

    test("shows Payslips card with correct content", async ({ page }) => {
      const card = page
        .getByRole("link", { name: /Payslips/ })
        .filter({ hasText: "Create payslips" });
      await expect(card).toBeVisible();
      await expect(card.getByText("Payslips", { exact: true })).toBeVisible();
      await expect(
        card.getByText("Create payslips, view totals, and track retroactive changes.")
      ).toBeVisible();
    });

    test("Rates card navigates to /rates", async ({ page }) => {
      await page
        .getByRole("link", { name: /Rates/ })
        .filter({ hasText: "Manage employee payment rates" })
        .click();
      await expect(page).toHaveURL("/rates");
    });

    test("Payslips card navigates to /payslips", async ({ page }) => {
      await page
        .getByRole("link", { name: /Payslips/ })
        .filter({ hasText: "Create payslips" })
        .click();
      await expect(page).toHaveURL("/payslips");
    });
  });

  test.describe("Nav link navigation", () => {
    test("Rates nav link navigates to /rates", async ({ page }) => {
      await page.getByRole("navigation").getByRole("link", { name: "Rates" }).click();
      await expect(page).toHaveURL("/rates");
    });

    test("Payslips nav link navigates to /payslips", async ({ page }) => {
      await page.getByRole("navigation").getByRole("link", { name: "Payslips" }).click();
      await expect(page).toHaveURL("/payslips");
    });
  });
});
