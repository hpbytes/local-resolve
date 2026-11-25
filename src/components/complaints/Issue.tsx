import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  useDB,
  useUser,
  save,
  next,
  update,
  uid,
  now,
  date,
  type Complaint,
} from "../../services/data";
import { Select, Badge, Preview, Upload } from "../ui/index";
import MapView from "../maps/Map";
export function Track() {
  const [sp, P] = useSearchParams(),
    id = sp.get("id") || "",
    [q, Q] = useState(id),
    c = useDB((s) => s.complaints.find((c) => c.id === id));
  return (
    <main className="wrap narrow">
      <h1>Track a complaint</h1>
      <p>Enter your report ID to follow department updates.</p>
      <form
        className="filters panel"
        onSubmit={(e) => {
          e.preventDefault();
          P({ id: q.trim().toUpperCase() });
        }}
      >
        <label>
          Report ID
          <input
            required
            value={q}
            placeholder="LR-2026-000124"
            onChange={(e) => Q(e.target.value)}
          />
        </label>
        <button className="primary">Track complaint</button>
      </form>
      {id &&
        (c ? (
          <Content key={c.id} c={c} />
        ) : (
          <p role="alert">No complaint matches this report ID.</p>
        ))}
    </main>
  );
}
export default function Issue() {
  const { id } = useParams(),
    c = useDB((s) => s.complaints.find((c) => c.id === id));
  return (
    <main className="wrap narrow">
      {c ? <Content key={id} c={c} /> : <h1>Report not found</h1>}
    </main>
  );
}
function Content({ c }: { c: Complaint }) {
  const db = useDB(),
    u = useUser(),
    [msg, M] = useState(""),
    [note, N] = useState(""),
    [rating, R] = useState("5"),
    [evidence, E] = useState<string[]>([]),
    manage =
      u?.role === "admin" ||
      (u?.role === "officer" && u.departmentId === c.departmentId);
  function act(status: string) {
    if (["Rejected", "Reopened"].includes(status) && !note.trim()) {
      M("Please enter a reason first.");
      return;
    }
    update(
      c,
      note.trim() || "Status changed to " + status,
      status,
      status === "Resolved"
        ? { resolutionMedia: [...c.resolutionMedia, ...evidence] }
        : {},
    );
    N("");
    E([]);
    M("Timeline updated.");
  }
  return (
    <>
      <small>Demonstration report · {c.id}</small>
      <h1>{c.title}</h1>
      <Badge s={c.status} />
      <div className="panel">
        <p>{c.description}</p>
        <dl>
          {Object.entries({
            Category: c.categoryId,
            "Responsible department": c.departmentId,
            Reported: date(c.createdAt),
            Location: [c.street, c.landmark, c.locality, c.district]
              .filter(Boolean)
              .join(", "),
            Priority: c.priority,
            Verification: c.history.some((h) => h.newStatus === "Verified")
              ? "Department verified"
              : "Awaiting verification",
            ...(c.resolvedAt ? { "Resolution date": date(c.resolvedAt) } : {}),
          }).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {[
          ["Submitted evidence", c.mediaIds],
          ["Resolution evidence", c.resolutionMedia],
        ].map(
          ([title, ids]) =>
            Array.isArray(ids) &&
            ids.length > 0 && (
              <section key={String(title)}>
                <h3>{String(title)}</h3>
                <div className="gallery">
                  {ids.map((id) => (
                    <Preview key={id} id={id} />
                  ))}
                </div>
              </section>
            ),
        )}
        {c.latitude !== null && <MapView items={[c]} />}
        <p>{c.confirmations.length} community confirmations</p>
        <div className="row">
          {u ? (
            <button
              disabled={c.confirmations.includes(u.id)}
              onClick={() =>
                save({
                  complaints: db.complaints.map((v) =>
                    v.id === c.id
                      ? { ...v, confirmations: [...v.confirmations, u.id] }
                      : v,
                  ),
                })
              }
            >
              {c.confirmations.includes(u.id)
                ? "Confirmed"
                : "Confirm this issue"}
            </button>
          ) : (
            <Link className="btn" to={"/login?next=/issues/" + c.id}>
              Sign in to confirm
            </Link>
          )}
          <button
            onClick={() =>
              navigator.clipboard
                .writeText(location.origin + "/issues/" + c.id)
                .then(() => M("Complaint link copied."))
                .catch(() => M(location.origin + "/issues/" + c.id))
            }
          >
            Share complaint
          </button>
        </div>
      </div>
      <h2>Status timeline</h2>
      <ol className="timeline">
        {c.history.map((h) => (
          <li key={h.id}>
            <strong>{h.newStatus}</strong>
            <small>{new Date(h.timestamp).toLocaleString("en-IN")}</small>
            <p>{h.note}</p>
          </li>
        ))}
      </ol>
      {manage && (
        <div className="panel form">
          <h2>Manage complaint</h2>
          <Select
            label="Priority"
            value={c.priority}
            options={["Low", "Normal", "High"]}
            onChange={(priority) =>
              update(c, "Priority changed to " + priority, c.status, {
                priority,
              })
            }
          />
          {u?.role === "admin" && (
            <Select
              label="Assigned department"
              value={c.departmentId}
              options={db.departments
                .filter((d) => d.active)
                .map((d) => d.name)}
              onChange={(departmentId) =>
                update(c, "Assigned to " + departmentId, c.status, {
                  departmentId,
                })
              }
            />
          )}
          <label>
            Progress note or reason
            <textarea value={note} onChange={(e) => N(e.target.value)} />
          </label>
          <button disabled={!note.trim()} onClick={() => act(c.status)}>
            Add progress note
          </button>
          {c.status === "In Progress" && <Upload ids={evidence} change={E} />}
          <div className="row">
            {(next[c.status] || []).map((s) => (
              <button key={s} onClick={() => act(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {u?.id === c.userId && c.status === "Resolved" && (
        <div className="panel form">
          <h2>Review resolution</h2>
          <Select
            label="Rating out of five"
            value={rating}
            options={["1", "2", "3", "4", "5"]}
            onChange={R}
          />
          <label>
            Feedback or reopening reason
            <textarea value={note} onChange={(e) => N(e.target.value)} />
          </label>
          <div className="row">
            <button
              onClick={() => {
                save({
                  feedback: [
                    ...db.feedback,
                    {
                      id: uid(),
                      complaintId: c.id,
                      userId: u.id,
                      rating: +rating,
                      comment: note,
                      createdAt: now(),
                    },
                  ],
                });
                act("Closed");
              }}
            >
              Confirm closure
            </button>
            <button onClick={() => act("Reopened")}>Reopen complaint</button>
          </div>
        </div>
      )}
      <p role="status">{msg}</p>
    </>
  );
}
