import {draftPrefix} from "../../services/workspace";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  useDB,
  useUser,
  save,
  now,
  notice,
  event,
  type Complaint,
} from "../../services/data";
import { Select, Upload, Icon, Preview } from "../../components/ui/index";
import MapView from "../../components/maps/Map";
export default function Report() {
  const db = useDB(),
    u = useUser()!,
    [params] = useSearchParams(),
    key = draftPrefix + u.id,
    initial = {
      categoryId: db.categories[0]?.name || "",
      title: "",
      priority: "Normal",
      district: "Coimbatore",
      city: "Coimbatore",
      locality: u.locality,
      street: "",
      landmark: "",
      pin: "",
      latitude: null as number | null,
      longitude: null as number | null,
      description: "",
      mediaIds: [] as string[],
    };
  const [d, D] = useState<typeof initial>(() => ({
      ...initial,
      ...JSON.parse(localStorage.getItem(key) || "{}"),
      ...(params.get("category") ? { categoryId: params.get("category") } : {}),
    })),
    [step, S] = useState(0),
    [msg, M] = useState(""),
    [done, A] = useState("");
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) =>
    D({ ...d, [k]: v });
  const dept =
      db.categories.find((c) => c.name === d.categoryId)?.department || "",
    labels = ["Category", "Location", "Evidence", "Review"];
  function advance() {
    if (!dept) {
      M("Select a category assigned to a department.");
      S(0);
      return;
    }
    const schemas = [
      z.object({
        categoryId: z.string().min(1),
        title: z
          .string()
          .trim()
          .min(5, "Enter a title of at least 5 characters."),
      }),
      z.object({
        city: z.string().trim().min(1),
        locality: z.string().min(1),
        street: z.string().trim().min(2, "Enter the street name."),
        pin: z.string().regex(/^$|^[1-9]\d{5}$/, "Enter a six-digit PIN."),
      }),
      z.object({
        description: z
          .string()
          .trim()
          .min(15, "Describe the issue in at least 15 characters.")
          .max(3000),
      }),
    ];
    const check = schemas[step]?.safeParse(d);
    if (check && !check.success) {
      M(check.error.issues[0].message);
      return;
    }
    M("");
    if (step < 3) {
      S(step + 1);
      return;
    }
    const time = now(),
      year = new Date().getFullYear(),
      n =
        Math.max(
          0,
          ...db.complaints.map((c) => Number(c.id.split("-")[2]) || 0),
        ) + 1,
      id = "LR-" + year + "-" + String(n).padStart(6, "0");
    const c: Complaint = {
      ...d,
      id,
      reportId: id,
      userId: u.id,
      departmentId: dept,
      status: "Reported",
      confirmations: [],
      resolutionMedia: [],
      createdAt: time,
      updatedAt: time,
      resolvedAt: "",
      history: [
        event(id, "", "Reported", "Submitted and assigned to " + dept, u.name),
      ],
    };
    save({
      complaints: [c, ...db.complaints],
      notifications: [
        notice(u.id, "Complaint submitted", id + " assigned to " + dept),
        ...db.users
          .filter((v) => v.role === "officer" && v.departmentId === dept)
          .map((v) =>
            notice(v.id, "Department assignment", id + " assigned to " + dept),
          ),
        ...db.notifications,
      ],
    });
    localStorage.removeItem(key);
    A(id);
  }
  const field = (
    k: "title" | "city" | "street" | "landmark" | "pin",
    label: string,
  ) => (
    <label>
      {label}
      <input value={d[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  return (
    <main className="wrap narrow">
      <h1>{done ? "Complaint submitted successfully" : "Report an issue"}</h1>
      {done ? (
        <div className="panel">
          <small>Report ID</small>
          <h2>{done}</h2>
          <h3>{d.title}</h3>
          <p>{dept} · Reported</p>
          <button
            onClick={() =>
              navigator.clipboard
                .writeText(done)
                .then(() => M("Report ID copied."))
                .catch(() => M(done))
            }
          >
            Copy Report ID
          </button>{" "}
          <Link className="btn primary" to={"/track?id=" + done}>
            Track complaint
          </Link>
        </div>
      ) : (
        <>
          <p>Record a civic concern for simulated department review.</p>
          <div className="steps">
            {labels.map((l, i) => (
              <button
                key={l}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                onClick={() => S(i)}
              >
                {i + 1}. {l}
              </button>
            ))}
          </div>
          <div className="panel form">
            <h2>
              {
                [
                  "Select issue category",
                  "Location details",
                  "Description and evidence",
                  "Review your report",
                ][step]
              }
            </h2>
            {step === 0 ? (
              <>
                <div className="choices">
                  {db.categories.map((c) => (
                    <button
                      key={c.name}
                      aria-pressed={c.name === d.categoryId}
                      onClick={() => set("categoryId", c.name)}
                    >
                      <Icon name={c.name} />
                      {c.name}
                    </button>
                  ))}
                </div>
                {field("title", "Complaint title")}
                <Select
                  label="Suggested urgency"
                  options={["Low", "Normal", "High"]}
                  value={d.priority}
                  onChange={(v) => set("priority", v)}
                />
              </>
            ) : step === 1 ? (
              <>
                <Select
                  label="District"
                  options={["Coimbatore"]}
                  value={d.district}
                  onChange={(v) => set("district", v)}
                />
                {field("city", "City or town")}
                <Select
                  label="Locality"
                  options={db.localities}
                  value={d.locality}
                  onChange={(v) => set("locality", v)}
                />
                {field("street", "Street name")}
                {field("landmark", "Landmark (optional)")}
                {field("pin", "PIN code (optional)")}
                <button
                  onClick={() =>
                    navigator.geolocation.getCurrentPosition(
                      (p) =>
                        D((current) => ({
                          ...current,
                          latitude: p.coords.latitude,
                          longitude: p.coords.longitude,
                        })),
                      () => M("Use the map or enter your street manually."),
                    )
                  }
                >
                  Use my location
                </button>
                <small>Click the map to select an optional location.</small>
                <MapView
                  point={
                    d.latitude !== null && d.longitude !== null
                      ? [d.latitude, d.longitude]
                      : undefined
                  }
                  onPick={(latitude, longitude) =>
                    D((current) => ({ ...current, latitude, longitude }))
                  }
                />
              </>
            ) : step === 2 ? (
              <>
                <label>
                  Detailed description
                  <textarea
                    maxLength={3000}
                    value={d.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                <small>{d.description.length}/3000</small>
                <Upload ids={d.mediaIds} change={(v) => set("mediaIds", v)} />
              </>
            ) : (
              <>
                <h3>{d.title}</h3>
                <p>{d.description}</p>
                <p>
                  {d.categoryId} · {d.priority} priority
                </p>
                <p>
                  {[d.street, d.landmark, d.locality, d.city, d.district, d.pin]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {d.latitude !== null && (
                  <p>
                    {d.latitude}, {d.longitude}
                  </p>
                )}
                <strong>Proposed department · {dept}</strong>
                <div className="gallery">
                  {d.mediaIds.map((id) => (
                    <Preview key={id} id={id} />
                  ))}
                </div>
              </>
            )}
            <div className="spread">
              <button
                onClick={() => {
                  localStorage.setItem(key, JSON.stringify(d));
                  M("Draft saved on this device.");
                }}
              >
                Save draft
              </button>
              <div className="row">
                {step > 0 && <button onClick={() => S(step - 1)}>Back</button>}
                <button className="primary" onClick={advance}>
                  {step === 3 ? "Submit complaint" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <p role="status">{msg}</p>
    </main>
  );
}
