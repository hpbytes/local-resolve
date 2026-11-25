import { expect, test } from "@playwright/test";
test("admin configuration, confirmation dialogs and role boundaries", async ({
  page,
}) => {
  await page.goto("/admin/departments");
  await expect(page).toHaveURL(/login/);
  await page.getByRole("button", { name: "admin demo" }).click();
  await expect(page.locator("h1")).toHaveText(/departments/i);
  await page.getByLabel("Name", { exact: true }).fill("Parks Department");
  await page.getByLabel("Description").fill("Public green spaces");
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.getByLabel("Search", { exact: true }).fill("Parks");
  await expect(page.locator(".record")).toContainText("Parks Department");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Community Parks");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.locator(".record")).toContainText("Community Parks");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".record")).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("No matching entries.")).toBeVisible();
  await page.goto("/login");
  await page.getByRole("button", { name: "citizen demo" }).click();
  await page.goto("/admin/settings");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await page.goto("/issues/LR-2026-000124");
  await page.getByRole("button", { name: "Confirm this issue" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Confirmed", exact: true }),
  ).toBeDisabled();
  await page.goto("/track?id=UNKNOWN");
  await expect(page.getByRole("alert")).toContainText("No complaint matches");
});
