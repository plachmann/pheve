import { expect, test } from "@playwright/test";

const hasResendEnv = Boolean(process.env["RESEND_API_KEY"]);

test.describe("booking inquiry", () => {
  test.skip(!hasResendEnv, "Requires RESEND_API_KEY — sends a real email to BAND_EMAIL");

  test("submits an inquiry and shows confirmation", async ({ page }) => {
    await page.goto("/booking");
    await page.getByLabel(/your name/i).fill("E2E Test");
    await page.getByLabel(/email/i).fill("e2e@example.com");
    await page.getByLabel(/event date/i).fill("Some Saturday in October");
    await page.getByLabel(/event type/i).fill("Backyard party");
    await page.getByLabel(/tell us about it/i).fill("Automated test inquiry — ignore me.");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/we’ll get back to you/i)).toBeVisible();
  });
});

test.describe("booking form validation", () => {
  test("shows a validation error for a bad email", async ({ page }) => {
    await page.goto("/booking");
    await page.getByLabel(/email/i).fill("not-an-email");
    // Browser-level validation blocks submit; assert the field is flagged invalid.
    const emailInput = page.getByLabel(/email/i);
    await page.getByRole("button", { name: /send inquiry/i }).click();
    const invalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).checkValidity());
    expect(invalid).toBe(true);
  });
});
