import { useState, useDeferredValue } from "react";
import { MapPin, Bell, Search } from "lucide-react";
import { projectTeam } from "../../data/project";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  LocateFixed,
  ClipboardList,
  Clock3,
  CircleCheck,
  TrendingUp,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Map as MapIcon,
  ChevronRight,
} from "lucide-react";
import {
  useDB,
  save,
  date,
  names,
  statuses,
  alertKinds,
  useUser,
} from "../../services/data";
import { Badge, Icon, Card, Select } from "../../components/ui/index";
import MapView from "../../components/maps/Map";
const steps = [
  "Report a problem",
  "Community and department verification",
  "Track the progress",
  "Confirm the resolution",
];
const explanations = [
  "Describe the issue, select its location and attach evidence.",
  "Neighbours can confirm what they see. A department officer reviews the report.",
  "Use your report ID to see assignments and timestamped updates.",
  "Review the outcome, leave feedback, or reopen the report with a reason.",
];
export function Workflow() {
  return (
    <div className="four">
      {steps.map((s, i) => (
        <article className="card" key={s}>
          <small>Step {i + 1}</small>
          <h3>{s}</h3>
          <p>{explanations[i]}</p>
        </article>
      ))}
    </div>
  );
}
export function Stats({ values }: { values: [string, string | number][] }) {
  return (
    <div className="stats">
      {values.map(([s, n], i) => {
        const I = [ClipboardList, Clock3, CircleCheck, TrendingUp][i % 4];
        return (
          <div key={s}>
            <I size={23} />
            <section>
              <strong>{n}</strong>
              <small>{s}</small>
            </section>
          </div>
        );
      })}
    </div>
  );
}
export function Home() {
  const db = useDB(),
    [cat, C] = useState("All categories"),
    [msg, M] = useState(""),
    reports = db.complaints
      .filter((c) => c.locality === db.locality)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    alerts = db.alerts
      .filter(
        (a) =>
          a.locality === db.locality && Date.parse(a.expiresAt) > Date.now(),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    localityQuery = "?locality=" + encodeURIComponent(db.locality);
  return (
    <>
      <div className="locbar">
        <div className="wrap row">
          <MapPin size={16} />
          <select aria-label="District">
            <option>Coimbatore</option>
          </select>
          <span>/</span>
          <select
            aria-label="Locality"
            value={db.locality}
            onChange={(e) => save({ locality: e.target.value })}
          >
            {db.localities.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="geolink"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition(
                (p) => {
                  const nearby = db.complaints
                    .filter((c) => c.latitude !== null && c.longitude !== null)
                    .sort(
                      (a, b) =>
                        Math.hypot(
                          a.latitude! - p.coords.latitude,
                          a.longitude! - p.coords.longitude,
                        ) -
                        Math.hypot(
                          b.latitude! - p.coords.latitude,
                          b.longitude! - p.coords.longitude,
                        ),
                    )[0];
                  if (nearby) {
                    save({ locality: nearby.locality });
                    M("Closest demonstration locality selected.");
                  }
                },
                () => M("Location unavailable. Choose your locality manually."),
              )
            }
          >
            <LocateFixed size={15} /> Detect location
          </button>
          <small role="status">{msg}</small>
        </div>
      </div>
      <main className="wrap bulletin">
        <div className="edition">
          <div>
            <h1>{db.locality} bulletin</h1>
            <p>Local notices and community reports in Coimbatore.</p>
          </div>
          <small>Demonstration edition</small>
        </div>
        <div className="bulletin-columns">
          <div>
            <section className="notice-column">
              <div className="bulletin-heading">
                <h2>
                  <Bell size={19} />
                  Local notices
                </h2>
                <Link to={"/alerts" + localityQuery}>All notices</Link>
              </div>
              {alerts.length ? (
                alerts.slice(0, 3).map((a) => (
                  <article className="lead-notice" key={a.id}>
                    <small>
                      {a.category} &middot; {a.severity}
                    </small>
                    <h3>{a.title}</h3>
                    <p>{a.description}</p>
                    <small>
                      {a.authority} &middot; {date(a.createdAt)}
                    </small>
                  </article>
                ))
              ) : (
                <p>No active notices for {db.locality}.</p>
              )}
            </section>
            <section>
              <div className="bulletin-heading">
                <h2>Community updates</h2>
                <Link to={"/explore" + localityQuery}>All reports</Link>
              </div>
              {reports.slice(0, 5).map((c) => (
                <article className="report-line" key={c.id}>
                  <div>
                    <small>
                      {c.categoryId} &middot; {date(c.updatedAt)}
                    </small>
                    <h3>
                      <Link to={"/issues/" + c.id}>{c.title}</Link>
                    </h3>
                    <small>
                      {c.street} &middot; {c.confirmations.length} confirmations
                    </small>
                  </div>
                  <Badge s={c.status} />
                </article>
              ))}
              {!reports.length && (
                <p>
                  No reports yet.{" "}
                  <Link to="/citizen/report">Report a local issue</Link>.
                </p>
              )}
            </section>
          </div>
          <aside className="local-desk">
            <figure>
              <img
                src="/images/coimbatore.jpg"
                alt="Shops and traffic along a Coimbatore street"
                width="1200"
                height="800"
              />
              <figcaption>
                Coimbatore &middot;{" "}
                <a href="https://matthewtrader.com">Matthew T Rader</a> &middot;{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/">
                  CC BY-SA 4.0
                </a>
              </figcaption>
            </figure>
            <h2>Track a complaint</h2>
            <form className="lookup" action="/track">
              <label>
                Report ID
                <input
                  name="id"
                  required
                  placeholder="LR-2026-000124"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                />
              </label>
              <button className="primary" aria-label="Track complaint">
                <Search size={18} />
              </button>
            </form>
            <h2>Report by category</h2>
            <div className="service-links">
              {db.categories.map((c) => (
                <Link
                  key={c.name}
                  to={"/citizen/report?category=" + encodeURIComponent(c.name)}
                >
                  <Icon name={c.name} size={17} />
                  {c.name}
                </Link>
              ))}
            </div>
          </aside>
        </div>
        <section>
          <div className="bulletin-heading">
            <h2>Neighbourhood map</h2>
            <Select
              label="Category"
              value={cat}
              options={["All categories", ...db.categories.map((c) => c.name)]}
              onChange={C}
            />
          </div>
          {reports.some(
            (c) =>
              (cat === "All categories" || c.categoryId === cat) &&
              c.latitude !== null,
          ) ? (
            <MapView
              items={reports.filter(
                (c) => cat === "All categories" || c.categoryId === cat,
              )}
            />
          ) : (
            <p>No mapped reports match this selection.</p>
          )}
        </section>
        <section>
          <div className="bulletin-heading">
            <h2>{db.locality} in figures</h2>
          </div>
          <Stats
            values={[
              ["Reports", reports.length],
              [
                "In progress",
                reports.filter((c) => c.status === "In Progress").length,
              ],
              [
                "Resolved or closed",
                reports.filter((c) => ["Resolved", "Closed"].includes(c.status))
                  .length,
              ],
              ["Active notices", alerts.length],
            ]}
          />
        </section>
      </main>
    </>
  );
}
export function Explore() {
  const [params] = useSearchParams();
  const db = useDB(),
    [q, Q] = useState(""),
    [filters, F] = useState<Record<string, string>>({
      locality: params.get("locality") || "All",
    }),
    [sort, S] = useState("Latest"),
    [view, V] = useState("Grid"),
    [page, P] = useState(1);
  const search = useDeferredValue(q);
  const groups = {
      district: ["Coimbatore"],
      locality: db.localities,
      categoryId: db.categories.map((c) => c.name),
      status: statuses,
    },
    result = db.complaints
      .filter(
        (c) =>
          (c.title + c.id + c.street)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          Object.entries(groups).every(
            ([k]) =>
              !filters[k] ||
              filters[k] === "All" ||
              c[k as keyof typeof c] === filters[k],
          ) &&
          (!filters.date || c.createdAt.slice(0, 10) >= filters.date),
      )
      .sort((a, b) =>
        sort === "Most confirmed"
          ? b.confirmations.length - a.confirmations.length
          : sort === "Priority"
            ? ["High", "Normal", "Low"].indexOf(a.priority) -
              ["High", "Normal", "Low"].indexOf(b.priority)
            : sort === "Oldest"
              ? a.createdAt.localeCompare(b.createdAt)
              : b.createdAt.localeCompare(a.createdAt),
      );
  return (
    <main className="wrap">
      <h1>Explore issues</h1>
      <p>Search fictional civic reports across Coimbatore.</p>
      <div className="panel">
        <label>
          Search issues
          <input
            value={q}
            onChange={(e) => {
              Q(e.target.value);
              P(1);
            }}
            placeholder="Search by title, street or report ID"
          />
        </label>
        <div className="filters">
          {Object.entries(groups).map(([k, opts], i) => (
            <Select
              key={k}
              label={["District", "Locality", "Category", "Status"][i]}
              value={filters[k] || "All"}
              options={["All", ...opts]}
              onChange={(v) => {
                F({ ...filters, [k]: v });
                P(1);
              }}
            />
          ))}
          <label>
            Reported since
            <input
              type="date"
              value={filters.date || ""}
              onChange={(e) => {
                F({ ...filters, date: e.target.value });
                P(1);
              }}
            />
          </label>
          <button
            onClick={() => {
              F({});
              Q("");
              P(1);
            }}
          >
            <SlidersHorizontal size={15} />
            Clear filters
          </button>
        </div>
      </div>
      <div className="sectionhead">
        <strong>{result.length} results</strong>
        <div className="row">
          <Select
            label="Sort by"
            value={sort}
            options={["Latest", "Oldest", "Most confirmed", "Priority"]}
            onChange={S}
          />
          {[LayoutGrid, List, MapIcon].map((I, i) => (
            <button
              key={i}
              aria-label={["Grid", "List", "Map"][i] + " view"}
              aria-pressed={view === ["Grid", "List", "Map"][i]}
              onClick={() => V(["Grid", "List", "Map"][i])}
            >
              <I size={18} />
            </button>
          ))}
        </div>
      </div>
      {!result.length ? (
        <p>No matching reports. Try adjusting your filters.</p>
      ) : view === "Map" ? (
        <MapView items={result} />
      ) : (
        <>
          <div className={view === "Grid" ? "three" : "stack"}>
            {result.slice((page - 1) * 9, page * 9).map((c) => (
              <Card key={c.id} c={c} />
            ))}
          </div>
          <Pager page={page} count={result.length} size={9} change={P} />
        </>
      )}
    </main>
  );
}
export function Pager({
  page,
  count,
  size,
  change,
}: {
  page: number;
  count: number;
  size: number;
  change: (n: number) => void;
}) {
  return (
    <div className="pages">
      <button disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <small>
        Page {page} of {Math.max(1, Math.ceil(count / size))}
      </small>
      <button disabled={page * size >= count} onClick={() => change(page + 1)}>
        Next
      </button>
    </div>
  );
}
export function Alerts() {
  const [params] = useSearchParams();
  const db = useDB(),
    id = useUser()?.id || "guest",
    [q, Q] = useState(""),
    [loc, L] = useState(params.get("locality") || "All"),
    [kind, K] = useState("All");
  const list = db.alerts.filter(
    (a) =>
      (loc === "All" || a.locality === loc) &&
      (kind === "All" || a.category === kind) &&
      (a.title + a.description).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <main className="wrap">
      <h1>Local alerts</h1>
      <p>Demonstration announcements for Coimbatore neighbourhoods.</p>
      <div className="filters">
        <label>
          Search alerts
          <input value={q} onChange={(e) => Q(e.target.value)} />
        </label>
        <Select
          label="Locality"
          options={["All", ...db.localities]}
          value={loc}
          onChange={L}
        />
        <Select
          label="Category"
          options={["All", ...alertKinds]}
          value={kind}
          onChange={K}
        />
      </div>
      {list.map((a) => (
        <article className="panel" key={a.id}>
          <small>
            {a.category} · {a.severity} · {date(a.createdAt)}
          </small>
          <h2>{a.title}</h2>
          <p>{a.description}</p>
          <div className="spread">
            <small>
              {a.locality} · {a.authority}
            </small>
            <button
              onClick={() =>
                save({
                  alerts: db.alerts.map((v) =>
                    v.id === a.id
                      ? {
                          ...v,
                          readBy: v.readBy.includes(id)
                            ? v.readBy.filter((u) => u !== id)
                            : [...v.readBy, id],
                        }
                      : v,
                  ),
                })
              }
            >
              {a.readBy.includes(id) ? "Mark unread" : "Mark read"}
            </button>
          </div>
        </article>
      ))}
      {!list.length && <p>No matching alerts.</p>}
    </main>
  );
}
export function Info() {
  const path = useLocation().pathname;
  const content: Record<string, [string, string]> = {
    "/about": [
      "About Local Resolve",
      "Local Resolve is an academic project exploring how neighbours and service departments can coordinate civic repairs. Reports often lack a clear owner or progress record. This prototype connects evidence, department assignment and public updates in one place. It uses fictional Coimbatore data. An optional private Firebase workspace supports access from more than one device.",
    ],
    "/privacy": [
      "Privacy policy",
      "Use fictional account details and evidence. In local mode, records and evidence stay in this browser. In cloud mode, Firebase Authentication handles cloud sign-in, Firestore stores workspace records, and Cloud Storage holds attachments. Anyone signed into the same cloud account can open its demo roles. OpenStreetMap receives tile requests when maps load.",
    ],
    "/terms": [
      "Terms of use",
      "This academic demonstration simulates civic reporting. For real incidents, contact your municipal service provider directly. Upload only media you have permission to share.",
    ],
  };
  if (content[path])
    return (
      <main className="wrap narrow">
        <h1>{content[path][0]}</h1>
        <p>{content[path][1]}</p>
        {path === "/about" && projectTeam.length > 0 && (
          <section>
            <h2>Project team</h2>
            <p>{projectTeam.join(", ")}</p>
          </section>
        )}
      </main>
    );
  return (
    <main className="wrap">
      <h1>How it works</h1>
      <Workflow />
      <h2>Frequently asked questions</h2>
      {[
        "How do I report an issue?",
        "Who verifies my report?",
        "How do I track progress?",
        "What information is public?",
        "Can I reopen a complaint?",
      ].map((q, i) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>
            {
              [
                explanations[0],
                explanations[1],
                explanations[2],
                "Issue descriptions, evidence and locations appear in the directory. Account contact details are private.",
                explanations[3],
              ][i]
            }
          </p>
        </details>
      ))}
    </main>
  );
}
