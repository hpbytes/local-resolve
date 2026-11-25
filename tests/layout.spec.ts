import { test, expect } from "@playwright/test";
test("public and role pages fit mobile and desktop", async ({ page }) => {
  test.setTimeout(150000);
  const id = "LR-2026-000124";
  for (const [role, urls] of Object.entries({
    public: [
      "/",
      "/explore",
      "/alerts",
      "/track",
      "/issues/" + id,
      "/about",
      "/how-it-works",
      "/privacy",
      "/terms",
      "/register",
      "/login",
      "/forgot-password",
      "/unauthorized",
      "/missing",
    ],
    citizen: [
      "dashboard",
      "report",
      "complaints",
      "complaints/" + id,
      "notifications",
      "profile",
    ],
    officer: [
      "dashboard",
      "complaints",
      "complaints/" + id,
      "reports",
      "notifications",
      "profile",
    ],
    admin: [
      "dashboard",
      "complaints",
      "complaints/" + id,
      "users",
      "departments",
      "categories",
      "localities",
      "alerts",
      "analytics",
      "settings",
    ],
  })) {
    if (role !== "public") {
      await page.goto("/login");
      await page
        .getByRole("button", { name: role + " demo", exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(role + "/dashboard"));
    }
    for (const url of urls) {
      await page.goto(role === "public" ? url : "/" + role + "/" + url, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("h1").first()).toBeVisible();
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          role + url + width,
        ).toBeTruthy();
      }
    }
  }
  await page.goto("/");
  await page
    .getByRole("combobox", { name:"Locality", exact:true })
    .selectOption("Gandhipuram");
  await expect(
    page.getByRole("heading", { name: "Gandhipuram bulletin" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All reports" }).click();
  await expect(page.getByRole("combobox", { name:"Locality", exact:true })).toHaveValue(
    "Gandhipuram",
  );
});
