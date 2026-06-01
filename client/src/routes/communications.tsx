import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MetricTerm } from "@/components/MetricTerm";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { useSendOutreach, useUpdateSettings } from "@/hooks/use-studio-mutations";
import { useCommunicationsPage } from "@/hooks/use-studio-data";
import {
  fillOutreachTemplate,
  toTemplateSendType,
} from "@/lib/outreach-templates";
import { cn } from "@/lib/utils";
import { Send, MessageSquare, Bell, RotateCcw, Check, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/communications")({
  head: () => ({ meta: [{ title: "Communications — Tether" }] }),
  component: CommsPage,
});

type TemplateItem = {
  id: string;
  key: string;
  name: string;
  category: string;
  body: string;
};

type MessageLogItem = {
  id: string;
  client: string;
  template: string;
  type: string;
  sent: string;
  status: string;
  body: string;
};

type QueueItem = {
  id: string;
  memberId: string;
  client: import("@/lib/mock-data").Client;
  template: { id: string; key: string; name: string; body: string };
};

const MERGE_TAGS = ["{firstName}", "{className}", "{classTime}", "{visitCount}"];
const BOOKING_MERGE_TAGS = ["{firstName}", "{className}", "{classTime}", "{cancelLink}"];

const BOOKING_CANCEL_TEMPLATE_KEYS = new Set(["reminder", "waitlistPromoted", "waitlistJoined"]);

function mergeTagsForTemplate(key: string) {
  if (BOOKING_CANCEL_TEMPLATE_KEYS.has(key)) return BOOKING_MERGE_TAGS;
  if (key === "milestone") return [...MERGE_TAGS, "{visitCount}"];
  return MERGE_TAGS;
}

function CommsPage() {
  const [tab, setTab] = useState<"reminders" | "outreach">("reminders");
  const { data, isLoading, isError, error } = useCommunicationsPage();

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load communications"} />;

  const {
    reminderRules: REMINDER_RULES,
    reminderExamples: REMINDER_EXAMPLES,
    templates: TEMPLATES,
    sendQueue: SEND_QUEUE,
    messageLog: MESSAGE_LOG,
    smsSummary: SMS_SUMMARY,
  } = data as {
    reminderRules: { id: string; name: string; trigger: string; enabled: boolean; replies: string }[];
    reminderExamples: { id: string; body: string }[];
    templates: TemplateItem[];
    sendQueue: QueueItem[];
    messageLog: MessageLogItem[];
    smsSummary: {
      periodDays: number;
      conversionWindowDays: number;
      sent: number;
      converted: number;
      visitsRecovered: number;
      conversionRate: number;
    };
  };

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

      {SMS_SUMMARY.sent > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
          <p className="text-sm text-muted-foreground">
            Last {SMS_SUMMARY.periodDays} days:{" "}
            <MetricTerm metric="Messages sent">
              <span className="font-medium text-foreground">{SMS_SUMMARY.sent} messages sent</span>
            </MetricTerm>
            {" → "}
            <MetricTerm metric="Clients rebooked">
              <span className="font-medium text-foreground">{SMS_SUMMARY.converted} rebooked ({SMS_SUMMARY.conversionRate}%)</span>
            </MetricTerm>
            {" · "}
            <MetricTerm metric="Visits recovered">
              <span className="font-medium text-foreground">{SMS_SUMMARY.visitsRecovered} visits recovered</span>
            </MetricTerm>
          </p>
          <Link
            to="/analytics"
            hash="sms-conversion"
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            View full breakdown →
          </Link>
        </div>
      )}

      {tab === "reminders" ? (
        <Reminders rules={REMINDER_RULES} examples={REMINDER_EXAMPLES} />
      ) : (
        <Outreach sendQueue={SEND_QUEUE} templates={TEMPLATES} />
      )}

      <TemplateLibrary templates={TEMPLATES} />

      <MessageLog entries={MESSAGE_LOG} />
    </div>
  );
}

function Reminders({
  rules,
  examples,
}: {
  rules: { id: string; name: string; trigger: string; enabled: boolean; replies: string }[];
  examples: { id: string; body: string }[];
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Reminder rules" subtitle="Configured in business settings · sent via Twilio" />
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.trigger} · {r.replies}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-success font-medium">{r.enabled ? "Active" : "Off"}</span>
                <div className={cn("h-6 w-11 rounded-full relative", r.enabled ? "bg-primary" : "bg-muted")}>
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow",
                    r.enabled ? "right-0.5" : "left-0.5"
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Example messages" subtitle="From your SMS templates" />
        <div className="space-y-3">
          {examples.map((e) => (
            <div key={e.id} className="rounded-2xl bg-primary text-primary-foreground rounded-bl-sm p-3 text-sm">
              {e.body}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Outreach({
  sendQueue,
  templates,
}: {
  sendQueue: QueueItem[];
  templates: TemplateItem[];
}) {
  const sendOutreach = useSendOutreach();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [active, setActive] = useState(sendQueue[0]?.id ?? null);
  const [draftBodies, setDraftBodies] = useState<Record<string, string>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});

  const visibleQueue = useMemo(
    () => sendQueue.filter((q) => !skipped.includes(q.id)),
    [sendQueue, skipped]
  );

  const current = visibleQueue.find((q) => q.id === active) ?? visibleQueue[0];
  const selectedTemplate = current
    ? templates.find((t) => t.key === (selectedTemplates[current.id] ?? current.template.key))
    : null;
  const templateBody = current && selectedTemplate ? fillOutreachTemplate(selectedTemplate.body, current.client) : "";
  const body = current ? (draftBodies[current.id] ?? templateBody) : "";

  const resetDraft = () => {
    if (!current) return;
    setDraftBodies((d) => {
      const next = { ...d };
      delete next[current.id];
      return next;
    });
  };

  const advance = () => {
    const idx = visibleQueue.findIndex((q) => q.id === current?.id);
    const next = visibleQueue[idx + 1];
    setActive(next?.id ?? null);
  };

  const handleSend = () => {
    if (!current) return;
    const type = toTemplateSendType(selectedTemplate?.key ?? current.template.key);
    const customized = body !== templateBody;
    sendOutreach.mutate(
      { memberId: current.memberId, type, body: customized ? body : undefined },
      {
        onSuccess: () => {
          toast.success(`Sent to ${current.client.name}`);
          advance();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleSkip = () => {
    if (!current) return;
    setSkipped((s) => [...s, current.id]);
    advance();
  };

  if (visibleQueue.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Outreach queue is empty — no at-risk or lapsed clients need attention right now.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Send queue" subtitle={`${visibleQueue.length} clients · review, edit, send`} />
          <div className="space-y-1.5">
            {visibleQueue.map((q) => (
              <button
                key={q.id}
                onClick={() => setActive(q.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition",
                  current?.id === q.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
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

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle
            title={`To: ${current?.client.name ?? "—"}`}
            subtitle={`Template: ${selectedTemplate?.name ?? current?.template.name ?? "—"}`}
            action={
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to template
              </button>
            }
          />
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Template used</label>
            <select
              value={current ? (selectedTemplates[current.id] ?? current.template.key) : ""}
              onChange={(e) => {
                if (!current) return;
                const nextKey = e.target.value;
                setSelectedTemplates((s) => ({ ...s, [current.id]: nextKey }));
                setDraftBodies((d) => {
                  const next = { ...d };
                  delete next[current.id];
                  return next;
                });
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>
          <textarea
            key={current?.id}
            value={body}
            onChange={(e) => current && setDraftBodies((d) => ({ ...d, [current.id]: e.target.value }))}
            className="w-full min-h-[160px] rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              Merge tags:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{"{firstName}"}</code>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{"{favoriteInstructor}"}</code>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{"{lastClassDate}"}</code>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sendOutreach.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send & next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateLibrary({ templates }: { templates: TemplateItem[] }) {
  const updateSettings = useUpdateSettings();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (t: TemplateItem) => {
    setEditingKey(t.key);
    setDraft(t.body);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft("");
  };

  const saveEdit = (key: string) => {
    updateSettings.mutate(
      { smsTemplates: { [key]: draft } },
      {
        onSuccess: () => {
          toast.success("Template saved");
          cancelEdit();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <SectionTitle title="SMS template library" subtitle="Edit templates used for reminders and outreach" />
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.category}</div>
              </div>
              {editingKey !== t.key ? (
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(t.key)}
                    disabled={updateSettings.isPending || !draft.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              )}
            </div>
            {editingKey === t.key ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tags: {mergeTagsForTemplate(t.key).map((tag) => (
                    <code key={tag} className="bg-muted px-1 py-0.5 rounded mr-1">{tag}</code>
                  ))}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageLog({ entries }: { entries: MessageLogItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <SectionTitle title="Message log" subtitle="Every SMS sent from the platform" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Client</th>
              <th className="text-left font-medium py-2">Type</th>
              <th className="text-left font-medium py-2">Sent</th>
              <th className="text-left font-medium py-2">Status</th>
              <th className="text-left font-medium py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No messages sent yet. Use the outreach queue or send a test from Settings.
                </td>
              </tr>
            ) : (
              entries.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium whitespace-nowrap">{m.client}</td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">{m.template}</td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">{m.sent}</td>
                  <td className="py-3 whitespace-nowrap">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="py-3 text-muted-foreground max-w-md truncate" title={m.body}>
                    {m.body}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const sent = status === "sent" || status === "delivered";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        sent ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      )}
    >
      {sent && <Check className="h-3 w-3" />}
      {status}
    </span>
  );
}
