import { create } from "zustand";
import { cloudOwner, roleKey, draftPrefix } from "./workspace";
import { createJSONStorage, persist } from "zustand/middleware";
export const names = [
  "Roads and Traffic",
  "Garbage and Sanitation",
  "Water Supply",
  "Drainage",
  "Streetlights",
  "Electricity",
  "Flooding",
  "Other Civic Issues",
];
const departments = [
  "Roads Department",
  "Sanitation Department",
  "Water Supply Department",
  "Drainage Department",
  "Streetlight Maintenance",
  "Electricity Department",
  "Municipal Administration",
  "General Administration",
];
const places = [
  "Kuniamuthur",
  "Gandhipuram",
  "RS Puram",
  "Peelamedu",
  "Ukkadam",
  "Saibaba Colony",
  "Singanallur",
  "Town Hall",
];
export const statuses = [
  "Reported",
  "Under Review",
  "Verified",
  "In Progress",
  "Resolved",
  "Closed",
  "Reopened",
  "Rejected",
];
export const next: Record<string, string[]> = {
  Reported: ["Under Review", "Verified", "Rejected"],
  "Under Review": ["Verified", "Rejected"],
  Verified: ["In Progress"],
  "In Progress": ["Resolved"],
  Reopened: ["Under Review", "In Progress"],
};
import type {
  Role,
  User,
  StatusHistory,
  Complaint,
  Notification,
  Feedback,
  Alert,
} from "../types";
export type * from "../types";
export const alertKinds = [
  "Water supply interruptions",
  "Power outages",
  "Road maintenance",
  "Waste collection",
  "Flooding and weather",
  "Transport disruptions",
  "General public notices",
];
export const uid = () => crypto.randomUUID(),
  now = () => new Date().toISOString();
export const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const event = (
  id: string,
  prev: string,
  status: string,
  note: string,
  by: string,
  time = now(),
): StatusHistory => ({
  id: uid(),
  complaintId: id,
  previousStatus: prev,
  newStatus: status,
  note,
  updatedBy: by,
  timestamp: time,
});
export const notice = (
  userId: string,
  title: string,
  message: string,
): Notification => ({
  id: uid(),
  userId,
  title,
  message,
  read: false,
  createdAt: now(),
});
const titles = [
  "Pothole near the bus stop",
  "Overflowing bin at the market",
  "Water leaking across the footpath",
  "Blocked stormwater drain",
  "Streetlight out on residential lane",
  "Damaged electricity junction box",
  "Standing water at the junction",
  "Broken railing beside the walkway",
];
const announcementDetails = [
  "Water service may pause between 9 am and noon while crews inspect the neighbourhood supply line.",
  "Allow for a morning power interruption while the feeder is serviced.",
  "Resurfacing work will narrow the road near the market. Leave extra time for local journeys.",
  "Place sorted waste at the usual pickup point before the morning collection.",
  "Check standing water near low lying junctions before travelling.",
  "Board local buses at the temporary stop across from the regular shelter.",
  "Residents can bring questions about street maintenance to the ward meeting.",
];
const announcementDepartments = [2, 5, 0, 1, 6, 6, 7];
function seed() {
  const users: User[] = (["citizen", "officer", "admin"] as Role[]).map(
    (role, i) => ({
      id: role,
      role,
      name: ["Ananya Ravi", "Kiran Kumar", "Meera S"][i],
      email: role + "@demo.local",
      locality: places[0],
      createdAt: now(),
      enabled: true,
      notify: true,
      departmentId: departments[0],
    }),
  );
  const complaints: Complaint[] = Array.from({ length: 24 }, (_, i) => {
    const k = i % 8,
      j = (i + Math.floor(i / 8)) % 8,
      id = "LR-2026-" + String(124 + i).padStart(6, "0"),
      created = new Date(Date.now() - (1 + i * 3) * 86400000).toISOString(),
      status = statuses[(i + Math.floor(i / 8)) % 8],
      path: Record<string, string[]> = {
        Reported: [],
        "Under Review": ["Under Review"],
        Verified: ["Verified"],
        "In Progress": ["Verified", "In Progress"],
        Resolved: ["Verified", "In Progress", "Resolved"],
        Closed: ["Verified", "In Progress", "Resolved", "Closed"],
        Reopened: ["Verified", "In Progress", "Resolved", "Reopened"],
        Rejected: ["Rejected"],
      },
      history = ["Reported", ...path[status]].map((s, n, a) =>
        event(
          id,
          a[n - 1] || "",
          s,
          n ? "Department recorded " + s.toLowerCase() : "Report received",
          n ? "Demo officer" : "Citizen",
          new Date(+new Date(created) + n * 3600000).toISOString(),
        ),
      );
    return {
      id,
      reportId: id,
      userId: i % 3 ? "resident-" + i : "citizen",
      title: titles[k] + " in " + places[j],
      description:
        "Residents have reported this concern near the main approach to " +
        places[j] +
        ". Please inspect the site and arrange maintenance.",
      categoryId: names[k],
      departmentId: departments[k],
      district: "Coimbatore",
      locality: places[j],
      street: "Main Road",
      landmark: "Neighbourhood bus stop",
      city: "Coimbatore",
      pin: "",
      latitude:
        [10.958, 11.017, 11.01, 11.028, 10.99, 11.027, 11.002, 10.996][j] +
        i * 0.0001,
      longitude: [76.953, 76.967, 76.95, 77.002, 76.961, 76.944, 77.028, 76.96][
        j
      ],
      priority: ["Normal", "High", "Low"][i % 3],
      status,
      mediaIds: [],
      resolutionMedia: [],
      confirmations: Array.from({ length: i % 9 }, (_, n) => "demo-" + n),
      createdAt: created,
      updatedAt: history.at(-1)!.timestamp,
      resolvedAt:
        history.find((h) => h.newStatus === "Resolved")?.timestamp || "",
      history,
    };
  });
  return {
    users,
    complaints,
    departments: departments.map((name) => ({
      id: name,
      name,
      description: "Simulated civic service department",
      active: true,
    })),
    categories: names.map((name, i) => ({ name, department: departments[i] })),
    localities: places,
    alerts: alertKinds.map((category, i): Alert => ({
      id: uid(),
      category,
      title: [
        "Scheduled water line maintenance",
        "Planned feeder maintenance",
        "Road resurfacing schedule",
        "Revised waste collection hours",
        "Rain advisory for low-lying streets",
        "Temporary bus stop relocation",
        "Community ward meeting",
      ][i],
      description: announcementDetails[i],
      authority: departments[announcementDepartments[i]],
      locality: places[i],
      severity: i % 3 ? "Advisory" : "Important",
      createdAt: now(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      readBy: [],
    })),
    notifications: [] as Notification[],
    feedback: [] as Feedback[],
    locality: places[0],
  };
}
export type Data = ReturnType<typeof seed>;
export const useDB = create<Data>()(
  persist(() => seed(), {
    ...(cloudOwner
      ? {
          storage: createJSONStorage<Data>(() => ({
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          })),
        }
      : {}),
    name: "local-resolve-data-v1",
    version: 1,
    migrate: (stored) => {
      const data = stored as Data;
      return {
        ...data,
        alerts: data.alerts.map((a) => {
          const i = alertKinds.indexOf(a.category);
          if (
            i < 0 ||
            a.description !==
              "Residents should plan around the scheduled local activity between 9 am and noon."
          )
            return a;
          return {
            ...a,
            description: announcementDetails[i],
            authority:
              a.authority === departments[i]
                ? departments[announcementDepartments[i]]
                : a.authority,
          };
        }),
      };
    },
  }),
);
window.addEventListener("storage", (e) => {
  if (!cloudOwner && e.key === "local-resolve-data-v1")
    void useDB.persist.rehydrate();
});
export const save = (patch: Partial<Data>) => useDB.setState(patch);
export function reset() {
  save(seed());
  Object.keys(localStorage)
    .filter((key) => key.startsWith(draftPrefix))
    .forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(roleKey);
  localStorage.removeItem(roleKey);
  if (cloudOwner) return;
  indexedDB.deleteDatabase("lr-evidence");
  location.assign("/");
}
export function useUser() {
  return useDB((s) =>
    s.users.find(
      (u) =>
        u.enabled &&
        u.id ===
          (sessionStorage.getItem(roleKey) || localStorage.getItem(roleKey)),
    ),
  );
}
export function session(id: string, remember = false) {
  sessionStorage.removeItem(roleKey);
  localStorage.removeItem(roleKey);
  if (id) (remember ? localStorage : sessionStorage).setItem(roleKey, id);
  save({ users: [...useDB.getState().users] });
}
export function update(
  c: Complaint,
  note: string,
  status = c.status,
  patch: Partial<Complaint> = {},
) {
  const db = useDB.getState(),
    time = now();
  save({
    complaints: db.complaints.map((v) =>
      v.id === c.id
        ? {
            ...v,
            ...patch,
            status,
            updatedAt: time,
            resolvedAt:
              status === "Resolved" && v.status !== status
                ? time
                : status === "Reopened"
                  ? ""
                  : v.resolvedAt,
            history: [
              ...v.history,
              event(
                c.id,
                c.status,
                status,
                note,
                db.users.find(
                  (user) =>
                    user.id ===
                    (sessionStorage.getItem(roleKey) ||
                      localStorage.getItem(roleKey)),
                )?.role || "Demo user",
              ),
            ],
          }
        : v,
    ),
    notifications: [
      notice(c.userId, status, note + " · " + c.id),
      ...db.users
        .filter(
          (u) =>
            u.role === "officer" &&
            u.departmentId === (patch.departmentId || c.departmentId),
        )
        .map((u) => notice(u.id, status, note + " · " + c.id)),
      ...db.notifications,
    ],
  });
}
export async function media(id: string, file?: File): Promise<File> {
  if (cloudOwner) return (await import("./cloud")).cloudMedia(id, file);
  const db = await new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open("lr-evidence", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  return new Promise((ok, no) => {
    const tx = db.transaction("files", file ? "readwrite" : "readonly"),
      store = tx.objectStore("files"),
      r = file ? store.put(file, id) : store.get(id);
    tx.oncomplete = () => {
      db.close();
      ok(file || (r.result as File));
    };
    tx.onerror = () => {
      db.close();
      no(tx.error);
    };
  });
}
