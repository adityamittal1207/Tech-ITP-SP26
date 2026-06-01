import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageError, PageLoader } from "@/components/PageState";
import type { ScheduleDay, ScheduleOccurrence } from "@/hooks/use-schedule";
import { cn } from "@/lib/utils";
import { addDaysToDateKey, formatStudioDateTime, localDateKey } from "@/lib/studioTimezone";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type Step = "identify" | "browse" | "review" | "done";

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

function addDays(dateKey: string, days: number) {
  return addDaysToDateKey(dateKey, days);
}

function statusLabel(status: string) {
  if (status === "booked") return "Signed up";
  if (status === "waitlisted") return "Waitlisted";
  return status;
}

export const Route = createFileRoute("/book/$slug")({
  head: ({ params }) => ({ meta: [{ title: `Book — ${params.slug}` }] }),
  component: PublicBookPage,
});

function PublicBookPage() {
  const { slug } = Route.useParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<Step>("identify");
  const [selected, setSelected] = useState<(ScheduleOccurrence & { dayLabel: string }) | null>(null);
  const [lastResult, setLastResult] = useState<"booked" | "waitlisted">("booked");

  const studioQuery = useQuery({
    queryKey: ["public", slug, "studio"],
    queryFn: () =>
      publicRequest<{ name: string; city?: string; publicBookingEnabled: boolean }>(
        `/studios/${slug}`
      ),
  });

  const scheduleQuery = useQuery({
    queryKey: ["public", slug, "schedule", weekStart],
    enabled: step !== "identify" && studioQuery.isSuccess,
    queryFn: () => {
      const q = weekStart ? `?week=${weekStart}` : "";
      return publicRequest<{ weekStart: string; days: ScheduleDay[] }>(
        `/studios/${slug}/schedule${q}`
      );
    },
  });

  const phoneReady = phone.replace(/\D/g, "").length >= 10;

  const myBookingsQuery = useQuery({
    queryKey: ["public", slug, "bookings", phone],
    enabled: phoneReady && step !== "identify",
    queryFn: () =>
      publicRequest<{
        bookings: {
          id: string;
          status: string;
          bookedAt: string;
          className: string;
          instructor: string;
          time: string;
        }[];
      }>(`/studios/${slug}/bookings?phone=${encodeURIComponent(phone)}`),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      publicRequest<{ waitlisted: boolean }>(`/studios/${slug}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          classId: selected!.classId,
          date: selected!.date,
        }),
      }),
    onSuccess: (data) => {
      setLastResult(data.waitlisted ? "waitlisted" : "booked");
      setStep("done");
      scheduleQuery.refetch();
      myBookingsQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      publicRequest(`/studios/${slug}/bookings/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      myBookingsQuery.refetch();
      scheduleQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openSlots = useMemo(() => {
    const days = scheduleQuery.data?.days ?? [];
    return days.flatMap((day) =>
      day.occurrences.map((o) => ({ ...o, dayLabel: day.label }))
    );
  }, [scheduleQuery.data]);

  if (studioQuery.isLoading) return <PageLoader label="Loading studio…" />;
  if (studioQuery.isError) {
    return <PageError message={studioQuery.error.message} />;
  }

  const studio = studioQuery.data!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="font-display text-2xl font-semibold">{studio.name}</h1>
          {studio.city && <p className="text-sm text-muted-foreground mt-1">{studio.city}</p>}
          <p className="text-sm text-muted-foreground mt-2">Sign up for a class — payment at the studio</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {step === "identify" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="font-medium">Your details</h2>
            <p className="text-xs text-muted-foreground">Name and mobile number only.</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile phone"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!name.trim() || !phoneReady}
              onClick={() => setStep("browse")}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === "browse" && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{name}</span>
              <span className="text-muted-foreground truncate">{phone}</span>
              <button type="button" className="text-primary text-xs shrink-0" onClick={() => setStep("identify")}>
                Edit
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Classes this week</h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded border border-border"
                    onClick={() =>
                      setWeekStart(
                        addDays(scheduleQuery.data?.weekStart ?? localDateKey(), -7)
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded border border-border"
                    onClick={() =>
                      setWeekStart(
                        addDays(scheduleQuery.data?.weekStart ?? localDateKey(), 7)
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {scheduleQuery.isLoading ? (
                <PageLoader />
              ) : (
                <div className="space-y-2">
                  {openSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No classes this week.</p>
                  ) : (
                    openSlots.map((occ) => (
                      <button
                        key={`${occ.classId}-${occ.date}`}
                        type="button"
                        onClick={() => {
                          setSelected(occ);
                          setStep("review");
                        }}
                        className="w-full rounded-xl border border-border p-3 text-left hover:bg-muted/40 transition-colors"
                      >
                        <div className="font-medium text-sm">{occ.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {occ.dayLabel} · {occ.timeLabel} · {occ.instructor}
                        </div>
                        <div className="text-xs mt-1 text-primary">
                          {occ.spotsLeft > 0 ? `${occ.spotsLeft} spots left` : "May join waitlist if full"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <MyBookingsSection
              query={myBookingsQuery}
              onCancel={(id) => cancelMutation.mutate(id)}
              cancelPending={cancelMutation.isPending}
            />
          </>
        )}

        {step === "review" && selected && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <button type="button" className="text-xs text-primary" onClick={() => setStep("browse")}>
              ← Back to classes
            </button>
            <h2 className="font-medium">Review signup</h2>
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="font-medium">{selected.name}</div>
              <div className="text-muted-foreground">
                {selected.dayLabel} · {selected.timeLabel} · {selected.instructor}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Payment is collected at the studio. If the class is full, you&apos;ll be added to the waitlist.
            </p>
            <button
              type="button"
              disabled={bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Sign up
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-soft text-center">
            <h2 className="font-medium text-lg">
              {lastResult === "waitlisted" ? "You're on the waitlist" : "You're signed up!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lastResult === "waitlisted"
                ? "We'll text you if a spot opens up."
                : "See you in class. Payment is due at the studio."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setStep("browse");
              }}
              className="w-full rounded-lg border border-border py-2.5 text-sm font-medium"
            >
              Sign up for another class
            </button>
            <MyBookingsSection
              query={myBookingsQuery}
              onCancel={(id) => cancelMutation.mutate(id)}
              cancelPending={cancelMutation.isPending}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function MyBookingsSection({
  query,
  onCancel,
  cancelPending,
}: {
  query: { isLoading: boolean; data?: { bookings: { id: string; status: string; bookedAt: string; className: string }[] } };
  onCancel: (id: string) => void;
  cancelPending: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-medium mb-3">My upcoming classes</h2>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (query.data?.bookings.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming signups.</p>
      ) : (
        <div className="space-y-2">
          {query.data!.bookings.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm",
                b.status === "waitlisted" && "border-amber-500/40 bg-amber-500/5"
              )}
            >
              <div>
                <div className="font-medium">{b.className}</div>
                <div className="text-xs text-muted-foreground">
                  {statusLabel(b.status)} · {formatStudioDateTime(b.bookedAt)}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-destructive font-medium shrink-0"
                disabled={cancelPending}
                onClick={() => onCancel(b.id)}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
