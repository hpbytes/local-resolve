import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import {
  useDB,
  save,
  session,
  now,
  uid,
  type Role,
  type User,
} from "../../services/data";
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export default function Auth() {
  const db = useDB(),
    nav = useNavigate(),
    [sp] = useSearchParams(),
    path = useLocation().pathname,
    registering = path === "/register",
    forgot = path === "/forgot-password",
    [role, R] = useState<Role>("citizen"),
    [show, S] = useState(false),
    [err, E] = useState(""),
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
  return (
    <main className="wrap auth">
      <div className="panel form">
        <small>LOCAL RESOLVE · DEMO ACCOUNT</small>
        <h1>
          {registering
            ? "Create citizen account"
            : forgot
              ? "Reset demo password"
              : "Sign in"}
        </h1>
        <p>Use fictional details and a demo-only password.</p>
        {!registering && !forgot && (
          <div className="choices">
            {(["citizen", "officer", "admin"] as Role[]).map((r) => (
              <button key={r} aria-pressed={role === r} onClick={() => R(r)}>
                {r}
              </button>
            ))}
          </div>
        )}
        <form
          className="form"
          onSubmit={handleSubmit(async (data) => {
            const email = data.email.toLowerCase().trim(),
              user = db.users.find((u) => u.email === email),
              passwordHash = await hash(data.password || "");
            if (forgot) {
              E(
                user?.passwordHash
                  ? "For this browser demo, ask the administrator to reset your account password in User Management."
                  : "Built-in demo accounts use LocalDemo123!",
              );
              return;
            }
            if (registering) {
              if (user) {
                E("This email is already registered.");
                return;
              }
              if (data.password !== data.confirm) {
                E("Passwords must match.");
                return;
              }
              const u: User = {
                id: uid(),
                email,
                phone: data.phone || "",
                district: "Coimbatore",
                name: data.name.trim(),
                locality: data.locality,
                role: "citizen",
                enabled: true,
                notify: true,
                departmentId: "",
                createdAt: now(),
                passwordHash,
              };
              save({ users: [...db.users, u] });
              login(u);
              return;
            }
            if (
              !user ||
              user.role !== role ||
              (user.passwordHash
                ? user.passwordHash !== passwordHash
                : data.password !== "LocalDemo123!")
            ) {
              E("Check the email, role and demo password.");
              return;
            }
            login(user);
          })}
        >
          {registering && (
            <label>
              Full name
              <input required {...register("name")} />
            </label>
          )}
          <label>
            Email
            <input type="email" required {...register("email")} />
          </label>
          {registering && (
            <>
              <label>
                Phone (optional)
                <input
                  type="tel"
                  pattern="[0-9 +()-]{7,18}"
                  {...register("phone")}
                />
              </label>
              <label>
                District
                <select>
                  <option>Coimbatore</option>
                </select>
              </label>
              <label>
                Locality
                <select {...register("locality")}>
                  {db.localities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {!forgot && (
            <>
              <label>
                Demo password
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={registering ? 8 : 1}
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
          <button className="primary">
            {registering
              ? "Register"
              : forgot
                ? "Get reset instructions"
                : "Sign in"}
          </button>
        </form>
        <p role="status">{err}</p>
        {!forgot && !registering && (
          <>
            <h3>Demonstration accounts</h3>
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
            {registering || forgot
              ? "Back to sign in"
              : "Register as a citizen"}
          </Link>
          {!forgot && <Link to="/forgot-password">Forgot password?</Link>}
        </div>
      </div>
    </main>
  );
}
