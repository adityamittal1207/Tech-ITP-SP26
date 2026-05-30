import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { INTEGRATIONS } from "@/lib/mock-data";
import { Check, Plug, Mail, Phone, Users, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Studio Pulse" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Integrations, sender setup, team & retention thresholds" />

      {/* Integrations */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Integrations" subtitle="Booking systems · sync status · last fetch" />
        <div className="grid sm:grid-cols-2 gap-3">
          {INTEGRATIONS.map((i) => (
            <div key={i.id} className="rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/40 flex items-center justify-center font-display font-bold text-primary">
                {i.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{i.name}</div>
                  {i.connected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Not connected
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{i.desc}</div>
                {i.lastSync && <div className="text-xs text-muted-foreground mt-0.5">Last sync · {i.lastSync}</div>}
              </div>
              <button className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                i.connected ? "border border-border hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}>
                {i.connected ? "Manage" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sender setup */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Sender setup" subtitle="SMS sender ID and reply-to email" />
          <div className="space-y-3">
            <Field icon={Phone} label="SMS sender" value="TIDEWATER · +1 (760) 555-0142" badge="Verified" />
            <Field icon={Mail} label="Reply-to email" value="hi@tidewater.studio" badge="Verified" />
            <Field icon={Mail} label="Marketing footer" value="Tidewater Yoga + Surf · 132 N Coast Hwy 101, Encinitas CA" />
          </div>
        </div>

        {/* Team */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Team & roles" subtitle="Who can send, who can only view" />
          <div className="space-y-2">
            {[
              { name: "Maya Calderón", role: "Owner", access: "Full" },
              { name: "Jonah Reyes", role: "Lead instructor", access: "Comms · Schedule" },
              { name: "Priya Shah", role: "Instructor", access: "Schedule" },
              { name: "Asha Whitaker", role: "Front desk", access: "Comms · CRM" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
                    {m.name.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                </div>
                <span className="text-xs rounded-md bg-muted px-2 py-1">{m.access}</span>
              </div>
            ))}
            <button className="w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/30 inline-flex items-center justify-center gap-2">
              <Users className="h-4 w-4" /> Invite teammate
            </button>
          </div>
        </div>
      </div>

      {/* Retention thresholds */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Retention thresholds" subtitle="Tune what counts as At-Risk, Lapsed, Win-back" />
        <div className="grid md:grid-cols-3 gap-4">
          <Threshold label="At-Risk" desc="Frequency dropped 50%+ from 90-day baseline OR 14+ days since last visit" value="14 days · 50%" />
          <Threshold label="Lapsed" desc="No visits in 60+ days" value="60 days" />
          <Threshold label="Win-back" desc="Lapsed client booked after outreach (last 30d)" value="30-day window" />
        </div>
      </div>

      {/* Per-class reminder timing */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Per-class-type reminder timing" subtitle="Different cadence for surf vs. yin makes sense" />
        <div className="space-y-2">
          {[
            { name: "Sunrise Flow", first: "12h before", second: "1h before", note: "Early classes need earlier nudges" },
            { name: "Surf-Strength", first: "24h before", second: "2h before", note: "Surfers check the night before" },
            { name: "Yin & Restore", first: "24h before", second: "2h before", note: "" },
            { name: "Power Vinyasa", first: "24h before", second: "2h before", note: "" },
          ].map((c) => (
            <div key={c.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="font-medium text-sm min-w-[140px]">{c.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">1st: {c.first}</span>
                <span className="rounded-md bg-muted px-2 py-1">2nd: {c.second}</span>
              </div>
              <div className="text-xs text-muted-foreground italic">{c.note}</div>
              <button className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Sliders className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        <Plug className="inline h-3 w-3 mr-1" /> Prototype — integrations and settings are visual stubs
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, badge }: { icon: typeof Mail; label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
      {badge && (
        <span className="rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
}

function Threshold({ label, desc, value }: { label: string; desc: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">{desc}</div>
      <div className="flex items-center justify-between">
        <code className="text-xs bg-muted rounded px-2 py-1">{value}</code>
        <button className="text-xs text-primary font-medium hover:underline">Adjust</button>
      </div>
    </div>
  );
}
