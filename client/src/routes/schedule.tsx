import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { useRoster, useSchedule, type ScheduleOccurrence } from "@/hooks/use-schedule";
import { useClientsPage } from "@/hooks/use-studio-data";
import {
  useCancelBooking,
  useConfirmBooking,
  useCreateBooking,
  useCreateClass,
  useMarkAttended,
  useSendReminder,
} from "@/hooks/use-studio-mutations";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Tether" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    classId: typeof search.classId === "string" ? search.classId : undefined,
    date: typeof search.date === "string" ? search.date : undefined,
  }),
  component: SchedulePage,
});

function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toISOString().slice(0, 10);
}

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const CLASS_CATEGORIES = ["yoga", "pilates", "hiit", "spin", "strength"] as const;

const CATEGORY_LABELS: Record<(typeof CLASS_CATEGORIES)[number], string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  hiit: "HIIT",
  spin: "Spin",
  strength: "Strength",
};

const NEW_CLASS_FIELDS = [
  { field: "name", type: "text", label: "Class name", placeholder: "e.g. Morning Flow" },
  { field: "instructor", type: "text", label: "Instructor", placeholder: "e.g. Alex Rivera" },
  { field: "time", type: "time", label: "Start time" },
  { field: "durationMinutes", type: "number", label: "Duration (minutes)", placeholder: "60" },
  { field: "capacity", type: "number", label: "Capacity", placeholder: "20" },
] as const;

function SchedulePage() {
  const { classId: searchClassId, date: searchDate } = Route.useSearch();
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, error } = useSchedule(weekStart);
  const [selected, setSelected] = useState<{ occ: ScheduleOccurrence } | null>(null);
  const [bookMemberId, setBookMemberId] = useState("");
  const [showNewClass, setShowNewClass] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    instructor: "",
    dayOfWeek: "monday",
    time: "09:00",
    durationMinutes: 60,
    capacity: 20,
    category: "yoga",
  });

  const roster = useRoster(selected?.occ.classId ?? null, selected?.occ.date ?? null);
  const { data: clientsData } = useClientsPage();
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();
  const confirmBooking = useConfirmBooking();
  const markAttended = useMarkAttended();
  const sendReminder = useSendReminder();
  const createClass = useCreateClass();

  const currentWeek = data?.weekStart ?? weekStart;

  const members = useMemo(
    () => (clientsData?.clients ?? []).slice(0, 200).map((c) => ({ id: c.id, name: c.name, email: c.email })),
    [clientsData]
  );

  useEffect(() => {
    if (!data || !searchClassId) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const day of data.days) {
      const match = day.occurrences.find(
        (o) =>
          o.classId === searchClassId &&
          (searchDate === "today" ? day.date === todayKey : !searchDate || o.date === searchDate)
      );
      if (match) {
        setSelected({ occ: match });
        break;
      }
    }
  }, [data, searchClassId, searchDate]);

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <PageError message={error?.message ?? "Failed to load schedule"} />;

  const shiftWeek = (delta: number) => {
    const base = currentWeek ?? data.days[0]?.date ?? new Date().toISOString().slice(0, 10);
    setWeekStart(addDays(base, delta * 7));
    setSelected(null);
  };

  const handleBook = () => {
    if (!selected || !bookMemberId) return;
    createBooking.mutate(
      {
        memberId: bookMemberId,
        classId: selected.occ.classId,
        occurrenceDate: selected.occ.date,
      },
      {
        onSuccess: () => {
          toast.success("Member booked");
          setBookMemberId("");
          roster.refetch();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        subtitle="Manage classes, rosters, and native bookings"
        actions={
          <Button type="button" onClick={() => setShowNewClass(true)} className="rounded-lg">
            <Plus className="h-4 w-4" /> Add Class
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="iconSm" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Week of {data.weekStart}</span>
          <Button type="button" variant="outline" size="iconSm" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Link to="/settings" className="text-xs text-primary hover:underline">
          Public booking link in Settings
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {data.days.map((day) => (
            <div key={day.date} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="font-medium capitalize mb-3">
                {day.label} <span className="text-muted-foreground text-sm font-normal">{day.date}</span>
              </div>
              {day.occurrences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes scheduled</p>
              ) : (
                <div className="space-y-2">
                  {day.occurrences.map((occ) => {
                    const fill = occ.capacity > 0 ? occ.booked / occ.capacity : 0;
                    const isSelected =
                      selected?.occ.classId === occ.classId && selected?.occ.date === occ.date;
                    return (
                      <button
                        key={`${occ.classId}-${occ.date}`}
                        type="button"
                        onClick={() => setSelected({ occ })}
                        className={cn(
                          "interactive-card w-full text-left rounded-xl border p-3",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:bg-muted/40 hover:border-border/80"
                        )}
                      >
                        <div className="flex justify-between gap-2">
                          <div>
                            <div className="font-medium">{occ.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {occ.timeLabel} · {occ.instructor}
                            </div>
                          </div>
                          <div className="text-xs text-right">
                            <div>
                              {occ.booked}/{occ.capacity} booked
                            </div>
                            {occ.waitlisted > 0 && (
                              <div className="text-amber-600">{occ.waitlisted} waitlist</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-[width] duration-300 ease-out"
                            style={{ width: `${Math.min(100, fill * 100)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft h-fit sticky top-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a class to view roster and book members.</p>
          ) : (
            <>
              <SectionTitle
                title={selected.occ.name}
                subtitle={`${selected.occ.date} at ${selected.occ.timeLabel}`}
              />
              {roster.isLoading ? (
                <PageLoader />
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {roster.data?.bookings.map((b) => (
                      <div key={b.id} className="rounded-lg border border-border p-2 text-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-medium">{b.member?.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{b.status}</div>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {b.status === "booked" && (
                              <Button
                                type="button"
                                variant="chip"
                                size="xs"
                                disabled={confirmBooking.isPending}
                                onClick={() =>
                                  confirmBooking.mutate(b.id, {
                                    onSuccess: () => {
                                      toast.success("Confirmed");
                                      roster.refetch();
                                    },
                                  })
                                }
                              >
                                Confirm
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="chip"
                              size="xs"
                              disabled={markAttended.isPending}
                              onClick={() =>
                                markAttended.mutate(
                                  { id: b.id, attended: !b.attended },
                                  { onSuccess: () => roster.refetch() }
                                )
                              }
                            >
                              {b.attended ? "Unmark" : "Attended"}
                            </Button>
                            <Button
                              type="button"
                              variant="chip"
                              size="xs"
                              disabled={sendReminder.isPending}
                              onClick={() =>
                                sendReminder.mutate(b.id, {
                                  onSuccess: () => toast.success("Reminder sent"),
                                  onError: (e) => toast.error(e.message),
                                })
                              }
                            >
                              Remind
                            </Button>
                            <Button
                              type="button"
                              variant="chipDestructive"
                              size="xs"
                              disabled={cancelBooking.isPending}
                              onClick={() =>
                                cancelBooking.mutate(b.id, {
                                  onSuccess: () => {
                                    toast.success("Cancelled");
                                    roster.refetch();
                                  },
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className="text-xs font-medium text-muted-foreground">Book member</label>
                    <select
                      value={bookMemberId}
                      onChange={(e) => setBookMemberId(e.target.value)}
                      className="field-control w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select member…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      className="w-full rounded-lg"
                      disabled={!bookMemberId || createBooking.isPending}
                      onClick={handleBook}
                    >
                      Book into Class
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showNewClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">New Recurring Class</h3>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                aria-label="Close"
                onClick={() => setShowNewClass(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {NEW_CLASS_FIELDS.map(({ field, type, label, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <label htmlFor={`new-class-${field}`} className="text-xs font-medium text-muted-foreground">
                  {label}
                </label>
                <input
                  id={`new-class-${field}`}
                  placeholder={placeholder}
                  type={type}
                  value={String(newClass[field] ?? "")}
                  onChange={(e) =>
                    setNewClass((s) => ({
                      ...s,
                      [field]:
                        type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  className="field-control w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label htmlFor="new-class-day" className="text-xs font-medium text-muted-foreground">
                Day of week
              </label>
              <select
                id="new-class-day"
                value={newClass.dayOfWeek}
                onChange={(e) => setNewClass((s) => ({ ...s, dayOfWeek: e.target.value }))}
                className="field-control w-full rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new-class-category" className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                id="new-class-category"
                value={newClass.category}
                onChange={(e) => setNewClass((s) => ({ ...s, category: e.target.value }))}
                className="field-control w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {CLASS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              className="w-full rounded-lg"
              disabled={createClass.isPending}
              onClick={() =>
                createClass.mutate(newClass, {
                  onSuccess: () => {
                    toast.success("Class created");
                    setShowNewClass(false);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Save Class
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
