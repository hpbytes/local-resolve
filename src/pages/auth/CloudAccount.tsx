import { useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";
import { cloudOwner, leaveWorkspace } from "../../services/workspace";

export default function CloudAccount() {
  const [message, M] = useState("");
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
              Sign in or create a Firebase account from the main login page.
              Each account syncs its own private workspace across devices.
            </p>
            <div className="row">
              <Link className="btn primary" to="/login">
                Sign in
              </Link>
              <Link className="btn" to="/register">
                Create account
              </Link>
            </div>
          </>
        )}
        <p role="status">{message}</p>
      </section>
    </main>
  );
}
