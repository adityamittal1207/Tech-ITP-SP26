import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExplainTerm } from "@/components/ExplainTerm";
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

const SMS_TYPE_LABELS: Record<string, string> = {
  atRisk: "At-risk outreach",
  winback: "Win-back",
  welcome: "Welcome",
  reminder: "Reminder",
  milestone: "Milestone",
};

const HEALTH_STYLES: Record<string, { label: string; className: string }> = {
  strong: { label: "Strong", className: "text-success" },
  moderate: { label: "Moderate", className: "text-muted-foreground" },
  weak: { label: "Weak", className: "text-warning-foreground" },
  promising: { label: "Promising", className: "text-muted-foreground" },
};

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
    channelQuality: CHANNEL_QUALITY,
    smsConversion: SMS_CONVERSION,
  } = data as {
    days: string[];
    slots: string[];
    scheduleHeatmap: { day: string; cells: { slot: string; fill: number }[] }[];
    classTypes: { name: string; color: string }[];
    classTrend: { wk: string; attended: number; capacity: number; noShow: number }[];
    instructors: { id: string; name: string; specialty: string; fillRate: number; retention: number; uniqueClients: number; classes30d: number }[];
    revenueMix: { name: string; value: number }[];
    revpashTrend: { wk: string; revpash: number }[];
    channelQuality: { channel: string; channelKey: string; count: number; retentionRate: number; avgVisits90d: number; milestoneRate: number; health: string }[];
    smsConversion: {
      periodDays: number;
      conversionWindowDays: number;
      byType: { type: string; sent: number; converted: number; conversionRate: number; visitsRecovered: number }[];
      reminderImpact: {
        withReminder: { bookings: number; noShowRate: number };
        withoutReminder: { bookings: number; noShowRate: number };
      };
      totals: { sent: number; converted: number; visitsRecovered: number; conversionRate: number };
    };
  };

  const activeSelected = selectedClass || CLASS_TYPES[0]?.name || "";
  const totalRev = REVENUE_MIX.reduce((s, r) => s + r.value, 0);

  return (
      <div className="space-y-8">
        <PageHeader title="Class & Revenue Analytics" subtitle="Where seats fill, where revenue leaks, where it pays back" />

      {/* Schedule heatmap */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title={
              <>
                Schedule <ExplainTerm text="Fill rate is how full each class usually gets. 100 means every seat is taken, 50 means half the seats are filled.">fill rate</ExplainTerm>
              </>
            }
            subtitle="Day-of-week × time slot · last 30 days"
          />
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
            <SectionTitle
              title="Per-class trend"
              subtitle={
                <>
                  12-week attendance ·{" "}
                  <ExplainTerm text="No-show rate is the share of bookings where clients did not attend. Lower is better.">
                    no-show rate
                  </ExplainTerm>{" "}
                  · top regulars
                </>
              }
            />
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
                <div className="text-muted-foreground">
                  <ExplainTerm text="Average fill is how full this class usually gets across recent sessions. 82% means about 4 out of 5 seats are taken.">
                    Avg fill
                  </ExplainTerm>
                </div>
                <div className="font-display text-lg font-semibold">82%</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">
                  <ExplainTerm text="No-show rate is the share of booked clients who did not attend. Lower is better for planning and revenue.">
                    No-show
                  </ExplainTerm>
                </div>
                <div className="font-display text-lg font-semibold">6.4%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor scorecard */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title="Instructor scorecard"
            subtitle={
              <>
                <ExplainTerm text="Fill rate shows how full this instructor's classes are on average.">
                  Fill rate
                </ExplainTerm>{" "}
                ×{" "}
                <ExplainTerm text="We find clients who attended this instructor in the last 30 days, then check your booking history for any attended class within the next 30 days. No SMS link needed — it's based on attendance records.">
                  30-day return rate
                </ExplainTerm>
              </>
            }
          />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Instructor</th>
                <th className="text-left font-medium py-2">Specialty</th>
                <th className="text-left font-medium py-2">Classes 30d</th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="Fill rate shows how full this instructor's classes are on average.">
                    Fill rate
                  </ExplainTerm>
                </th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="We find clients who attended this instructor in the last 30 days, then check your booking history for any attended class within the next 30 days. No SMS link needed — it's based on attendance records.">
                    Return rate
                  </ExplainTerm>
                </th>
              </tr>
            </thead>
            <tbody>
              {INSTRUCTORS.map((i) => (
                <tr key={i.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">
                    <div className="font-medium">{i.name}</div>
                    {i.uniqueClients > 0 && (
                      <div className="text-[10px] text-muted-foreground">{i.uniqueClients} clients (30d)</div>
                    )}
                  </td>
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
            <SectionTitle
              title={
                <>
                  <ExplainTerm text="Revenue mix shows where your money came from this month, like memberships, packs, or drop-ins.">
                    Revenue mix
                  </ExplainTerm>{" "}
                  - this month
                </>
              }
              subtitle={`Total $${totalRev.toLocaleString()}`}
            />
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
            <SectionTitle
              title={
                <ExplainTerm text="RevPASH is revenue efficiency: how much money each available class seat earns per hour. Higher means your schedule is generating more revenue for the same capacity.">
                  RevPASH
                </ExplainTerm>
              }
              subtitle="Revenue per available seat-hour · unlimited revenue attributed to attended classes"
            />
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

      {/* Channel quality scorecard */}
        <div id="channel-quality" className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title="Channel quality scorecard"
            subtitle={
              <>
                Which acquisition channels bring clients who{" "}
                <ExplainTerm text="Retention rate is the share of clients from this channel who are still active (new or regular status), not at-risk or lapsed.">
                  stick around
                </ExplainTerm>
                {" "}· computed from member status and join source, no ad spend required
              </>
            }
          />
        <div className="h-56 mb-4">
          <ResponsiveContainer>
            <BarChart data={CHANNEL_QUALITY} margin={{ left: -8, top: 8, right: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="retentionRate" name="Retention %" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Channel</th>
                <th className="text-left font-medium py-2">Clients</th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="Pulled from each member's current status field, updated hourly from their booking history.">Retention</ExplainTerm>
                </th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="Counted from attended bookings in the first 90 days after join date, grouped by how the member originally signed up.">Avg visits (90d)</ExplainTerm>
                </th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="Share of members who reached your visit milestone (usually 4 attended classes) within 90 days of joining — from booking attendance records.">Milestone rate</ExplainTerm>
                </th>
                <th className="text-left font-medium py-2">
                  <ExplainTerm text="Compared to studio averages: Strong = above avg retention and visits. Weak = low retention with enough clients to trust the signal. Promising = fewer than 5 clients in that channel.">Health</ExplainTerm>
                </th>
              </tr>
            </thead>
            <tbody>
              {CHANNEL_QUALITY.map((c) => {
                const health = HEALTH_STYLES[c.health] ?? HEALTH_STYLES.moderate;
                return (
                  <tr key={c.channelKey} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-medium">{c.channel}</td>
                    <td className="py-3">{c.count}</td>
                    <td className="py-3">{c.retentionRate}%</td>
                    <td className="py-3">{c.avgVisits90d}</td>
                    <td className="py-3">{c.milestoneRate}%</td>
                    <td className={cn("py-3 text-xs font-medium", health.className)}>{health.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

      {/* SMS conversion */}
        <div id="sms-conversion" className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title="SMS conversion"
            subtitle={
              <>
                Last {SMS_CONVERSION.periodDays} days ·{" "}
                <ExplainTerm text="Every SMS is logged when sent. For outreach messages (at-risk, win-back, welcome), we check if that same client attended a class within 7 days after — no click or reply tracking, just timing against your booking records.">
                  how rebookings are tracked
                </ExplainTerm>
              </>
            }
          />
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">
                <ExplainTerm text="Counted from your message log — every SMS Tether sends in the last 30 days, recorded at send time (failed sends are excluded).">Messages sent</ExplainTerm>
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{SMS_CONVERSION.totals.sent}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">
                <ExplainTerm text="For each at-risk, win-back, or welcome SMS, we look up that client's attended bookings in the 7 days after it was sent. One attended visit = one rebooking. We don't know if the SMS caused it — only that the timing matches.">Clients rebooked</ExplainTerm>
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{SMS_CONVERSION.totals.converted}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <ExplainTerm text="Outreach messages that led to at least one attended visit within 7 days, divided by all messages sent in the period.">Conversion rate</ExplainTerm>: {SMS_CONVERSION.totals.conversionRate}%
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">
                <ExplainTerm text="Total attended class visits in the 7-day window after an outreach message. One client coming twice counts as two visits recovered.">Visits recovered</ExplainTerm>
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{SMS_CONVERSION.totals.visitsRecovered}</div>
            </div>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2">Message type</th>
                  <th className="text-left font-medium py-2">
                    <ExplainTerm text="Messages logged in the last 30 days for this template type.">Sent</ExplainTerm>
                  </th>
                  <th className="text-left font-medium py-2">
                    <ExplainTerm text="Messages where the recipient attended at least one class within 7 days after send (outreach types only).">Rebooked</ExplainTerm>
                  </th>
                  <th className="text-left font-medium py-2">
                    <ExplainTerm text="Rebooked messages divided by sent messages for this type.">Rate</ExplainTerm>
                  </th>
                  <th className="text-left font-medium py-2">
                    <ExplainTerm text="Attended visits in the 7-day post-send window for this message type.">Visits recovered</ExplainTerm>
                  </th>
                </tr>
              </thead>
              <tbody>
                {SMS_CONVERSION.byType.filter((r) => r.sent > 0).map((row) => (
                  <tr key={row.type} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-medium">{SMS_TYPE_LABELS[row.type] ?? row.type}</td>
                    <td className="py-3">{row.sent}</td>
                    <td className="py-3">{row.converted}</td>
                    <td className="py-3">{row.conversionRate}%</td>
                    <td className="py-3">{row.visitsRecovered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border p-4 text-sm">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              <ExplainTerm text="Tracked differently from outreach: we use the reminderSent flag on each booking (set when a class reminder goes out), not the message log. We compare no-show rates for reminded vs non-reminded bookings over the last 30 days.">Reminder impact</ExplainTerm>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="text-muted-foreground">
                  <ExplainTerm text="Bookings where reminderSent was true when the reminder SMS was triggered.">With reminder</ExplainTerm>:{" "}
                </span>
                <span className="font-medium">{SMS_CONVERSION.reminderImpact.withReminder.noShowRate}% no-show</span>
                <span className="text-xs text-muted-foreground ml-1">({SMS_CONVERSION.reminderImpact.withReminder.bookings} bookings)</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  <ExplainTerm text="Bookings with no reminder SMS sent before the class.">Without reminder</ExplainTerm>:{" "}
                </span>
                <span className="font-medium">{SMS_CONVERSION.reminderImpact.withoutReminder.noShowRate}% no-show</span>
                <span className="text-xs text-muted-foreground ml-1">({SMS_CONVERSION.reminderImpact.withoutReminder.bookings} bookings)</span>
              </div>
            </div>
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
