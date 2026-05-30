import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import {
  REMINDER_RULES, REMINDER_EXAMPLES, TEMPLATES, SEND_QUEUE, MESSAGE_LOG,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Send, MessageSquare, Bell, RotateCcw, Check } from "lucide-react";

export const Route = createFileRoute("/communications")({
  head: () => ({ meta: [{ title: "Communications — Studio Pulse" }] }),
  component: CommsPage,
});

function CommsPage() {
  const [tab, setTab] = useState<"reminders" | "outreach">("reminders");

  return (
    <div className="space-y-6">
      <PageHeader title="Communications" subtitle="Every reminder, every reply, every booking that followed — in one place" />

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        {[
          { id: "reminders", label: "Scheduled reminders", icon: Bell },
          { id: "outreach", label: "Retention outreach", icon: MessageSquare },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "reminders" | "outreach")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "reminders" ? <Reminders /> : <Outreach />}

      {/* Unified message log */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Unified message log" subtitle="Every send, every reply, the booking that followed — your ROI proof" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Client</th>
                <th className="text-left font-medium py-2">Template</th>
                <th className="text-left font-medium py-2">Sent</th>
                <th className="text-left font-medium py-2">Reply</th>
                <th className="text-left font-medium py-2">Booking that followed</th>
                <th className="text-right font-medium py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {MESSAGE_LOG.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{m.client}</td>
                  <td className="py-3 text-muted-foreground">{m.template}</td>
                  <td className="py-3 text-muted-foreground">{m.sent}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-success/15 text-success px-2 py-0.5 text-xs font-medium">
                      <Check className="h-3 w-3" /> {m.reply}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{m.booked}</td>
                  <td className="py-3 text-right font-medium">{m.revenue ? `$${m.revenue}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Reminders() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Reminder rules" subtitle="Two-way SMS · waitlist promotions · no-show follow-up" />
        <div className="space-y-3">
          {REMINDER_RULES.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.trigger} · {r.replies}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-success font-medium">Active</span>
                <div className="h-6 w-11 rounded-full bg-primary relative">
                  <div className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm bg-muted/30">
          <div className="font-medium mb-1">Sync with booking system</div>
          <div className="text-xs text-muted-foreground">When a client replies “C” to cancel, the seat is released in Mindbody within 6 seconds and the waitlist promotion fires automatically.</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Example messages" subtitle="In Tidewater's voice" />
        <div className="space-y-3">
          {REMINDER_EXAMPLES.map((e) => (
            <div key={e.id} className="rounded-2xl bg-primary text-primary-foreground rounded-bl-sm p-3 text-sm">
              {e.body}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Outreach() {
  const [active, setActive] = useState(SEND_QUEUE[0]?.id ?? null);
  const current = SEND_QUEUE.find((q) => q.id === active) ?? SEND_QUEUE[0];
  const body = current?.template.body
    .replace("{first_name}", current.client.name.split(" ")[0])
    .replace("{favorite_instructor}", current.client.favoriteInstructor)
    .replace("{last_class_date}", `${current.client.daysSinceLast} days ago`);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Send queue */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Send queue" subtitle="Pre-filled this morning · review, edit, send" />
          <div className="space-y-1.5">
            {SEND_QUEUE.map((q) => (
              <button
                key={q.id}
                onClick={() => setActive(q.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition",
                  active === q.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{q.client.name}</div>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{q.client.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{q.template.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title={`To: ${current?.client.name ?? "—"}`}
            subtitle={`Template: ${current?.template.name}`}
            action={
              <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset to template
              </button>
            }
          />
          <textarea
            key={current?.id}
            defaultValue={body}
            className="w-full min-h-[160px] rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              Merge tags available: <code className="bg-muted px-1.5 py-0.5 rounded">{"{first_name}"}</code>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{"{favorite_instructor}"}</code>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{"{last_class_date}"}</code>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Skip</button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
                <Send className="h-4 w-4" /> Send & next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template library / performance */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Template performance" subtitle="Reply rate · booking rate · revenue attributed" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Template</th>
                <th className="text-left font-medium py-2">Category</th>
                <th className="text-left font-medium py-2">Reply rate</th>
                <th className="text-left font-medium py-2">Booking rate</th>
                <th className="text-right font-medium py-2">Revenue (90d)</th>
              </tr>
            </thead>
            <tbody>
              {TEMPLATES.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{t.name}</td>
                  <td className="py-3 text-muted-foreground">{t.category}</td>
                  <td className="py-3">{Math.round(t.replyRate * 100)}%</td>
                  <td className="py-3">{Math.round(t.bookingRate * 100)}%</td>
                  <td className="py-3 text-right font-medium">${t.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
