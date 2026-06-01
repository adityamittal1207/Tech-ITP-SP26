import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { useImportCsv } from "@/hooks/use-studio-mutations";
import { useSettingsPage } from "@/hooks/use-studio-data";
import { Check, Plug, Mail, Phone, Users, Sliders, Upload, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Tether" }] }),
  component: SettingsPage,
});

type ImportKind = "members" | "classes" | "bookings";

function SettingsPage() {
  const { data, isLoading, isError, error } = useSettingsPage();
  const importCsv = useImportCsv();
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRefs = {
    members: useRef<HTMLInputElement>(null),
    classes: useRef<HTMLInputElement>(null),
    bookings: useRef<HTMLInputElement>(null),
  };

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load settings"} />;

  const { studio, retention, integrations, lastImport } = data as {
    studio: { name: string; city: string; owner: string; smsSender: string; replyToEmail: string };
    retention: { newMemberDays: number; daysUntilAtRisk: number; daysUntilLapsed: number };
    integrations: { id: string; name: string; desc: string; connected: boolean; lastSync: string | null }[];
    lastImport: { ranAt: string; summary: { kind: string; imported: number; updated: number; errors: string[] } } | null;
  };

  const handleFile = (kind: ImportKind, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = String(reader.result ?? "");
      importCsv.mutate(
        { kind, csv },
        {
          onSuccess: (result) => {
            const msg = `Imported ${result.imported}, updated ${result.updated}${result.errors.length ? `, ${result.errors.length} errors` : ""}`;
            setImportResult(msg);
            toast.success(`${kind} import complete`);
            if (result.errors.length) toast.error(result.errors.slice(0, 3).join("; "));
          },
          onError: (err) => toast.error(err.message),
        }
      );
    };
    reader.readAsText(file);
  };

  const downloadTemplate = (kind: ImportKind) => {
    window.open(`/api/import/templates/${kind}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Integrations, CSV import, sender setup, and retention thresholds" />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Import data" subtitle="Upload CSV exports from your booking system" />
        {lastImport && (
          <p className="text-xs text-muted-foreground mb-4">
            Last import: {new Date(lastImport.ranAt).toLocaleString()} — {lastImport.summary.kind}:{" "}
            {lastImport.summary.imported} new, {lastImport.summary.updated} updated
          </p>
        )}
        {importResult && (
          <p className="text-sm text-success mb-4">{importResult}</p>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          {(["members", "classes", "bookings"] as ImportKind[]).map((kind) => (
            <div key={kind} className="rounded-xl border border-border p-4 space-y-3">
              <div className="font-medium capitalize">{kind}</div>
              <input
                ref={fileRefs[kind]}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(kind, e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRefs[kind].current?.click()}
                disabled={importCsv.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> Upload CSV
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate(kind)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" /> Sample template
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Integrations" subtitle="Connected services and sync status" />
        <div className="grid sm:grid-cols-2 gap-3">
          {integrations.map((i) => (
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
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Sender setup" subtitle="SMS sender ID and reply-to email" />
          <div className="space-y-3">
            <Field icon={Phone} label="SMS sender" value={studio.smsSender} badge={studio.smsSender !== "Not configured" ? "Verified" : undefined} />
            <Field icon={Mail} label="Reply-to email" value={studio.replyToEmail} badge="Verified" />
            <Field icon={Mail} label="Studio" value={`${studio.name} · ${studio.city}`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <SectionTitle title="Team & roles" subtitle="Who can send, who can only view" />
          <div className="space-y-2">
            {[
              { name: studio.owner, role: "Owner", access: "Full" },
              { name: "Lead instructor", role: "Instructor", access: "Comms · Schedule" },
              { name: "Front desk", role: "Staff", access: "Comms · CRM" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
                    {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                </div>
                <span className="text-xs rounded-md bg-muted px-2 py-1">{m.access}</span>
              </div>
            ))}
            <button type="button" className="w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/30 inline-flex items-center justify-center gap-2">
              <Users className="h-4 w-4" /> Invite teammate
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Retention thresholds" subtitle="Configured in businessConfig — applied by hourly scoring job" />
        <div className="grid md:grid-cols-3 gap-4">
          <Threshold label="New" desc={`Joined within last ${retention.newMemberDays} days`} value={`${retention.newMemberDays} days`} />
          <Threshold label="At-Risk" desc={`No booking in ${retention.daysUntilAtRisk + 1}–${retention.daysUntilLapsed} days`} value={`${retention.daysUntilAtRisk} days`} />
          <Threshold label="Lapsed" desc={`No booking in ${retention.daysUntilLapsed}+ days`} value={`${retention.daysUntilLapsed} days`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Per-class-type reminder timing" subtitle="Default reminder cadence" />
        <div className="space-y-2">
          {[
            { name: "Morning classes", first: "12h before", second: "1h before", note: "Early classes need earlier nudges" },
            { name: "Evening classes", first: "24h before", second: "2h before", note: "" },
            { name: "Weekend classes", first: "24h before", second: "2h before", note: "" },
          ].map((c) => (
            <div key={c.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="font-medium text-sm min-w-[140px]">{c.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">1st: {c.first}</span>
                <span className="rounded-md bg-muted px-2 py-1">2nd: {c.second}</span>
              </div>
              <div className="text-xs text-muted-foreground italic">{c.note}</div>
              <button type="button" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Sliders className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        <Plug className="inline h-3 w-3 mr-1" /> API sync (Mindbody, Acuity) coming soon — use CSV import for now
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
        <button type="button" className="text-xs text-primary font-medium hover:underline">Adjust</button>
      </div>
    </div>
  );
}
