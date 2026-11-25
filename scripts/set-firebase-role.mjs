import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const roles = ["citizen", "officer", "admin"];

export async function provisionRole(auth, uid, role, departmentId) {
  if (!uid?.trim()) throw Error("A Firebase user UID is required.");
  if (!roles.includes(role))
    throw Error("Role must be citizen, officer, or admin.");
  if (role === "officer" && !departmentId?.trim())
    throw Error("Officer accounts require a department ID.");
  if (role !== "officer" && departmentId)
    throw Error("Only officer accounts can have a department ID.");

  const user = await auth.getUser(uid),
    claims = { ...(user.customClaims || {}) };
  delete claims.role;
  delete claims.departmentId;
  claims.role = role;
  if (role === "officer") claims.departmentId = departmentId.trim();
  await auth.setCustomUserClaims(uid, claims);
  return auth.getUser(uid);
}

async function main() {
  const [projectId, uid, role, departmentId] = process.argv.slice(2);
  if (!projectId || !uid || !role) {
    throw Error(
      "Usage: node scripts/set-firebase-role.mjs <project-id> <uid> <citizen|officer|admin> [department-id]",
    );
  }
  const app = initializeApp(
    { credential: applicationDefault(), projectId },
    "role-provisioner",
  );
  try {
    await provisionRole(getAuth(app), uid, role, departmentId);
    console.log("Role claim updated for the requested Firebase user.");
  } finally {
    await app.delete();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Role update failed.",
    );
    process.exitCode = 1;
  });
}
