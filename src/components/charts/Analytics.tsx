import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type Complaint } from "../../services/data";
export default function Analytics({ items }: { items: Complaint[] }) {
  return (
    <div className="stack">
      {[
        "Monthly complaint trends",
        "Category distribution",
        "Department performance",
      ].map((title, i) => {
        const data: Record<
          string,
          { name: string; Reported: number; Resolved: number }
        > = {};
        items.forEach((c) => {
          const key = [c.createdAt.slice(0, 7), c.categoryId, c.departmentId][
            i
          ];
          data[key] ??= { name: key, Reported: 0, Resolved: 0 };
          data[key].Reported++;
          if (["Resolved", "Closed"].includes(c.status)) data[key].Resolved++;
        });
        return (
          <section className="panel" key={title}>
            <h2>{title}</h2>
            <ResponsiveContainer width="100%" height={i ? 320 : 200}>
              <BarChart
                data={Object.values(data).sort((a, b) =>
                  a.name.localeCompare(b.name),
                )}
                layout={i ? "vertical" : "horizontal"}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type={i ? "number" : "category"}
                  dataKey={i ? undefined : "name"}
                  allowDecimals={false}
                />
                <YAxis
                  type={i ? "category" : "number"}
                  dataKey={i ? "name" : undefined}
                  width={i ? 130 : 35}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="Reported" fill="#16324f" />
                <Bar dataKey="Resolved" fill="#087f75" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        );
      })}
    </div>
  );
}
