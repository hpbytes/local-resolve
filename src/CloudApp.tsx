import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import App from "./App";
import { connectWorkspace } from "./services/cloud";
import { auth } from "./services/firebase";
import { leaveWorkspace } from "./services/workspace";
export default function CloudApp() {
  const [ready, R] = useState(false),
    [error, E] = useState(""),
    [status, S] = useState("");
  async function returnToLocal() {
    try {
      await signOut(auth);
      leaveWorkspace();
    } catch (e) {
      E(
        e instanceof Error
          ? "Sign out failed. " + e.message
          : "Sign out failed.",
      );
    }
  }
  useEffect(() => {
    let active = true,
      stop: (() => void) | undefined;
    connectWorkspace((msg, failed) => {
      if (active) {
        if (failed) E(msg);
        else S(msg);
      }
    })
      .then((cleanup) => {
        if (active) {
          stop = cleanup;
          R(true);
        } else cleanup();
      })
      .catch((e) => E(e.message));
    return () => {
      active = false;
      stop?.();
    };
  }, []);
  if (error)
    return (
      <main className="wrap narrow">
        <h1>Cloud workspace unavailable</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>
          Reload saved workspace
        </button>{" "}
        <button onClick={returnToLocal}>Return to local demo</button>
      </main>
    );
  if (!ready)
    return (
      <main className="wrap" role="status">
        Opening Firebase workspace…
      </main>
    );
  return (
    <>
      <div className="locbar">
        <div className="wrap row">
          <a href="/cloud">Private cloud workspace</a>
          <small role="status">{status || "Connected"}</small>
        </div>
      </div>
      <App />
    </>
  );
}
