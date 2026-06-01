import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageError, PageLoader } from "@/components/PageState";
import { formatStudioDateTime } from "@/lib/studioTimezone";
import { CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type CancelPreview = {
  bookingId: string;
  status: string;
  cancelled: boolean;
  memberName: string;
  className: string;
  instructor: string;
  timeLabel: string;
  bookedAt: string;
};

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/public${path}`, {
    headers: { "Content-Type": "application/json", ...((options.headers as Record<string, string>) ?? {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const Route = createFileRoute("/cancel/$token")({
  head: () => ({ meta: [{ title: "Cancel booking — Tether" }] }),
  component: CancelBookingPage,
});

function CancelBookingPage() {
  const { token } = Route.useParams();

  const preview = useQuery({
    queryKey: ["public", "cancel", token],
    queryFn: () => publicRequest<CancelPreview>(`/cancel/${encodeURIComponent(token)}`),
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      publicRequest<{ success: boolean; className?: string; timeLabel?: string }>(
        `/cancel/${encodeURIComponent(token)}`,
        { method: "POST" }
      ),
  });

  if (preview.isLoading) return <PageLoader label="Loading booking…" />;
  if (preview.isError || !preview.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <PageError message={preview.error?.message ?? "This cancel link is invalid or expired."} />
      </div>
    );
  }

  const data = preview.data;
  const done = data.cancelled || cancelMutation.isSuccess;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tether</p>
          <h1 className="font-display text-xl font-semibold mt-1">
            {done ? "Booking cancelled" : "Cancel your booking"}
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
          <div className="font-medium">{data.className}</div>
          <div className="text-sm text-muted-foreground">
            {formatStudioDateTime(data.bookedAt)}
            {data.timeLabel ? ` · ${data.timeLabel}` : ""}
          </div>
          {data.instructor && (
            <div className="text-sm text-muted-foreground">with {data.instructor}</div>
          )}
        </div>

        {done ? (
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <p>
              {cancelMutation.isSuccess
                ? `You're no longer signed up for ${cancelMutation.data?.className ?? data.className}.`
                : "This booking was already cancelled."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Hi {data.memberName}, tap below to cancel your spot. This cannot be undone.
            </p>
            {cancelMutation.isError && (
              <p className="text-sm text-destructive">{cancelMutation.error.message}</p>
            )}
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="w-full rounded-lg bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel my booking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
