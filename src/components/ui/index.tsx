import { useEffect, useState } from "react";
import {
  Construction,
  Trash2,
  Droplets,
  Waves,
  LampCeiling,
  Zap,
  CloudRain,
  Landmark,
  MapPin,
  ChevronRight,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { names, date, media, uid, type Complaint } from "../../services/data";
export const icons = [
  Construction,
  Trash2,
  Droplets,
  Waves,
  LampCeiling,
  Zap,
  CloudRain,
  Landmark,
];
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const I = icons[names.indexOf(name)] || Landmark;
  return <I size={size} />;
}
export function Badge({ s }: { s: string }) {
  return <span className={"badge " + s.replaceAll(" ", "-")}>{s}</span>;
}
export function Card({ c }: { c: Complaint }) {
  return (
    <article className="card">
      {c.mediaIds[0] && (
        <div className="gallery">
          <Preview id={c.mediaIds[0]} />
        </div>
      )}
      <div className="spread">
        <span className="icon">
          <Icon name={c.categoryId} />
        </span>
        <Badge s={c.status} />
      </div>
      <small>{c.categoryId}</small>
      <h3>
        <Link to={"/issues/" + c.id}>{c.title}</Link>
      </h3>
      <p>
        <MapPin size={15} /> {c.locality} · {date(c.createdAt)}
      </p>
      <div className="spread cardfoot">
        <small>
          <Users size={14} /> {c.confirmations.length} confirmations
        </small>
        <Link aria-label={"View details of " + c.title} to={"/issues/" + c.id}>
          <ChevronRight size={20} />
        </Link>
      </div>
    </article>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (s: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
export function Preview({ id }: { id: string }) {
  const [src, S] = useState(""),
    [video, V] = useState(false);
  useEffect(() => {
    let url = "",
      live = true;
    media(id)
      .then((f) => {
        if (live && f) {
          url = URL.createObjectURL(f);
          S(url);
          V(f.type.startsWith("video"));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [id]);
  return src ? (
    video ? (
      <video controls src={src} />
    ) : (
      <img loading="lazy" alt="Submitted civic issue evidence" src={src} />
    )
  ) : (
    <small>Loading evidence…</small>
  );
}
export function Upload({
  ids,
  change,
}: {
  ids: string[];
  change: (v: string[]) => void;
}) {
  const [error, E] = useState("");
  async function add(files: File[]) {
    try {
      if (
        files.some(
          (f) =>
            ![
              "image/jpeg",
              "image/png",
              "image/webp",
              "video/mp4",
              "video/webm",
            ].includes(f.type) || f.size > 25 * 1024 * 1024,
        )
      )
        throw Error(
          "Choose JPEG, PNG, WebP, MP4 or WebM files up to 25 MB each.",
        );
      const keys = await Promise.all(
        files.map(async (f) => {
          const id = uid();
          await media(id, f);
          return id;
        }),
      );
      change([...ids, ...keys]);
      E("");
    } catch (e) {
      E(String(e));
    }
  }
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void add([...e.dataTransfer.files]);
      }}
    >
      <label className="drop">
        Drop evidence here or choose files
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={(e) => void add([...(e.target.files || [])])}
        />
      </label>
      <span role="alert">{error}</span>
      <div className="gallery">
        {ids.map((id) => (
          <div key={id}>
            <Preview id={id} />
            <button
              type="button"
              onClick={() => change(ids.filter((i) => i !== id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
