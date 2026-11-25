import { lazy, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  Settings,
  Menu,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { cloudOwner, leaveWorkspace } from "../services/workspace";
import {
  useDB,
  useUser,
  session,
  save,
  date,
  statuses,
  type Complaint,
} from "../services/data";
import { Select, Badge, Card } from "../components/ui/index";
import { Stats, Pager } from "../pages/public/Public";
import Admin, { csv } from "../pages/admin/Admin";
const Analytics = lazy(() => import("../components/charts/Analytics"));
export default function Dashboard() {
  const db = useDB(),
    u = useUser()!,
    nav = useNavigate(),
    path = useLocation().pathname,
    page = path.split("/")[2],
    base = "/" + u.role + "/",
    [drawer, D] = useState(false),
    [msg, M] = useState(""),
    [name, N] = useState(u.name),
    [loc, L] = useState(u.locality),
    [notify, V] = useState(u.notify);
  function logout() {
    if (cloudOwner) {
      void signOut(auth)
        .then(leaveWorkspace)
        .catch(() => M("Sign out failed. Try again."));
      return;
    }
    session("");
    nav("/");
  }
  const items = db.complaints.filter(
      (c) =>
        u.role === "admin" ||
        (u.role === "citizen"
          ? c.userId === u.id
          : c.departmentId === u.departmentId),
    ),
    resolved = items.filter((c) => ["Resolved", "Closed"].includes(c.status)),
    active = items.filter(
      (c) => !["Rejected", "Resolved", "Closed"].includes(c.status),
    ),
    pending = items.filter((c) =>
      ["Reported", "Under Review", "Reopened"].includes(c.status),
    ),
    notes = db.notifications.filter((n) => n.userId === u.id);
  const links: [string, string][] = [
    ["Overview", base + "dashboard"],
    ...(u.role === "citizen"
      ? [
          ["Report an Issue", base + "report"],
          ["My Complaints", base + "complaints"],
          ["Explore Issues", "/explore"],
          ["Local Alerts", "/alerts"],
        ]
      : u.role === "officer"
        ? [
            ["Assigned Complaints", base + "complaints"],
            ["Pending Verification", base + "complaints?filter=Pending"],
            ["In Progress", base + "complaints?filter=In%20Progress"],
            ["Resolved Complaints", base + "complaints?filter=Resolved"],
            ["Reports", base + "reports"],
          ]
        : [
            ["All Complaints", base + "complaints"],
            ["User Management", base + "users"],
            ...[
              "Departments",
              "Categories",
              "Localities",
              "Alerts",
              "Analytics",
              "Settings",
            ].map((s) => [s, base + s.toLowerCase()]),
          ]),
    ...(u.role === "admin"
      ? []
      : [
          ["Notifications", base + "notifications"],
          ["Profile Settings", base + "profile"],
          ["Help", "/how-it-works"],
        ]),
  ] as [string, string][];
  return (
    <div className="workspace">
      <button className="drawerbtn" onClick={() => D(!drawer)}>
        <Menu />
        Workspace menu
      </button>
      <aside className={drawer ? "open" : ""}>
        <small>{u.role.toUpperCase()} WORKSPACE</small>
        {links.map(([s, url], i) => {
          const I = [LayoutDashboard, ClipboardList, Bell, Settings][i % 4];
          return (
            <Link
              key={url}
              aria-current={
                location.pathname + location.search === url ? "page" : undefined
              }
              onClick={() => D(false)}
              to={url}
            >
              <I size={17} />
              {s}
            </Link>
          );
        })}
        <button onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>
      <main className="dash">
        <div className="sectionhead">
          <small>Local Resolve / {u.role} workspace</small>
          <div className="row">
            {u.role !== "admin" && (
              <details className="profilemenu">
                <summary aria-label="Notification panel">
                  <Bell size={19} />
                  {notes.filter((n) => !n.read).length || ""}
                </summary>
                <div>
                  {notes.length ? (
                    notes.slice(0, 3).map((n) => (
                      <small key={n.id}>
                        {n.title} ? {n.message}
                      </small>
                    ))
                  ) : (
                    <small>No notifications yet.</small>
                  )}
                  <Link to={base + "notifications"}>All notifications</Link>
                </div>
              </details>
            )}
            <details className="profilemenu">
              <summary>
                <UserRound size={17} />
                {u.name}
              </summary>
              <div>
                <Link to={base + (u.role === "admin" ? "settings" : "profile")}>
                  Account settings
                </Link>
                <Link to="/login">Switch demo account</Link>
                <button onClick={logout}>Sign out</button>
              </div>
            </details>
          </div>
        </div>
        {page === "dashboard" ? (
          <>
            <h1>
              {u.role === "citizen"
                ? "Welcome, " + u.name.split(" ")[0]
                : u.role === "admin"
                  ? "Administration overview"
                  : "Department overview"}
            </h1>
            <p>
              {u.role === "officer"
                ? u.departmentId
                : "Demonstration activity in Coimbatore."}
            </p>
            {u.role === "citizen" && (
              <Link className="btn primary" to={base + "report"}>
                <Plus size={16} />
                Report an Issue
              </Link>
            )}
            <Stats
              values={
                u.role === "admin"
                  ? [
                      ["Total complaints", items.length],
                      ["Active", active.length],
                      ["Resolved", resolved.length],
                      ["Total users", db.users.length],
                      ["Departments", db.departments.length],
                      [
                        "Resolution rate",
                        Math.round(
                          (resolved.length * 100) / (items.length || 1),
                        ) + "%",
                      ],
                    ]
                  : [
                      ["Total complaints", items.length],
                      ["Pending verification", pending.length],
                      [
                        "In progress",
                        items.filter((c) => c.status === "In Progress").length,
                      ],
                      ["Resolved", resolved.length],
                      ...(u.role === "officer"
                        ? ([
                            [
                              "Average resolution (days)",
                              (
                                resolved.reduce(
                                  (n, c) =>
                                    n +
                                    (Date.parse(c.resolvedAt) -
                                      Date.parse(c.createdAt)) /
                                      86400000,
                                  0,
                                ) / (resolved.length || 1)
                              ).toFixed(1),
                            ],
                            [
                              "Overdue (7 days)",
                              active.filter(
                                (c) =>
                                  Date.now() - Date.parse(c.createdAt) >
                                  604800000,
                              ).length,
                            ],
                          ] as [string, string | number][])
                        : []),
                    ]
              }
            />
            <h2>Recent complaints</h2>
            <Table items={items.slice(0, 5)} base={base} />
            {u.role === "admin" ? (
              <Analytics items={items} />
            ) : (
              <>
                <h2>Recent activity</h2>
                {items
                  .flatMap((c) =>
                    c.history.map((h) => ({ ...h, title: c.title })),
                  )
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .slice(0, 4)
                  .map((h) => (
                    <p key={h.id}>
                      {date(h.timestamp)} · {h.title} · {h.newStatus}
                    </p>
                  ))}
                {u.role === "citizen" && (
                  <>
                    <h2>Neighbourhood issues</h2>
                    <div className="three">
                      {db.complaints
                        .filter((c) => c.locality === u.locality)
                        .slice(0, 3)
                        .map((c) => (
                          <Card key={c.id} c={c} />
                        ))}
                    </div>
                    <h2>Locality alerts</h2>
                    {db.alerts
                      .filter((a) => a.locality === u.locality)
                      .map((a) => (
                        <p key={a.id}>
                          <Link to="/alerts">{a.title}</Link>
                        </p>
                      ))}
                  </>
                )}
              </>
            )}
          </>
        ) : page === "complaints" ? (
          <Directory key={location.search} items={items} base={base} />
        ) : page === "reports" || page === "analytics" ? (
          <>
            <h1>Complaint analytics</h1>
            <Analytics items={items} />
          </>
        ) : page === "notifications" ? (
          <>
            <h1>Notifications</h1>
            <button
              onClick={() =>
                save({
                  notifications: db.notifications.map((n) =>
                    n.userId === u.id ? { ...n, read: true } : n,
                  ),
                })
              }
            >
              Mark all as read
            </button>
            {notes.map((n) => (
              <article className="panel" key={n.id}>
                <small>
                  {date(n.createdAt)} · {n.read ? "Read" : "Unread"}
                </small>
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                {!n.read && (
                  <button
                    onClick={() =>
                      save({
                        notifications: db.notifications.map((v) =>
                          v.id === n.id ? { ...v, read: true } : v,
                        ),
                      })
                    }
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
            {!notes.length && <p>No notifications yet.</p>}
          </>
        ) : page === "profile" ? (
          <form
            className="panel form"
            onSubmit={(e) => {
              e.preventDefault();
              save({
                users: db.users.map((v) =>
                  v.id === u.id
                    ? { ...v, name: name.trim(), locality: loc, notify }
                    : v,
                ),
              });
              M("Profile saved.");
            }}
          >
            <h1>Profile settings</h1>
            <label>
              Full name
              <input
                required
                value={name}
                onChange={(e) => N(e.target.value)}
              />
            </label>
            <Select
              label="Preferred locality"
              value={loc}
              options={db.localities}
              onChange={L}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => V(e.target.checked)}
              />
              Receive locality alerts
            </label>
            <button className="primary">Save preferences</button>
            <p role="status">{msg}</p>
          </form>
        ) : (
          <Admin page={page} key={page} />
        )}
      </main>
    </div>
  );
}
function Table({ items, base }: { items: Complaint[]; base: string }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {[
              "Report / issue",
              "Category / department",
              "Location",
              "Priority",
              "Confirmed",
              "Submitted",
              "Status",
              "Updated",
              "",
            ].map((t, i) => (
              <th key={i}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>
                <small>{c.id}</small>
                <strong>{c.title}</strong>
              </td>
              <td>
                {c.categoryId}
                <small>{c.departmentId}</small>
              </td>
              <td data-label="Locality">{c.locality}</td>
              <td data-label="Priority">{c.priority}</td>
              <td data-label="Confirmations">{c.confirmations.length}</td>
              <td data-label="Submitted">{date(c.createdAt)}</td>
              <td>
                <Badge s={c.status} />
              </td>
              <td data-label="Updated">{date(c.updatedAt)}</td>
              <td>
                <Link to={base + "complaints/" + c.id}>View details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <p>No complaints match.</p>}
    </div>
  );
}
function Directory({ items, base }: { items: Complaint[]; base: string }) {
  const db = useDB(),
    [sp] = useSearchParams(),
    [q, Q] = useState(""),
    [p, P] = useState(1),
    [f, F] = useState<Record<string, string>>({
      status: sp.get("filter") || "All",
    }),
    [sort, S] = useState("Latest");
  const opts = {
    status: [...statuses, "Pending"],
    priority: ["High", "Normal", "Low"],
    locality: db.localities,
    categoryId: db.categories.map((c) => c.name),
  };
  const rows = items
    .filter(
      (c) =>
        (c.id + c.title).toLowerCase().includes(q.toLowerCase()) &&
        Object.keys(opts).every(
          (k) =>
            !f[k] ||
            f[k] === "All" ||
            (f[k] === "Pending"
              ? ["Reported", "Under Review", "Reopened"].includes(c.status)
              : c[k as keyof Complaint] === f[k]),
        ) &&
        (!f.date || c.createdAt.slice(0, 10) >= f.date),
    )
    .sort((a, b) =>
      sort === "Latest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
  return (
    <>
      <h1>Complaints</h1>
      <div className="filters">
        <label>
          Search complaints
          <input
            value={q}
            onChange={(e) => {
              Q(e.target.value);
              P(1);
            }}
          />
        </label>
        {Object.entries(opts).map(([k, o]) => (
          <Select
            key={k}
            label={k === "categoryId" ? "Category" : k}
            options={["All", ...o]}
            value={f[k] || "All"}
            onChange={(v) => {
              F({ ...f, [k]: v });
              P(1);
            }}
          />
        ))}
        <label>
          Reported since
          <input
            type="date"
            onChange={(e) => {
              F({ ...f, date: e.target.value });
              P(1);
            }}
          />
        </label>
        <Select
          label="Sort"
          options={["Latest", "Oldest"]}
          value={sort}
          onChange={S}
        />
        <button
          onClick={() =>
            csv([
              ["ID", "Title", "Department", "Status"],
              ...rows.map((c) => [c.id, c.title, c.departmentId, c.status]),
            ])
          }
        >
          Export CSV
        </button>
      </div>
      <Table items={rows.slice((p - 1) * 8, p * 8)} base={base} />
      <Pager page={p} count={rows.length} size={8} change={P} />
    </>
  );
}
