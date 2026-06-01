import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { PageHeader } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { MetricTerm } from "@/components/MetricTerm";
import {
  STATUSES, statusColor, type Client, type ClientStatus,
} from "@/lib/mock-data";
import { useSendOutreach } from "@/hooks/use-studio-mutations";
import { useClientsPage } from "@/hooks/use-studio-data";
import { OutreachModal } from "@/components/OutreachModal";
import { cn } from "@/lib/utils";
import { Search, Send, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients & Retention — Tether" }] }),
  component: ClientsPage,
});

const CHANNEL_OPTS = ["All", "Instagram", "Groupon", "Referral", "Walk-in"];

function formatLastVisit(daysSinceLast: number) {
  if (daysSinceLast === 0) return "Today";
  if (daysSinceLast === 1) return "Yesterday";
  return `${daysSinceLast}d ago`;
}

function StatusChip({ s }: { s: ClientStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", statusColor[s])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
      {s}
    </span>
  );
}

function ClientsPage() {
  const { data, isLoading, isError, error } = useClientsPage();
  const sendOutreach = useSendOutreach();
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "All">("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [outreachTarget, setOutreachTarget] = useState<Client | null>(null);
  const CLIENTS = data?.clients ?? [];

  const atRisk = useMemo(
    () => CLIENTS.filter((c) => c.status === "At-Risk").sort((a, b) => b.ltv - a.ltv).slice(0, 10),
    [CLIENTS]
  );

  const filtered = useMemo(() => {
    return CLIENTS.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (channelFilter !== "All" && c.joinSource !== channelFilter) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).slice(0, 60);
  }, [CLIENTS, statusFilter, channelFilter, q]);

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load clients"} />;

  const COUNTS = data.counts as Record<ClientStatus, number>;
  const COHORTS = data.cohorts;
  const TEMPLATES = data.templates ?? [];

  const handleOutreachSend = ({
    type,
    body,
  }: {
    type: "atRisk" | "winback" | "welcome" | "milestone" | "reminder";
    body?: string;
  }) => {
    if (!outreachTarget) return;
    sendOutreach.mutate(
      { memberId: outreachTarget.id, type, body },
      {
        onSuccess: () => {
          toast.success(`Outreach sent to ${outreachTarget.name}`);
          setOutreachTarget(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients & Retention"
        subtitle={
          <>
            {CLIENTS.length} clients ·{" "}
            <MetricTerm metric="At-Risk">{COUNTS["At-Risk"]} flagged at-risk</MetricTerm> this week
          </>
        }
      />

      <CollapsibleSection title="Retention status" subtitle="Click a status to filter the directory">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
              className={cn(
                "rounded-2xl border bg-background p-4 text-left transition",
                statusFilter === s ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <StatusChip s={s} />
                <div className="font-display text-xl font-semibold">{COUNTS[s]}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {s === "At-Risk" ? (
                  <MetricTerm metric="Why at risk">Need outreach</MetricTerm>
                ) : s === "Win-back" ? (
                  <MetricTerm metric="Win-back">Recently re-engaged</MetricTerm>
                ) : s === "Lapsed" ? (
                  <MetricTerm metric="Lapsed">60+ days inactive</MetricTerm>
                ) : s === "New" ? (
                  <MetricTerm metric="New">Joined &lt; 30d</MetricTerm>
                ) : (
                  <MetricTerm metric="Regular">Active members</MetricTerm>
                )}
              </div>
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        defaultOpen
        title={
          <>
            <MetricTerm metric="At-Risk">At-risk</MetricTerm> — sorted by LTV
          </>
        }
        subtitle="One-click outreach, template auto-selected per signal"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Client</th>
                <th className="text-left font-medium py-2">
                  <MetricTerm metric="LTV" />
                </th>
                <th className="text-left font-medium py-2">
                  <MetricTerm metric="Why at risk" />
                </th>
                <th className="text-left font-medium py-2">Suggested template</th>
                <th className="text-right font-medium py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="py-3">
                    <button onClick={() => setSelected(c)} className="font-medium hover:text-primary text-left">
                      {c.name}
                    </button>
                    <div className="text-xs text-muted-foreground">{c.membership} · {c.favoriteInstructor}</div>
                  </td>
                  <td className="py-3 font-medium">${c.ltv.toLocaleString()}</td>
                  <td className="py-3 text-muted-foreground max-w-xs">{c.reason}</td>
                  <td className="py-3">
                    <span className="text-xs rounded-md bg-muted px-2 py-1">At-risk check-in</span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setOutreachTarget(c)}
                      disabled={sendOutreach.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        defaultOpen
        title="Client directory"
        subtitle="Search, filter, click for full profile"
        headerAside={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search clients…"
                className="bg-transparent outline-none w-48"
              />
            </div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              {CHANNEL_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Name</th>
                <th className="text-left font-medium py-2">Status</th>
                <th className="text-left font-medium py-2">Membership</th>
                <th className="text-left font-medium py-2">Source</th>
                <th className="text-left font-medium py-2">
                  <MetricTerm metric="90-day visits" />
                </th>
                <th className="text-left font-medium py-2">
                  <MetricTerm metric="Last visit" />
                </th>
                <th className="text-right font-medium py-2">
                  <MetricTerm metric="LTV" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/30">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5"><StatusChip s={c.status} /></td>
                  <td className="py-2.5 text-muted-foreground">{c.membership}</td>
                  <td className="py-2.5 text-muted-foreground">{c.joinSource}</td>
                  <td className="py-2.5">{c.visits90}</td>
                  <td className="py-2.5 text-muted-foreground">{formatLastVisit(c.daysSinceLast)}</td>
                  <td className="py-2.5 text-right font-medium">${c.ltv.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        defaultOpen={false}
        title={<MetricTerm metric="Cohort retention" />}
        subtitle={
          <>
            % of join cohort with an attended visit within{" "}
            <MetricTerm metric="30d">30d</MetricTerm> /{" "}
            <MetricTerm metric="90d">90d</MetricTerm> /{" "}
            <MetricTerm metric="180d">180d</MetricTerm> /{" "}
            <MetricTerm metric="365d">365d</MetricTerm> of signup
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-1">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-medium py-1 pr-3">Joined</th>
                <th className="text-left font-medium py-1 pr-3">Size</th>
                {["30d", "90d", "180d", "365d"].map((m) => (
                  <th key={m} className="text-center font-medium py-1 px-2">
                    <MetricTerm metric={m}>{m}</MetricTerm>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORTS.map((c) => (
                <tr key={c.label}>
                  <td className="py-1 pr-3 text-sm font-medium">{c.label}</td>
                  <td className="py-1 pr-3 text-muted-foreground">{c.size}</td>
                  {[c.d30, c.d90, c.d180, c.d365].map((v, i) => (
                    <td key={i} className="px-1">
                      {v == null ? (
                        <div className="h-10 rounded-md bg-muted/40" />
                      ) : (
                        <div
                          className="h-10 rounded-md flex items-center justify-center text-xs font-medium"
                          style={{
                            background: `color-mix(in oklch, var(--color-primary) ${v}%, var(--color-card))`,
                            color: v > 55 ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                          }}
                        >
                          {v}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Drawer */}
      {selected && (
        <ClientDrawer
          client={selected}
          onClose={() => setSelected(null)}
          onSend={() => setOutreachTarget(selected)}
          sending={sendOutreach.isPending}
        />
      )}

      <OutreachModal
        open={outreachTarget !== null}
        onOpenChange={(open) => !open && setOutreachTarget(null)}
        client={outreachTarget}
        templates={TEMPLATES}
        sending={sendOutreach.isPending}
        onSend={handleOutreachSend}
      />
    </div>
  );
}

function ClientDrawer({
  client,
  onClose,
  onSend,
  sending,
}: {
  client: Client;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const series = client.attendanceMonthly ?? [];
  const messages = client.recentMessages ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30" onClick={onClose} />
      <div className="w-full max-w-md h-full bg-background border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-5 flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-xl font-semibold">{client.name}</div>
            <div className="text-xs text-muted-foreground">{client.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip s={client.status} />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs">{client.membership}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs">Joined via {client.joinSource}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="LTV" metric="LTV" value={`$${client.ltv.toLocaleString()}`} />
            <Stat label="90-day visits" metric="90-day visits" value={String(client.visits90)} />
            <Stat label="Last visit" metric="Last visit" value={formatLastVisit(client.daysSinceLast)} />
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Attendance — last 12 months</div>
            <div className="flex items-end gap-1 h-24">
              {series.length === 0 && (
                <div className="text-xs text-muted-foreground">No attendance in the last 12 months.</div>
              )}
              {series.map((s) => (
                <div key={s.m} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${s.visits * 8}px` }}
                    title={`${s.visits} visits`}
                  />
                  <div className="text-[9px] text-muted-foreground">{s.m}</div>
                </div>
              ))}
            </div>
          </div>

          <Block label="Favorite instructor" value={client.favoriteInstructor} />
          <Block label="Tags" value={client.tags.length ? client.tags.join(" · ") : "—"} />
          <Block label="Staff notes" value={client.notes || "No notes yet."} />

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Message log</div>
            <div className="space-y-2 max-h-80 overflow-y-auto rounded-lg border border-border p-3">
              {messages.length > 0 ? (
                messages.map((m) => (
                  <Msg key={m.id} out={m.out} body={m.body} time={m.time} clientName={client.name} />
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  No messages yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onSend}
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send outreach
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, metric, value }: { label: string; metric: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        <MetricTerm metric={metric}>{label}</MetricTerm>
      </div>
      <div className="font-display text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
function Msg({ body, time, out, clientName }: { body: string; time: string; out?: boolean; clientName: string }) {
  const firstName = clientName.split(" ")[0];
  return (
    <div className={cn("flex flex-col gap-0.5", out ? "items-end" : "items-start")}>
      <div className={cn("text-[10px] text-muted-foreground px-1", out ? "text-right" : "text-left")}>
        {out ? "You" : firstName}
      </div>
      <div className={cn("flex w-full", out ? "justify-end" : "justify-start")}>
        <div className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          out ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
        )}>
          <div>{body}</div>
          <div className={cn("text-[10px] mt-1", out ? "text-primary-foreground/70" : "text-muted-foreground")}>{time}</div>
        </div>
      </div>
    </div>
  );
}
