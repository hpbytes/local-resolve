import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
process.env.VITE_FIREBASE_EMULATORS = "true";
const server = await createServer({
  server: { host: "127.0.0.1", port: 5187, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({ channel: "msedge" });
const email = "workspace-" + Date.now() + "@example.test",
  password = "emulated-test-password";
try {
  for (const create of [true, false]) {
    const ctx = await browser.newContext(),
      page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5187/" + (create ? "register" : "login"));
    if (create) await page.getByLabel("Full name").fill("Cloud Test Citizen");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    if (create) {
      await page.getByLabel("Confirm password").fill(password);
      await page.getByLabel("I agree to the terms of use").check();
    }
    await page
      .getByRole("button", {
        name: create ? "Create account" : "Sign in",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/citizen\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByText("Private cloud workspace", { exact: true }),
    ).toBeVisible();
    await page.goto("http://127.0.0.1:5187/");
    const locality = page.getByRole("combobox", {
      name: "Locality",
      exact: true,
    });
    if (create) {
      await locality.selectOption("Gandhipuram");
      await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    }
    await expect(locality).toHaveValue("Gandhipuram");
    expect(errors).toEqual([]);
    await ctx.close();
  }
  const adminApp = initializeApp(
    { projectId: "demo-local-resolve" },
    "browser-role-check",
  );
  try {
    const adminAuth = getAuth(adminApp),
      user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, {
      role: "officer",
      departmentId: "Roads Department",
    });
    const ctx = await browser.newContext(),
      page = await ctx.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5187/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/officer\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Department overview" }),
    ).toBeVisible();
    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    const workspace = await getFirestore(adminApp)
      .doc("privateWorkspaces/" + user.uid)
      .get();
    const profile = JSON.parse(workspace.data().payload).users.find(
      (record) => record.id === user.uid,
    );
    expect(profile).toMatchObject({
      role: "officer",
      departmentId: "Roads Department",
    });
    expect(errors).toEqual([]);
    await ctx.close();
  } finally {
    await deleteApp(adminApp);
  }
  console.log("Cloud workspace persisted across independent Edge profiles.");
} finally {
  await browser.close();
  await server.close();
}
