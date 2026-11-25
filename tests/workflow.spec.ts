import { test, expect } from "@playwright/test";
test("citizen evidence, officer resolution, feedback and analytics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Kuniamuthur bulletin" }),
  ).toBeVisible();
  async function login(role: string) {
    await page.goto("/login");
    await page
      .getByRole("button", { name: role + " demo", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp("/" + role + "/dashboard"));
  }
  await login("citizen");
  await page.goto("/citizen/report");
  await page
    .getByLabel("Complaint title")
    .fill("Damaged surface on Market Road");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Street name").fill("Market Road");
  await page
    .getByLabel("Neighbourhood issue map")
    .click({ position: { x: 120, y: 105 } });
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Detailed description")
    .fill("A damaged road surface is affecting pedestrians near the bus stop.");
  await page.locator("input[type=file]").setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aH8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit complaint" }).click();
  const id = (await page.locator("h2").innerText()).trim();
  expect(id).toMatch(/^LR-\d{4}-\d{6}$/);
  await page
    .getByRole("link", { name: "Track complaint", exact: true })
    .last()
    .click();
  await page.reload();
  await expect(
    page.getByAltText("Submitted civic issue evidence"),
  ).toBeVisible();
  await login("officer");
  await page.goto("/officer/complaints/" + id);
  for (const status of ["Verified", "In Progress", "Resolved"])
    await page.getByRole("button", { name: status, exact: true }).click();
  await login("citizen");
  await page.goto("/track?id=" + id);
  await expect(page.locator(".timeline li")).toHaveCount(4);
  await page
    .getByLabel("Feedback or reopening reason")
    .fill("The repair is complete.");
  await page.getByRole("button", { name: "Confirm closure" }).click();
  await expect(page.locator(".badge")).toHaveText("Closed");
  await login("admin");
  await expect(page.locator(".stats>div").first()).toContainText("25");
  await page.goto("/admin/analytics");
  await expect(
    page.getByRole("heading", { name: "Department performance" }),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", "/explore", "/admin/dashboard"]) {
      await page.goto(url);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.goto("/");
  await expect(page.locator(".local-desk img")).toBeVisible();
  expect(
    await page
      .locator(".local-desk img")
      .evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath("desktop.png") });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: test.info().outputPath("mobile.png") });
  expect(errors).toEqual([]);
});

