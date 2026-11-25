import type { User as FirebaseUser } from "firebase/auth";
import type { Role } from "../types";

const roles: Role[] = ["citizen", "officer", "admin"];

export async function cloudIdentity(user: FirebaseUser) {
  const claims = (await user.getIdTokenResult(true)).claims,
    roleClaim = claims.role,
    role =
      roleClaim === undefined
        ? "citizen"
        : roles.find((value) => value === roleClaim);
  if (!role)
    throw Error(
      "This account has an invalid role. Contact the workspace administrator.",
    );
  return {
    role,
    departmentId:
      typeof claims.departmentId === "string" ? claims.departmentId : "",
  };
}

export async function activateCloudIdentity(user: FirebaseUser) {
  const identity = await cloudIdentity(user);
  sessionStorage.setItem("lr-cloud-owner", user.uid);
  sessionStorage.removeItem("lr-cloud-role-" + user.uid);
  localStorage.removeItem("lr-cloud-role-" + user.uid);
  sessionStorage.setItem("lr-cloud-role-" + user.uid, user.uid);
  return identity;
}
