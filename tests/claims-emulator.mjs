import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { provisionRole } from "../scripts/set-firebase-role.mjs";

const app = initializeApp(
  { projectId: "demo-local-resolve" },
  "claims-emulator",
);
const auth = getAuth(app);
const email = "claims-" + Date.now() + "@example.test";
let uid;
try {
  const user = await auth.createUser({ email });
  uid = user.uid;
  await auth.setCustomUserClaims(uid, { retained: "value", role: "citizen" });
  const updated = await provisionRole(auth, uid, "officer", "Roads Department");
  assert.deepEqual(updated.customClaims, {
    retained: "value",
    role: "officer",
    departmentId: "Roads Department",
  });
  await assert.rejects(
    provisionRole(auth, uid, "officer"),
    /require a department ID/,
  );
  await assert.rejects(provisionRole(auth, uid, "superuser"), /Role must be/);
  console.log("Trusted role claim provisioning passed.");
} finally {
  if (uid) await auth.deleteUser(uid);
  await deleteApp(app);
}
