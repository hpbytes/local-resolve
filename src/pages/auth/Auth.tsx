import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, authReady } from "../../services/firebase";
import { cloudOwner } from "../../services/workspace";
import { activateCloudIdentity } from "../../services/identity";
import { useDB, session, type User } from "../../services/data";

function authError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  if (code === "auth/invalid-credential")
    return "Check your email and password.";
  if (code === "auth/email-already-in-use")
    return "An account with this email already exists.";
  if (code === "auth/weak-password")
    return "Choose a password with at least 8 characters.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Wait a moment and try again.";
  if (code === "auth/network-request-failed")
    return "Could not connect to Firebase. Check your connection and try again.";
  return error instanceof Error ? error.message : "Authentication failed.";
}
export default function Auth() {
  const db = useDB(),
    nav = useNavigate(),
    [sp] = useSearchParams(),
    path = useLocation().pathname,
    registering = path === "/register",
    forgot = path === "/forgot-password",
    [show, S] = useState(false),
    [err, E] = useState(""),
    [message, M] = useState(""),
    [busy, B] = useState(false),
    { register, handleSubmit, getValues } = useForm<Record<string, string>>();
  function login(u: User) {
    if (!u.enabled) {
      E("This demo account is disabled.");
      return;
    }
    session(u.id, !!getValues("remember"));
    const next = sp.get("next");
    nav(
      next?.startsWith("/") && !next.startsWith("//")
        ? next
        : "/" + u.role + "/dashboard",
    );
  }
  async function firebaseLogin(data: Record<string, string>) {
    const email = data.email.toLowerCase().trim();
    if (registering && data.password !== data.confirm) {
      E("Passwords must match.");
      return;
    }
    B(true);
    E("");
    M("");
    try {
      await authReady;
      if (forgot) {
        await sendPasswordResetEmail(auth, email);
        M(
          "If an account exists for this email, Firebase will send reset instructions.",
        );
        return;
      }
      await setPersistence(
        auth,
        data.remember ? browserLocalPersistence : browserSessionPersistence,
      );
      const credential = registering
        ? await createUserWithEmailAndPassword(auth, email, data.password || "")
        : await signInWithEmailAndPassword(auth, email, data.password || "");
      if (registering)
        await updateProfile(credential.user, {
          displayName: data.name.trim(),
        });
      const { role } = await activateCloudIdentity(credential.user);
      const next = sp.get("next"),
        destination =
          next?.startsWith("/") && !next.startsWith("//")
            ? next
            : "/" + role + "/dashboard";
      location.assign(destination);
    } catch (error) {
      E(authError(error));
    } finally {
      B(false);
    }
  }
  return (
    <main className="wrap auth">
      <div className="panel form">
        <small>LOCAL RESOLVE · FIREBASE ACCOUNT</small>
        <h1>
          {registering
            ? "Create account"
            : forgot
              ? "Reset password"
              : "Sign in"}
        </h1>
        <p>
          Firebase secures your account. Workspace records sync privately to
          that account.
        </p>
        <form className="form" onSubmit={handleSubmit(firebaseLogin)}>
          {registering && (
            <label>
              Full name
              <input autoComplete="name" required {...register("name")} />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              {...register("email")}
            />
          </label>
          {!forgot && (
            <>
              <label>
                Password
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={registering ? 8 : 1}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  {...register("password")}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => S(e.target.checked)}
                />
                Show password
              </label>
            </>
          )}
          {registering ? (
            <>
              <label>
                Confirm password
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  {...register("confirm")}
                />
              </label>
              <label className="check">
                <input type="checkbox" required />I agree to the{" "}
                <Link to="/terms">terms of use</Link>
              </label>
            </>
          ) : (
            !forgot && (
              <label className="check">
                <input type="checkbox" {...register("remember")} />
                Remember me
              </label>
            )
          )}
          <button className="primary" disabled={busy}>
            {registering
              ? busy
                ? "Creating account…"
                : "Create account"
              : forgot
                ? busy
                  ? "Sending…"
                  : "Send reset instructions"
                : busy
                  ? "Signing in…"
                  : "Sign in"}
          </button>
        </form>
        <p role="alert">{err}</p>
        <p role="status">{message}</p>
        {!cloudOwner && !forgot && !registering && (
          <>
            <h3>Local demo mode</h3>
            <p>
              These sample accounts do not use Firebase or sync across devices.
            </p>
            <div className="choices">
              {db.users
                .filter((u) => ["citizen", "officer", "admin"].includes(u.id))
                .map((u) => (
                  <button key={u.id} onClick={() => login(u)}>
                    {u.role} demo
                  </button>
                ))}
            </div>
          </>
        )}
        <div className="spread">
          <Link to={registering || forgot ? "/login" : "/register"}>
            {registering || forgot ? "Back to sign in" : "Create an account"}
          </Link>
          {!forgot && <Link to="/forgot-password">Forgot password?</Link>}
          <Link to="/cloud">Cloud workspace details</Link>
        </div>
      </div>
    </main>
  );
}
