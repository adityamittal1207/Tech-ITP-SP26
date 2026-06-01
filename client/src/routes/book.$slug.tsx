import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageError, PageLoader } from "@/components/PageState";
import type { ScheduleDay } from "@/hooks/use-schedule";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d + days).toISOString().slice(0, 10);
}

export const Route = createFileRoute("/book/$slug")({
  head: ({ params }) => ({ meta: [{ title: `Book — ${params.slug}` }] }),
  component: PublicBookPage,
});

function PublicBookPage() {
  const { slug } = Route.useParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<"email" | "browse">("email");

  const studioQuery = useQuery({
    queryKey: ["public", slug, "studio"],
    queryFn: () =>
      publicRequest<{ name: string; city?: string; publicBookingEnabled: boolean }>(
        `/studios/${slug}`
      ),
  });

  const scheduleQuery = useQuery({
    queryKey: ["public", slug, "schedule", weekStart],
    enabled: step === "browse" && studioQuery.isSuccess,
    queryFn: () => {
      const q = weekStart ? `?week=${weekStart}` : "";
      return publicRequest<{ weekStart: string; days: ScheduleDay[] }>(
        `/studios/${slug}/schedule${q}`
      );
    },
  });

  const myBookingsQuery = useQuery({
    queryKey: ["public", slug, "bookings", email],
    enabled: step === "browse" && email.includes("@"),
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
      }>(`/studios/${slug}/bookings?email=${encodeURIComponent(email)}`),
  });

  const bookMutation = useMutation({
    mutationFn: (body: { classId: string; date: string }) =>
      publicRequest<{ waitlisted: boolean }>(`/studios/${slug}/bookings`, {
        method: "POST",
        body: JSON.stringify({ email, name: name || undefined, phone: phone || undefined, ...body }),
      }),
    onSuccess: (data) => {
      toast.success(data.waitlisted ? "Added to waitlist" : "You're booked!");
      scheduleQuery.refetch();
      myBookingsQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      publicRequest(`/studios/${slug}/bookings/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ email }),
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
      day.occurrences
        .filter((o) => o.spotsLeft > 0 || o.waitlisted >= 0)
        .map((o) => ({ ...o, dayLabel: day.label }))
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
          <p className="text-sm text-muted-foreground mt-2">Book a class — no account required</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {step === "email" ? (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="font-medium">Enter your email</h2>
            <p className="text-xs text-muted-foreground">
              We use your email to find existing bookings and confirm cancellations.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!email.includes("@")}
              onClick={() => setStep("browse")}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{email}</span>
              <button type="button" className="text-primary text-xs" onClick={() => setStep("email")}>
                Change email
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-medium text-sm">New here?</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name (first booking)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile phone (first booking)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Available classes</h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded border border-border"
                    onClick={() =>
                      setWeekStart(
                        addDays(scheduleQuery.data?.weekStart ?? new Date().toISOString().slice(0, 10), -7)
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
                        addDays(scheduleQuery.data?.weekStart ?? new Date().toISOString().slice(0, 10), 7)
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
                    <p className="text-sm text-muted-foreground">No open slots this week.</p>
                  ) : (
                    openSlots.map((occ) => (
                      <div
                        key={`${occ.classId}-${occ.date}`}
                        className="rounded-xl border border-border p-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-medium text-sm">{occ.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {occ.dayLabel} · {occ.timeLabel} · {occ.instructor}
                          </div>
                          <div className="text-xs mt-1">
                            {occ.spotsLeft > 0 ? (
                              <span className="text-primary">{occ.spotsLeft} spots left</span>
                            ) : (
                              <span className="text-amber-600">Join waitlist</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={bookMutation.isPending}
                          onClick={() =>
                            bookMutation.mutate({ classId: occ.classId, date: occ.date })
                          }
                          className={cn(
                            "shrink-0 rounded-lg px-3 py-2 text-xs font-medium",
                            "bg-primary text-primary-foreground"
                          )}
                        >
                          Book
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-medium mb-3">My upcoming bookings</h2>
              {myBookingsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (myBookingsQuery.data?.bookings.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              ) : (
                <div className="space-y-2">
                  {myBookingsQuery.data!.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{b.className}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {b.status} · {new Date(b.bookedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-destructive font-medium"
                        onClick={() => cancelMutation.mutate(b.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
