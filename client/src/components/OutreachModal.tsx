import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultTemplateKey,
  fillOutreachTemplate,
  toTemplateSendType,
  type OutreachTemplate,
} from "@/lib/outreach-templates";
import type { Client } from "@/lib/mock-data";
import { RotateCcw, Send } from "lucide-react";

type SendPayload = {
  type: ReturnType<typeof toTemplateSendType>;
  body?: string;
};

export function OutreachModal({
  open,
  onOpenChange,
  client,
  templates,
  sending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  templates: OutreachTemplate[];
  sending: boolean;
  onSend: (payload: SendPayload) => void;
}) {
  const [templateKey, setTemplateKey] = useState("");
  const [draftBody, setDraftBody] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !client) return;
    setTemplateKey(defaultTemplateKey(client));
    setDraftBody(null);
  }, [open, client?.id]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.key === templateKey) ?? templates[0],
    [templates, templateKey]
  );

  const templateBody =
    client && selectedTemplate ? fillOutreachTemplate(selectedTemplate.body, client) : "";
  const body = draftBody ?? templateBody;

  const resetDraft = () => setDraftBody(null);

  const handleSend = () => {
    if (!client || !selectedTemplate) return;
    const type = toTemplateSendType(selectedTemplate.key);
    const customized = body !== templateBody;
    onSend({ type, body: customized ? body : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg z-[60]">
        <DialogHeader>
          <DialogTitle>Send outreach</DialogTitle>
          <DialogDescription>
            {client ? `Customize the message for ${client.name} before sending.` : "Review and edit the message."}
          </DialogDescription>
        </DialogHeader>

        {client && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template</label>
              <select
                value={templateKey}
                onChange={(e) => {
                  setTemplateKey(e.target.value);
                  setDraftBody(null);
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Message</label>
                <button
                  type="button"
                  onClick={resetDraft}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to template
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setDraftBody(e.target.value)}
                className="w-full min-h-[140px] rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Merge tags:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{"{firstName}"}</code>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{"{favoriteInstructor}"}</code>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{"{lastClassDate}"}</code>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !client || !body.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
