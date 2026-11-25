import {cloudOwner} from "../../services/workspace";
import { useState } from "react";
import {
  save,
  useDB,
  reset,
  uid,
  now,
  alertKinds,
  notice,
} from "../../services/data";
import { Select } from "../../components/ui/index";
import { Pager } from "../public/Public";
export function Confirm({
  message,
  confirm,
  cancel,
}: {
  message: string;
  confirm: () => void;
  cancel: () => void;
}) {
  return (
    <dialog
      ref={(d) => {
        if (d && !d.open) d.showModal();
      }}
      onCancel={cancel}
      aria-label="Confirm change"
    >
      <h2>Confirm change</h2>
      <p>{message}</p>
      <div className="row">
        <button autoFocus onClick={cancel}>
          Cancel
        </button>
        <button
          className="primary"
          onClick={() => {
            confirm();
            cancel();
          }}
        >
          Confirm
        </button>
      </div>
    </dialog>
  );
}
export function csv(rows: string[][]) {
  const blob = new Blob(
      [
        "\ufeff" +
          rows
            .map((r) =>
              r
                .map(
                  (v) =>
                    '"' +
                    (/^[=+@-]/.test(v) ? "'" : "") +
                    v.replaceAll('"', '""') +
                    '"',
                )
                .join(","),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "local-resolve.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Admin({ page }: { page: string }) {
  const db = useDB(),
    [selected, S] = useState(""),
    [name, N] = useState(""),
    [desc, D] = useState(""),
    [dept, T] = useState(db.departments[0]?.name || ""),
    [loc, L] = useState(db.localities[0] || ""),
    [kind, K] = useState(alertKinds[0]),
    [severity, V] = useState("Advisory"),
    [action, A] = useState<(() => void) | null>(null),
    [msg, M] = useState(""),
    [q, Q] = useState(""),
    [p, P] = useState(1),
    [order, O] = useState("A–Z");
  const items =
    page === "departments"
      ? db.departments.map((d) => d.name)
      : page === "categories"
        ? db.categories.map((d) => d.name)
        : page === "localities"
          ? db.localities
          : page === "alerts"
            ? db.alerts.map((d) => d.title)
            : db.users.map((d) => d.email);
  const result = items
    .filter((s) => s.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      order === "A–Z" ? a.localeCompare(b) : b.localeCompare(a),
    );
  function clear() {
    S("");
    N("");
    D("");
  }
  function edit(s: string) {
    S(s);
    N(s);
    const a = db.alerts.find((a) => a.title === s),
      c = db.categories.find((c) => c.name === s);
    D(
      a?.description ||
        db.departments.find((d) => d.name === s)?.description ||
        "",
    );
    if (a) {
      L(a.locality);
      K(a.category);
      V(a.severity);
      T(a.authority);
    }
    if (c) T(c.department);
  }
  function commit(remove = false) {
    const value = name.trim();
    if (!remove && (!value || (items.includes(value) && selected !== value))) {
      M("Enter a unique name.");
      return;
    }
    const used = db.complaints.some((c) =>
      [c.departmentId, c.categoryId, c.locality].includes(selected),
    );
    if (
      remove &&
      ((used && page !== "alerts") ||
        (page === "departments" &&
          db.categories.some((c) => c.department === selected)) ||
        (page === "localities" &&
          db.users.some((u) => u.locality === selected)))
    ) {
      M("This entry is in use. Reassign its records before removing it.");
      return;
    }
    if (page === "departments") {
      save({
        departments: [
          ...db.departments.filter((v) => v.name !== selected),
          ...(remove
            ? []
            : [{ name: value, id: value, active: true, description: desc }]),
        ],
        categories: db.categories.map((c) =>
          c.department === selected ? { ...c, department: value } : c,
        ),
        users: db.users.map((u) =>
          u.departmentId === selected ? { ...u, departmentId: value } : u,
        ),
        complaints: db.complaints.map((c) =>
          c.departmentId === selected ? { ...c, departmentId: value } : c,
        ),
      });
    } else if (page === "categories") {
      save({
        categories: [
          ...db.categories.filter((v) => v.name !== selected),
          ...(remove ? [] : [{ name: value, department: dept }]),
        ],
        complaints: db.complaints.map((c) =>
          c.categoryId === selected ? { ...c, categoryId: value } : c,
        ),
      });
    } else if (page === "localities") {
      save({
        localities: [
          ...db.localities.filter((v) => v !== selected),
          ...(remove ? [] : [value]),
        ],
        locality: db.locality === selected ? value : db.locality,
        users: db.users.map((u) =>
          u.locality === selected ? { ...u, locality: value } : u,
        ),
        alerts: db.alerts.map((a) =>
          a.locality === selected ? { ...a, locality: value } : a,
        ),
        complaints: db.complaints.map((c) =>
          c.locality === selected ? { ...c, locality: value } : c,
        ),
      });
    } else if (page === "alerts") {
      const old = db.alerts.find((a) => a.title === selected);
      save({
        alerts: [
          ...db.alerts.filter((a) => a.title !== selected),
          ...(remove
            ? []
            : [
                {
                  id: old?.id || uid(),
                  title: value,
                  description: desc,
                  category: kind,
                  locality: loc,
                  severity,
                  authority: dept,
                  createdAt: old?.createdAt || now(),
                  expiresAt:
                    old?.expiresAt ||
                    new Date(Date.now() + 604800000).toISOString(),
                  readBy: [],
                },
              ]),
        ],
        notifications: remove
          ? db.notifications
          : [
              ...db.users
                .filter((u) => u.locality === loc && u.notify)
                .map((u) => notice(u.id, "Local alert", value)),
              ...db.notifications,
            ],
      });
    }
    M(remove ? "Entry removed." : "Changes saved.");
    clear();
    P(1);
  }
  if (page === "settings")
    return (
      <>
        <h1>Settings</h1>
        <section className="panel">
          <h2>Reset demonstration data</h2>
          <p>
            Restore the initial reports, accounts and alerts. This removes local
            submissions and evidence.
          </p>
          <button onClick={() => A(() => reset)}>Reset demo data</button>
        </section>
        {action && (
          <Confirm
            message="Erase this browser’s demonstration data?"
            confirm={action}
            cancel={() => A(null)}
          />
        )}
      </>
    );
  return (
    <>
      <h1>
        {page === "users"
          ? "User management"
          : page === "alerts"
            ? "Alerts management"
            : page}
      </h1>
      <div className="filters">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => {
              Q(e.target.value);
              P(1);
            }}
          />
        </label>
        <Select
          label="Sort"
          value={order}
          options={["A–Z", "Z–A"]}
          onChange={O}
        />
        <button onClick={() => csv([[page], ...result.map((v) => [v])])}>
          Export CSV
        </button>
      </div>
      <div className="panel">
        {result.slice((p - 1) * 8, p * 8).map((s) => (
          <div className="record spread" key={s}>
            <strong>{s}</strong>
            {page === "users" ? (
              <div className="row">
                {db.users.find((u) => u.email === s)?.role === "officer" && (
                  <Select
                    label="Officer department"
                    value={db.users.find((u) => u.email === s)!.departmentId}
                    options={db.departments
                      .filter((d) => d.active)
                      .map((d) => d.name)}
                    onChange={(departmentId) =>
                      save({
                        users: db.users.map((u) =>
                          u.email === s ? { ...u, departmentId } : u,
                        ),
                      })
                    }
                  />
                )}
                <button
                  disabled={s === "admin@demo.local"}
                  onClick={() =>
                    A(
                      () => () =>
                        save({
                          users: db.users.map((u) =>
                            u.email === s ? { ...u, enabled: !u.enabled } : u,
                          ),
                        }),
                    )
                  }
                >
                  {db.users.find((u) => u.email === s)?.enabled
                    ? "Disable"
                    : "Enable"}
                </button>
                <button
                  onClick={() =>
                    A(() => () => {
                      save({
                        users: db.users.map((u) =>
                          u.email === s ? { ...u, passwordHash: undefined } : u,
                        ),
                      });
                      M("Password reset to LocalDemo123!");
                    })
                  }
                >
                  Reset password
                </button>
              </div>
            ) : (
              <button onClick={() => edit(s)}>Edit</button>
            )}
          </div>
        ))}
        {!result.length && <p>No matching entries.</p>}
        <Pager page={p} count={result.length} size={8} change={P} />
      </div>
      {page !== "users" && (
        <form
          className="panel form"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <h2>{selected ? "Edit entry" : "Add entry"}</h2>
          <label>
            {page === "alerts" ? "Announcement title" : "Name"}
            <input required value={name} onChange={(e) => N(e.target.value)} />
          </label>
          {["alerts", "departments"].includes(page) && (
            <label>
              Description
              <textarea
                required
                value={desc}
                onChange={(e) => D(e.target.value)}
              />
            </label>
          )}
          {["alerts", "categories"].includes(page) && (
            <Select
              label="Department"
              options={db.departments.map((d) => d.name)}
              value={dept}
              onChange={T}
            />
          )}{" "}
          {page === "alerts" && (
            <>
              <Select
                label="Locality"
                options={db.localities}
                value={loc}
                onChange={L}
              />
              <Select
                label="Category"
                options={alertKinds}
                value={kind}
                onChange={K}
              />
              <Select
                label="Severity"
                options={["Advisory", "Important", "Urgent"]}
                value={severity}
                onChange={V}
              />
            </>
          )}
          <div className="row">
            <button className="primary">Save entry</button>
            {selected && (
              <>
                <button type="button" onClick={clear}>
                  Cancel edit
                </button>
                <button
                  type="button"
                  onClick={() => A(() => () => commit(true))}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </form>
      )}
      <p role="status">{msg}</p>
      {action && (
        <Confirm
          message="Apply this change to the selected record?"
          confirm={action}
          cancel={() => A(null)}
        />
      )}
    </>
  );
}
