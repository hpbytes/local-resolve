import { lazy, Suspense, useState, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { MapPinned, Menu, Plus, UserRound } from "lucide-react";
import { useUser, type Role } from "./services/data";
const Home = lazy(() =>
    import("./pages/public/Public").then((m) => ({ default: m.Home })),
  ),
  Explore = lazy(() =>
    import("./pages/public/Public").then((m) => ({ default: m.Explore })),
  ),
  Info = lazy(() =>
    import("./pages/public/Public").then((m) => ({ default: m.Info })),
  ),
  Alerts = lazy(() =>
    import("./pages/public/Public").then((m) => ({ default: m.Alerts })),
  ),
  Track = lazy(() =>
    import("./components/complaints/Issue").then((m) => ({ default: m.Track })),
  ),
  Issue = lazy(() => import("./components/complaints/Issue")),
  Auth = lazy(() => import("./pages/auth/Auth")),
  Dashboard = lazy(() => import("./layouts/Dashboard")),
  Report = lazy(() => import("./pages/citizen/Report"));
const links = [
  ["Home", "/"],
  ["Explore Issues", "/explore"],
  ["Track Complaint", "/track"],
  ["Local Alerts", "/alerts"],
  ["How It Works", "/how-it-works"],
];
const CloudAccount = lazy(() => import("./pages/auth/CloudAccount"));
function Brand() {
  return (
    <Link className="brand" to="/">
      <span>
        <MapPinned size={26} />
      </span>
      Local<span className="word">Resolve</span>
    </Link>
  );
}
function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const u = useUser(),
    l = useLocation();
  return !u ? (
    <Navigate
      replace
      to={"/login?next=" + encodeURIComponent(l.pathname + l.search)}
    />
  ) : u.role !== role ? (
    <Navigate replace to="/unauthorized" />
  ) : (
    children
  );
}
function Shell() {
  const u = useUser(),
    [open, O] = useState(false),
    l = useLocation();
  useEffect(() => {
    O(false);
    window.scrollTo(0, 0);
  }, [l.pathname]);
  return (
    <>
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      <header>
        <div className="wrap head">
          <Brand />
          <nav className={open ? "open" : ""} aria-label="Public navigation">
            {links.map(([s, p]) => (
              <NavLink end key={p} to={p}>
                {s}
              </NavLink>
            ))}
          </nav>
          <div className="row">
            <Link
              className="signin"
              to={u ? "/" + u.role + "/dashboard" : "/login"}
            >
              <UserRound size={16} />
              {u ? "Dashboard" : "Sign In"}
            </Link>
            <Link className="btn primary topaction" to="/citizen/report">
              <Plus size={17} />
              Report an Issue
            </Link>
            <button
              aria-expanded={open}
              className="menu"
              onClick={() => O(!open)}
              aria-label="Toggle navigation"
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <div id="page-content" tabIndex={-1}>
        <Suspense
          fallback={
            <main className="wrap" role="status">
              Loading workspace…
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cloud" element={<CloudAccount />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/track" element={<Track />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/issues/:id" element={<Issue />} />
            {["how-it-works", "about", "privacy", "terms"].map((p) => (
              <Route key={p} path={p} element={<Info />} />
            ))}
            {["register", "login", "forgot-password"].map((p) => (
              <Route key={p} path={p} element={<Auth key={p} />} />
            ))}
            {(["citizen", "officer", "admin"] as Role[]).flatMap((role) =>
              [
                "dashboard",
                "complaints",
                "complaints/:id",
                ...(role === "admin"
                  ? [
                      "users",
                      "departments",
                      "localities",
                      "categories",
                      "alerts",
                      "analytics",
                      "settings",
                    ]
                  : [
                      "notifications",
                      "profile",
                      role === "officer" ? "reports" : "report",
                    ]),
              ].map((page) => (
                <Route
                  key={role + page}
                  path={"/" + role + "/" + page}
                  element={
                    <Guard role={role}>
                      {page === "report" ? (
                        <Report />
                      ) : page.includes(":") ? (
                        <Issue />
                      ) : (
                        <Dashboard />
                      )}
                    </Guard>
                  }
                />
              )),
            )}
            <Route
              path="*"
              element={
                <main className="wrap">
                  <h1>
                    {l.pathname === "/unauthorized"
                      ? "Access restricted"
                      : "Page not found"}
                  </h1>
                  <p>
                    {l.pathname === "/unauthorized"
                      ? "Sign in with the appropriate demonstration role to access this workspace."
                      : "This page is unavailable."}
                  </p>
                  <Link className="btn" to="/login">
                    Sign in
                  </Link>{" "}
                  <Link to="/">Return home</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      <footer>
        <div className="wrap">
          <div className="spread">
            <div>
              <Brand />
              <p>Better neighbourhoods begin with you.</p>
            </div>
            <div className="footlinks">
              {[
                ["Explore issues", "/explore"],
                ["Help and support", "/how-it-works"],
                ["Cloud workspace", "/cloud"],
                ["About the project", "/about"],
                ["Privacy policy", "/privacy"],
                ["Terms of use", "/terms"],
              ].map(([s, p]) => (
                <Link key={p} to={p}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <small>
            Academic prototype · Fictional reports and simulated department
            assignments. Independent of government services.
          </small>
        </div>
      </footer>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
