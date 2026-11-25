import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { auth, authReady, database, storage } from "./firebase";
import { cloudOwner } from "./workspace";
import { cloudIdentity } from "./identity";
import { useDB, now, type Data, type User } from "./data";

function owner() {
  if (!cloudOwner || auth.currentUser?.uid !== cloudOwner)
    throw Error("Sign in again to access this workspace.");
  return cloudOwner;
}
export async function cloudMedia(id: string, file?: File): Promise<File> {
  const item = ref(storage, "workspaceMedia/" + owner() + "/" + id);
  if (file) {
    await uploadBytes(item, file, { contentType: file.type });
    return file;
  }
  const blob = await getBlob(item, 25 * 1024 * 1024);
  return new File([blob], id, { type: blob.type });
}
export async function connectWorkspace(
  report: (message: string, failed?: boolean) => void,
) {
  await authReady;
  const firebaseUser = auth.currentUser;
  if (!firebaseUser)
    throw Error("Sign in with your Firebase account to open this workspace.");
  const identity = await cloudIdentity(firebaseUser),
    item = doc(database, "privateWorkspaces", owner());
  const initial = await runTransaction(database, async (tx) => {
    const snap = await tx.get(item);
    if (snap.exists()) return snap.data();
    const record = { revision: 1, payload: JSON.stringify(useDB.getState()) };
    tx.set(item, { ...record, updatedAt: serverTimestamp() });
    return record;
  });
  let revision = initial.revision as number,
    applying = false,
    writing = false,
    failed = false,
    queued: Data | undefined;
  function apply(payload: string) {
    const state = JSON.parse(payload) as Data;
    applying = true;
    try {
      useDB.setState(state, true);
    } finally {
      applying = false;
    }
  }
  apply(initial.payload);
  async function flush() {
    if (writing || failed) return;
    writing = true;
    try {
      while (queued) {
        const state = queued;
        queued = undefined;
        const payload = JSON.stringify(state);
        if (new TextEncoder().encode(payload).length > 950000)
          throw Error("Workspace size limit reached.");
        await runTransaction(database, async (tx) => {
          const snap = await tx.get(item);
          if (snap.data()?.revision !== revision)
            throw Error(
              "Another device updated this workspace. Reload before editing again.",
            );
          tx.update(item, {
            payload,
            revision: revision + 1,
            updatedAt: serverTimestamp(),
          });
        });
        revision++;
      }
      report("");
    } catch (e) {
      failed = true;
      report(
        "Changes were not saved. " +
          (e instanceof Error ? e.message : "Check your connection."),
        true,
      );
    } finally {
      writing = false;
    }
  }
  const stop = useDB.subscribe((state) => {
    if (applying || failed) return;
    queued = state;
    report("Saving to Firebase…");
    void flush();
  });
  const unsub = onSnapshot(
    item,
    (snap) => {
      const row = snap.data();
      if (
        !failed &&
        !writing &&
        !queued &&
        !snap.metadata.hasPendingWrites &&
        row &&
        row.revision > revision
      ) {
        revision = row.revision;
        apply(row.payload);
      }
    },
    (e) => {
      failed = true;
      report("Workspace connection failed. " + e.message, true);
    },
  );
  const data = useDB.getState(),
    existing = data.users.find((user) => user.id === firebaseUser.uid),
    profile: User = {
      ...existing,
      id: firebaseUser.uid,
      name:
        firebaseUser.displayName?.trim() ||
        firebaseUser.email?.split("@")[0] ||
        "Firebase user",
      email: firebaseUser.email || "",
      role: identity.role,
      locality: existing?.locality || data.locality,
      createdAt: existing?.createdAt || now(),
      enabled: true,
      notify: existing?.notify ?? true,
      departmentId: identity.departmentId,
    };
  sessionStorage.setItem("lr-cloud-role-" + firebaseUser.uid, firebaseUser.uid);
  if (
    !existing ||
    existing.name !== profile.name ||
    existing.email !== profile.email ||
    existing.role !== profile.role ||
    existing.departmentId !== profile.departmentId ||
    !existing.enabled
  )
    useDB.setState({
      users: existing
        ? data.users.map((user) => (user.id === profile.id ? profile : user))
        : [...data.users, profile],
    });
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (writing || queued) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", beforeUnload);
  return () => {
    stop();
    unsub();
    window.removeEventListener("beforeunload", beforeUnload);
  };
}
