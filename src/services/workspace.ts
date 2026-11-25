export const cloudOwner = sessionStorage.getItem("lr-cloud-owner") || "";
export const roleKey = cloudOwner
  ? "lr-cloud-role-" + cloudOwner
  : "lr-account";
export const draftPrefix = cloudOwner
  ? "lr-cloud-draft-" + cloudOwner + "-"
  : "lr-draft-";
export function leaveWorkspace() {
  sessionStorage.removeItem("lr-cloud-owner");
  if (cloudOwner) {
    sessionStorage.removeItem(roleKey);
    localStorage.removeItem(roleKey);
  }
  location.assign("/cloud");
}
