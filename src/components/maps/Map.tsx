import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Complaint, names } from "../../services/data";
export default function MapView({
  items = [],
  point,
  onPick,
}: {
  items?: Complaint[];
  point?: [number, number];
  onPick?: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [error, E] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const m = L.map(ref.current, { scrollWheelZoom: false }).setView(
      point || [11.007, 76.968],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => E(true))
      .addTo(m);
    const coords: L.LatLngTuple[] = [];
    items.forEach((c) => {
      if (c.latitude === null || c.longitude === null) return;
      const xy: L.LatLngTuple = [c.latitude, c.longitude];
      coords.push(xy);
      const a = document.createElement("a");
      a.href = "/issues/" + c.id;
      a.textContent = c.title;
      L.circleMarker(xy, {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
        fillColor:
          [
            "#b55c20",
            "#287d53",
            "#26799e",
            "#406287",
            "#997116",
            "#a14c49",
            "#5d579a",
            "#546468",
          ][names.indexOf(c.categoryId)] || "#087f75",
      })
        .addTo(m)
        .bindPopup(a);
    });
    if (coords.length)
      m.fitBounds(L.latLngBounds(coords).pad(0.12), { maxZoom: 16, animate:false });
    if (point) L.circleMarker(point, { radius: 8 }).addTo(m);
    if (onPick) m.on("click", (e) => onPick(e.latlng.lat, e.latlng.lng));
    return () => {
      m.remove();
    };
  }, [
    JSON.stringify(items.map((c) => [c.id, c.title, c.latitude, c.longitude])),
    point?.join(","),
  ]);
  return (
    <>
      <div className="map" ref={ref} aria-label="Neighbourhood issue map" />
      {error && (
        <small>
          Map tiles are unavailable. Street and locality details are available
          in each report.
        </small>
      )}
    </>
  );
}
