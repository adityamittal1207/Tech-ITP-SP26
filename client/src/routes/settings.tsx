import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { MetricTerm } from "@/components/MetricTerm";
import { useImportCsv, type ImportSource, useUpdateSettings } from "@/hooks/use-studio-mutations";
import { useSettingsPage } from "@/hooks/use-studio-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link2, Plug, Mail, Phone, Sliders, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Tether" }] }),
  component: SettingsPage,
});

type ImportKind = "members" | "classes" | "bookings";

type ExportGuide = { name: string; steps: string[] };

type RetentionField = "newMemberDays" | "daysUntilAtRisk" | "daysUntilLapsed";

const RETENTION_LABELS: Record<RetentionField, string> = {
  newMemberDays: "New member window",
  daysUntilAtRisk: "Days until at-risk",
  daysUntilLapsed: "Days until lapsed",
};

function SettingsPage() {
  const { data, isLoading, isError, error } = useSettingsPage();
  const importCsv = useImportCsv();
  const updateSettings = useUpdateSettings();
  const [importResult, setImportResult] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<RetentionField | null>(null);
  const [draftDays, setDraftDays] = useState("");
  const fileRefs = {
    mindbody: {
      members: useRef<HTMLInputElement>(null),
      classes: useRef<HTMLInputElement>(null),
      bookings: useRef<HTMLInputElement>(null),
    },
    acuity: {
      members: useRef<HTMLInputElement>(null),
      classes: useRef<HTMLInputElement>(null),
      bookings: useRef<HTMLInputElement>(null),
    },
  };

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load settings"} />;

  const { studio, retention, integrations, lastImport, exportGuides, booking } = data;
  const [slugDraft, setSlugDraft] = useState(booking.slug);
  const [publicEnabled, setPublicEnabled] = useState(booking.publicBookingEnabled);

  const handleFile = (source: ImportSource, kind: ImportKind, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = String(reader.result ?? "");
      importCsv.mutate(
        { kind, csv, source },
        {
          onSuccess: (result) => {
            const msg = `Imported ${result.imported}, updated ${result.updated}${result.errors.length ? `, ${result.errors.length} errors` : ""}`;
            setImportResult(msg);
            toast.success(`${exportGuides[source]?.name ?? source} ${kind} import complete`);
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

  const importSources: { id: ImportSource; label: string }[] = [
    { id: "mindbody", label: "Mindbody" },
    { id: "acuity", label: "Acuity Scheduling" },
  ];

  const openAdjust = (field: RetentionField) => {
    setEditingField(field);
    setDraftDays(String(retention[field]));
  };

  const closeAdjust = () => {
    setEditingField(null);
    setDraftDays("");
  };

  const saveAdjust = () => {
    if (!editingField) return;
    const days = Number(draftDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error("Enter a whole number between 1 and 90");
      return;
    }
    if (editingField === "daysUntilAtRisk" && days >= retention.daysUntilLapsed) {
      toast.error("At-risk threshold must be less than the lapsed threshold");
      return;
    }
    if (editingField === "daysUntilLapsed" && days <= retention.daysUntilAtRisk) {
      toast.error("Lapsed threshold must be greater than the at-risk threshold");
      return;
    }

    updateSettings.mutate(
      { retention: { [editingField]: days } },
      {
        onSuccess: () => {
          toast.success("Retention threshold updated");
          closeAdjust();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Import data from Mindbody or Acuity via CSV, sender setup, and retention thresholds"
      />

      {lastImport && (
        <p className="text-xs text-muted-foreground -mt-4">
          Last import: {new Date(lastImport.ranAt).toLocaleString()} — {lastImport.summary.source ?? "native"}{" "}
          {lastImport.summary.kind}: {lastImport.summary.imported} new, {lastImport.summary.updated} updated
        </p>
      )}
      {importResult && <p className="text-sm text-success -mt-2">{importResult}</p>}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
        <SectionTitle
          title="Public booking link"
          subtitle="Members book classes without logging in — share this link on your site or social"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicEnabled}
            onChange={(e) => setPublicEnabled(e.target.checked)}
            className="rounded border-border"
          />
          Enable public booking
        </label>
        <div>
          <label className="text-xs font-medium text-muted-foreground">URL slug</label>
          <input
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            placeholder="tether-encinitas"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        {booking.bookingUrl && publicEnabled && slugDraft && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1">{booking.bookingUrl.replace(booking.slug, slugDraft)}</span>
            <button
              type="button"
              className="shrink-0 inline-flex items-center gap-1 text-primary font-medium"
              onClick={() => {
                const url = booking.bookingUrl!.replace(`/book/${booking.slug}`, `/book/${slugDraft}`);
                void navigator.clipboard.writeText(url);
                toast.success("Link copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        )}
        <Button
          type="button"
          disabled={updateSettings.isPending}
          onClick={() =>
            updateSettings.mutate(
              { bookingSlug: slugDraft, publicBookingEnabled: publicEnabled },
              {
                onSuccess: () => toast.success("Booking settings saved"),
                onError: (err) => toast.error(err.message),
              }
            )
          }
        >
          Save booking settings
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How it works</p>
        Export CSV files from Mindbody or Acuity, map them to our templates, then upload{" "}
        <strong>members → classes → bookings</strong> in that order. Download sample templates below any section.
      </div>

      {importSources.map(({ id, label }) => {
        const guide = exportGuides[id] as ExportGuide | undefined;
        const integration = integrations.find((i) => i.id === id);
        return (
          <div key={id} className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle
                title={`Import from ${label}`}
                subtitle={integration?.desc ?? `Upload CSV exports from ${label}`}
              />
              {integration?.connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                  <Check className="h-3 w-3" /> Data imported
                  {integration.lastSync && (
                    <span className="normal-case font-normal text-success/80"> · {integration.lastSync}</span>
                  )}
                </span>
              )}
            </div>

            {guide && (
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              {(["members", "classes", "bookings"] as ImportKind[]).map((kind) => (
                <div key={kind} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="font-medium capitalize">{kind}</div>
                  <input
                    ref={fileRefs[id][kind]}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => handleFile(id, kind, e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs[id][kind].current?.click()}
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
        );
      })}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Other services" subtitle="Status only" />
        <div className="grid sm:grid-cols-2 gap-3">
          {integrations
            .filter((i) => i.id === "twilio")
            .map((i) => (
              <div key={i.id} className="rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/40 flex items-center justify-center font-display font-bold text-primary">
                  {i.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{i.name}</div>
                    {i.connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        <Check className="h-3 w-3" /> OK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{i.desc}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle title="Sender setup" subtitle="SMS sender ID and reply-to email" />
        <div className="space-y-3">
          <Field icon={Phone} label="SMS sender" value={studio.smsSender} badge={studio.smsSender !== "Not configured" ? "Verified" : undefined} />
          <Field icon={Mail} label="Reply-to email" value={studio.replyToEmail} badge="Verified" />
          <Field icon={Mail} label="Studio" value={`${studio.name} · ${studio.city}`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <SectionTitle
          title={<MetricTerm metric="Retention thresholds" />}
          subtitle="Applied by hourly scoring job — hover each status to see how it's calculated"
        />
        <div className="grid md:grid-cols-3 gap-4">
          <Threshold
            label="New"
            metric="New"
            desc={`Joined within last ${retention.newMemberDays} days`}
            value={`${retention.newMemberDays} days`}
            onAdjust={() => openAdjust("newMemberDays")}
          />
          <Threshold
            label="At-Risk"
            metric="At-Risk"
            desc={`No booking in ${retention.daysUntilAtRisk + 1}–${retention.daysUntilLapsed} days`}
            value={`${retention.daysUntilAtRisk} days`}
            onAdjust={() => openAdjust("daysUntilAtRisk")}
          />
          <Threshold
            label="Lapsed"
            metric="Lapsed"
            desc={`No booking in ${retention.daysUntilLapsed}+ days`}
            value={`${retention.daysUntilLapsed} days`}
            onAdjust={() => openAdjust("daysUntilLapsed")}
          />
        </div>
      </div>

      <Dialog open={editingField !== null} onOpenChange={(open) => !open && closeAdjust()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust threshold</DialogTitle>
            <DialogDescription>
              {editingField ? RETENTION_LABELS[editingField] : ""} — applied by the hourly scoring job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="retention-days" className="text-sm font-medium">
              Days
            </label>
            <Input
              id="retention-days"
              type="number"
              min={1}
              max={90}
              value={draftDays}
              onChange={(e) => setDraftDays(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAdjust()}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAdjust}>
              Cancel
            </Button>
            <Button type="button" onClick={saveAdjust} disabled={updateSettings.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <Plug className="inline h-3 w-3 mr-1" /> No API keys required — export CSV from Mindbody or Acuity and upload here.
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

function Threshold({
  label,
  metric,
  desc,
  value,
  onAdjust,
}: {
  label: string;
  metric: string;
  desc: string;
  value: string;
  onAdjust: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-sm font-medium">
        <MetricTerm metric={metric}>{label}</MetricTerm>
      </div>
      <div className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">{desc}</div>
      <div className="flex items-center justify-between">
        <code className="text-xs bg-muted rounded px-2 py-1">{value}</code>
        <button type="button" onClick={onAdjust} className="text-xs text-primary font-medium hover:underline">
          Adjust
        </button>
      </div>
    </div>
  );
}
