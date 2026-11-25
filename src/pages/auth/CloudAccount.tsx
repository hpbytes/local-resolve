import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, authReady } from "../../services/firebase";
import { cloudOwner, leaveWorkspace } from "../../services/workspace";

export default function CloudAccount() {
  const [register, R] = useState(false),
    [message, M] = useState(""),
    [busy, B] = useState(false);
  return (
    <main className="wrap auth">
      <section className="panel form">
        <h1>Cloud workspace</h1>
        {cloudOwner ? (
          <>
            <p>
              Your reports, updates and evidence are saved to your private
              Firebase workspace. Use this cloud account on another device to
              open them.
            </p>
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                  leaveWorkspace();
                } catch {
                  M("Sign out failed. Try again.");
                }
              }}
            >
              Leave cloud workspace
            </button>
          </>
        ) : (
          <>
            <p>
              Sign in to open a private copy of the civic reporting workspace.
              New accounts start with demonstration reports. Existing browser
              data stays on this device.
            </p>
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                B(true);
                M("");
                try {
                  await authReady;
                  const login = register
                    ? createUserWithEmailAndPassword
                    : signInWithEmailAndPassword;
                  const { user } = await login(
                    auth,
                    String(f.get("email")).trim(),
                    String(f.get("password")),
                  );
                  sessionStorage.setItem("lr-cloud-owner", user.uid);
                  location.assign("/");
                } catch (e) {
                  M(e instanceof Error ? e.message : "Sign in failed.");
                  B(false);
                }
              }}
            >
              <label>
                Cloud account email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Cloud account password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={register ? 8 : 1}
                  autoComplete={register ? "new-password" : "current-password"}
                />
              </label>
              <button disabled={busy} className="primary">
                {busy
                  ? "Connecting…"
                  : register
                    ? "Create cloud account"
                    : "Open cloud workspace"}
              </button>
            </form>
            <button
              disabled={busy}
              onClick={() => {
                R(!register);
                M("");
              }}
            >
              {register ? "Use an existing account" : "Create a cloud account"}
            </button>
          </>
        )}
        <p role="status">{message}</p>
      </section>
    </main>
  );
}
