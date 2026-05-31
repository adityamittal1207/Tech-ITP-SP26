import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { useAnalyticsPage } from "@/hooks/use-studio-data";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Class & Revenue Analytics — Tether" }] }),
  component: AnalyticsPage,
});

const PALETTE = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function AnalyticsPage() {
  const { data, isLoading, isError, error } = useAnalyticsPage();
  const [selectedClass, setSelectedClass] = useState("");

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load analytics"} />;

  const {
    days: DAYS,
    slots: SLOTS,
    scheduleHeatmap: SCHEDULE_HEATMAP,
    classTypes: CLASS_TYPES,
    classTrend: CLASS_TREND,
    instructors: INSTRUCTORS,
    revenueMix: REVENUE_MIX,
    revpashTrend: REVPASH_TREND,
    channelLtv: CHANNEL_LTV,
  } = data as {
    days: string[];
    slots: string[];
    scheduleHeatmap: { day: string; cells: { slot: string; fill: number }[] }[];
    classTypes: { name: string; color: string }[];
    classTrend: { wk: string; attended: number; capacity: number; noShow: number }[];
    instructors: { id: string; name: string; specialty: string; fillRate: number; retention: number; classes30d: number }[];
    revenueMix: { name: string; value: number }[];
    revpashTrend: { wk: string; revpash: number }[];
    channelLtv: { channel: string; cac: number; ltv: number; count: number }[];
  };

  const activeSelected = selectedClass || CLASS_TYPES[0]?.name || "";
  const totalRev = REVENUE_MIX.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Class & Revenue Analytics" subtitle="Where seats fill, where revenue leaks, where it pays back" />

      {/* Schedule heatmap */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Schedule fill rate" subtitle="Day-of-week × time slot · last 30 days" />
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 mx-auto">
            <thead>
              <tr>
                <th />
                {SLOTS.map((s) => <th key={s} className="text-[10px] font-medium text-muted-foreground px-1">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_HEATMAP.map((row) => (
                <tr key={row.day}>
                  <td className="text-xs font-medium text-muted-foreground pr-2">{row.day}</td>
                  {row.cells.map((cell) => (
                    <td key={cell.slot}>
                      <div
                        className="h-9 w-12 rounded-md flex items-center justify-center text-[10px] font-medium"
                        style={{
                          background: `color-mix(in oklch, var(--color-primary) ${Math.round(cell.fill * 100)}%, var(--color-card))`,
                          color: cell.fill > 0.55 ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                        }}
                      >
                        {Math.round(cell.fill * 100)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-center">
          <span>Low</span>
          <div className="h-2 w-32 rounded-full" style={{ background: "linear-gradient(to right, var(--color-card), var(--color-primary))" }} />
          <span>High</span>
        </div>
      </div>

      {/* Per-class trend */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
          <SectionTitle title="Per-class trend" subtitle="12-week attendance · no-show rate · top regulars" />
          <select
            value={activeSelected}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {CLASS_TYPES.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer>
              <LineChart data={CLASS_TREND} margin={{ left: -16, top: 8, right: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="wk" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="attended" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="capacity" stroke="var(--color-border)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="noShow" stroke="var(--color-destructive)" strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Top regulars · {activeSelected}</div>
            <div className="space-y-2">
              {["Ella Park", "Ruby Mendes", "Liam Holloway", "Iris Quintero", "Theo Marsh"].map((n, i) => (
                <div key={n} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                      {n.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <div className="text-sm">{n}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{12 - i} visits</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">Avg fill</div>
                <div className="font-display text-lg font-semibold">82%</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">No-show</div>
                <div className="font-display text-lg font-semibold">6.4%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor scorecard */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Instructor scorecard" subtitle="Fill rate × 30-day client retention" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Instructor</th>
                <th className="text-left font-medium py-2">Specialty</th>
                <th className="text-left font-medium py-2">Classes 30d</th>
                <th className="text-left font-medium py-2">Fill rate</th>
                <th className="text-left font-medium py-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              {INSTRUCTORS.map((i) => (
                <tr key={i.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{i.name}</td>
                  <td className="py-3 text-muted-foreground">{i.specialty}</td>
                  <td className="py-3">{i.classes30d}</td>
                  <td className="py-3">
                    <Bar2 value={i.fillRate} />
                  </td>
                  <td className="py-3">
                    <Bar2 value={i.retention} color="success" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue mix + RevPASH */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Revenue mix — this month" subtitle={`Total $${totalRev.toLocaleString()}`} />
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={REVENUE_MIX} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {REVENUE_MIX.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="RevPASH" subtitle="Revenue per available seat-hour · unlimited revenue attributed to attended classes" />
          <div className="flex items-baseline gap-3">
            <div className="font-display text-3xl font-semibold">$12.40</div>
            <div className="text-xs text-success font-medium">+8.2% vs prior</div>
          </div>
          <div className="h-44 mt-3">
            <ResponsiveContainer>
              <LineChart data={REVPASH_TREND} margin={{ left: -16, top: 8, right: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="wk" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="revpash" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LTV by channel */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="LTV by acquisition channel" subtitle="Does Groupon ever pay back? CAC vs realized LTV" />
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={CHANNEL_LTV} margin={{ left: -8, top: 8, right: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cac" name="CAC" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="ltv" name="Realized LTV" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {CHANNEL_LTV.map((c) => {
            const ratio = c.cac === 0 ? "∞" : (c.ltv / c.cac).toFixed(1) + "×";
            const healthy = c.ltv > c.cac * 5;
            return (
              <div key={c.channel} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{c.channel}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="font-display text-lg font-semibold">{ratio}</div>
                  <div className={cn("text-xs font-medium", healthy ? "text-success" : "text-warning-foreground")}>
                    {healthy ? "Healthy" : "Marginal"}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{c.count} clients</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Bar2({ value, color = "primary" }: { value: number; color?: "primary" | "success" }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 max-w-[180px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color === "primary" ? "bg-primary" : "bg-success")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs font-medium w-9 text-right">{pct}%</div>
    </div>
  );
}
