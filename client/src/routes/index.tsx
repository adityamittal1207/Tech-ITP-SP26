import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Users2, AlertTriangle, Calendar, Bell,
  UserPlus, X as XIcon, MessageCircle, CheckCircle2,
} from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { MetricTerm } from "@/components/MetricTerm";
import { KPI_DELTA_METRIC } from "@/lib/metric-explanations";
import { useHomePage } from "@/hooks/use-studio-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tether — Daily View" },
      { name: "description", content: "Morning command center for boutique fitness studios." },
    ],
  }),
  component: Home,
});

const iconFor: Record<string, typeof Bell> = {
  booking: CheckCircle2,
  cancel: XIcon,
  signup: UserPlus,
  reply: MessageCircle,
};

const iconBg: Record<string, string> = {
  booking: "bg-success/15 text-success",
  cancel: "bg-destructive/15 text-destructive",
  signup: "bg-info/15 text-info",
  reply: "bg-primary/15 text-primary",
};

function fmt(value: number, unit: string) {
  if (unit === "$") return "$" + value.toLocaleString();
  if (unit === "%") return value + "%";
  return value.toLocaleString();
}

function Home() {
  const { data, isLoading, isError, error } = useHomePage();
  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load dashboard"} />;

  const {
    studio,
    kpis: KPIS,
    todayClasses: TODAY_CLASSES,
    todaySummary,
    actionItems: ACTION_ITEMS,
    activityFeed: ACTIVITY_FEED,
    visitsTrend: VISITS_TREND,
  } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good morning, ${studio.owner.split(" ")[0]} ☕`}
        subtitle={`Here's what's happening at ${studio.name} today.`}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPIS.map((k) => {
          const positive = k.invert ? k.delta < 0 : k.delta > 0;
          const Arrow = k.delta >= 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="text-xs text-muted-foreground">
                <MetricTerm metric={k.label} />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <div className="font-display text-2xl font-semibold">{fmt(k.value, k.unit)}</div>
              </div>
              <div className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                positive ? "text-success" : "text-destructive"
              )}>
                <Arrow className="h-3.5 w-3.5" />
                <MetricTerm metric={KPI_DELTA_METRIC[k.label] ?? "vs prior 30d"}>
                  {Math.abs(k.delta)}% vs prior 30d
                </MetricTerm>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visits trend */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle
          title={
            <>
              <MetricTerm metric="Visits" /> — last 30 days
            </>
          }
          subtitle={
            <>
              Class bookings vs{" "}
              <MetricTerm metric="No-shows" />
            </>
          }
        />
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={VISITS_TREND} margin={{ left: -16, top: 8, right: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="visits" stroke="var(--color-primary)" strokeWidth={2} fill="url(#vg)" />
              <Area type="monotone" dataKey="noShows" stroke="var(--color-destructive)" strokeWidth={1.5} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's classes */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title="Today's classes"
            subtitle={
              (todaySummary?.classCount ?? TODAY_CLASSES.length) > 0
                ? `${todaySummary?.classCount ?? TODAY_CLASSES.length} classes · ${todaySummary?.bookedSeats ?? TODAY_CLASSES.reduce((s, c) => s + c.booked, 0)} booked seats`
                : "No classes scheduled today"
            }
          />
          <div className="space-y-2">
            {TODAY_CLASSES.map((c) => {
              const pct = c.booked / c.capacity;
              const under = pct < 0.5;
              return (
                <Link
                  key={c.id}
                  to="/schedule"
                  search={{ classId: c.id, date: "today" }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-16 shrink-0">
                    <div className="text-sm font-semibold">{c.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{c.name}</div>
                      {under && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-warning-foreground bg-warning/30 rounded-full px-2 py-0.5">
                          <AlertTriangle className="h-3 w-3" />{" "}
                          <MetricTerm metric="Under-booked" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.instructor}</div>
                  </div>
                  <div className="w-40 hidden sm:block">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{c.booked}/{c.capacity}</span>
                      {c.waitlist > 0 && <span className="text-primary font-medium">+{c.waitlist} wait</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full", under ? "bg-warning" : "bg-primary")}
                        style={{ width: `${Math.min(100, pct * 100)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Action items */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Action items" subtitle="Today's priorities" />
          <div className="space-y-3">
            {ACTION_ITEMS.map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-2">
                  <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium leading-snug">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.subtitle}</div>
                    <Link
                      to={a.route}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {a.cta} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Live activity" subtitle="Bookings, replies, signups — last few hours" />
        <ul className="divide-y divide-border">
          {ACTIVITY_FEED.map((f) => {
            const Icon = iconFor[f.type] || Bell;
            return (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg[f.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm">{f.text}</div>
                <div className="text-xs text-muted-foreground">{f.time}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Glance card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/40 p-6 shadow-soft flex flex-wrap items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
          <Users2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-display font-semibold">Glance-ready on mobile</div>
          <div className="text-sm text-muted-foreground">Pull up this view between classes — all KPIs and today's flag at one tap.</div>
        </div>
        <Link to="/clients" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
          <Calendar className="h-4 w-4" /> Open at-risk list
        </Link>
      </div>
    </div>
  );
}
