import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageError, PageLoader } from "@/components/PageState";
import { useRoster, useSchedule, type ScheduleOccurrence } from "@/hooks/use-schedule";
import { useClientsPage } from "@/hooks/use-studio-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCancelBooking,
  useCreateBooking,
  useCreateClass,
  useMarkAttended,
  usePromoteFromWaitlist,
  useSendReminder,
  useUpdateClass,
} from "@/hooks/use-studio-mutations";
import { cn } from "@/lib/utils";
import { addDaysToDateKey, localDateKey } from "@/lib/studioTimezone";
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
  return addDaysToDateKey(dateKey, days);
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

function bookingStatusLabel(status: string) {
  if (status === "booked") return "Signed up";
  if (status === "waitlisted") return "Waitlisted";
  return status;
}

function defaultCancelMessage(memberName: string, className: string, timeLabel: string) {
  const firstName = memberName.split(" ")[0];
  return `Hi ${firstName}, your spot for ${className} at ${timeLabel} has been cancelled. Reply anytime to rebook.`;
}

type RosterBooking = {
  id: string;
  status: string;
  attended: boolean;
  member: { id: string; name: string; email: string; phone: string; status: string } | null;
};

function RosterBookingRow({
  booking,
  showAttended,
  onMarkAttended,
  onPromote,
  onRemind,
  onCancel,
  markingPending,
  promotePending,
  remindPending,
  promoteDisabled,
}: {
  booking: RosterBooking;
  showAttended?: boolean;
  onMarkAttended?: () => void;
  onPromote?: () => void;
  onRemind: () => void;
  onCancel: () => void;
  markingPending: boolean;
  promotePending?: boolean;
  remindPending: boolean;
  promoteDisabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-2 text-sm">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-medium">{booking.member?.name}</div>
          <div className="text-xs text-muted-foreground capitalize">
            {bookingStatusLabel(booking.status)}
            {booking.attended && " · Attended"}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {showAttended && onMarkAttended && (
            <Button
              type="button"
              variant="chip"
              size="xs"
              disabled={markingPending}
              onClick={onMarkAttended}
            >
              {booking.attended ? "Unmark" : "Attended"}
            </Button>
          )}
          {onPromote && (
            <Button
              type="button"
              variant="chip"
              size="xs"
              disabled={promotePending || promoteDisabled}
              onClick={onPromote}
            >
              Add to roster
            </Button>
          )}
          <Button
            type="button"
            variant="chip"
            size="xs"
            disabled={remindPending}
            onClick={onRemind}
          >
            Remind
          </Button>
          <Button type="button" variant="chipDestructive" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    memberName: string;
  } | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const markAttended = useMarkAttended();
  const sendReminder = useSendReminder();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const promoteFromWaitlist = usePromoteFromWaitlist();
  const [capacityDraft, setCapacityDraft] = useState<number | "">("");

  const currentWeek = data?.weekStart ?? weekStart;

  const members = useMemo(
    () => (clientsData?.clients ?? []).slice(0, 200).map((c) => ({ id: c.id, name: c.name, email: c.email })),
    [clientsData]
  );

  useEffect(() => {
    if (!selected) {
      setCapacityDraft("");
      return;
    }
    setCapacityDraft(roster.data?.class.capacity ?? selected.occ.capacity);
  }, [selected?.occ.classId, selected?.occ.date, roster.data?.class.capacity, selected?.occ.capacity]);

  const rosterBookings = roster.data?.bookings;
  const bookedMembers = useMemo(
    () => (rosterBookings ?? []).filter((b) => b.status === "booked"),
    [rosterBookings]
  );
  const waitlistedMembers = useMemo(
    () => (rosterBookings ?? []).filter((b) => b.status === "waitlisted"),
    [rosterBookings]
  );

  const displayCapacity =
    typeof capacityDraft === "number" ? capacityDraft : (selected?.occ.capacity ?? 0);
  const minCapacity = Math.max(1, bookedMembers.length);
  const capacityTooLow =
    typeof capacityDraft === "number" && capacityDraft < minCapacity;
  const rosterFull = bookedMembers.length >= displayCapacity;
  const capacityChanged =
    selected !== null &&
    typeof capacityDraft === "number" &&
    !capacityTooLow &&
    capacityDraft !== (roster.data?.class.capacity ?? selected.occ.capacity);

  useEffect(() => {
    if (!data || !searchClassId) return;
    const todayKey = localDateKey();
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
    const base = currentWeek ?? data.days[0]?.date ?? localDateKey();
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

  const handleSaveCapacity = () => {
    if (!selected || typeof capacityDraft !== "number" || capacityDraft < 1) return;
    if (capacityDraft < bookedMembers.length) {
      toast.error(`Class size cannot be below ${bookedMembers.length} — that many members are already booked.`);
      return;
    }
    updateClass.mutate(
      {
        id: selected.occ.classId,
        capacity: capacityDraft,
        occurrenceDate: selected.occ.date,
      },
      {
        onSuccess: () => {
          toast.success("Class size updated");
          setSelected((s) =>
            s ? { occ: { ...s.occ, capacity: capacityDraft, spotsLeft: Math.max(0, capacityDraft - s.occ.booked) } } : null
          );
          roster.refetch();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const openCancel = (booking: RosterBooking) => {
    if (!selected || !booking.member?.name) return;
    setCancelMessage(
      defaultCancelMessage(booking.member.name, selected.occ.name, selected.occ.timeLabel)
    );
    setCancelTarget({ id: booking.id, memberName: booking.member.name });
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

      <div className="space-y-4">
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

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setBookMemberId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          {!selected ? null : (
            <>
              <DialogHeader>
                <DialogTitle>{selected.occ.name}</DialogTitle>
                <DialogDescription>
                  {selected.occ.date} at {selected.occ.timeLabel} · {selected.occ.instructor}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-end gap-2 shrink-0">
                <div className="flex-1 space-y-1">
                  <label htmlFor="class-capacity" className="text-xs font-medium text-muted-foreground">
                    Class size
                  </label>
                  <input
                    id="class-capacity"
                    type="number"
                    min={minCapacity}
                    value={capacityDraft}
                    onChange={(e) =>
                      setCapacityDraft(
                        e.target.value === "" ? "" : Math.max(minCapacity, Number(e.target.value))
                      )
                    }
                    className="field-control w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!capacityChanged || updateClass.isPending || capacityTooLow}
                  onClick={handleSaveCapacity}
                  className="rounded-lg shrink-0"
                >
                  Save size
                </Button>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                {bookedMembers.length}/{displayCapacity} booked
                {waitlistedMembers.length > 0 && ` · ${waitlistedMembers.length} on waitlist`}
                {bookedMembers.length > 0 && (
                  <> · Minimum size: {minCapacity}</>
                )}
              </p>

              {roster.isLoading ? (
                <PageLoader />
              ) : (
                <>
                  <div className="space-y-4 overflow-y-auto flex-1 min-h-0 max-h-[45vh] pr-1">
                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Booked ({bookedMembers.length}/{displayCapacity})
                      </h4>
                      <div className="space-y-2">
                        {bookedMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3 text-center rounded-lg border border-dashed border-border">
                            No bookings yet.
                          </p>
                        ) : (
                          bookedMembers.map((b) => (
                            <RosterBookingRow
                              key={b.id}
                              booking={b}
                              showAttended
                              markingPending={markAttended.isPending}
                              remindPending={sendReminder.isPending}
                              onMarkAttended={() =>
                                markAttended.mutate(
                                  { id: b.id, attended: !b.attended },
                                  {
                                    onSuccess: () => roster.refetch(),
                                    onError: (e) => toast.error(e.message),
                                  }
                                )
                              }
                              onRemind={() =>
                                sendReminder.mutate(b.id, {
                                  onSuccess: () => toast.success("Reminder sent"),
                                  onError: (e) => toast.error(e.message),
                                })
                              }
                              onCancel={() => openCancel(b)}
                            />
                          ))
                        )}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                        Waitlist ({waitlistedMembers.length})
                      </h4>
                      <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2">
                        {waitlistedMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3 text-center">
                            No one on the waitlist.
                          </p>
                        ) : (
                          <>
                            {rosterFull && (
                              <p className="text-xs text-muted-foreground px-1 pb-2">
                                Class is full — increase size or remove a booking to add someone from the waitlist.
                              </p>
                            )}
                            {waitlistedMembers.map((b) => (
                              <RosterBookingRow
                                key={b.id}
                                booking={b}
                                showAttended={false}
                                markingPending={markAttended.isPending}
                                promotePending={promoteFromWaitlist.isPending}
                                remindPending={sendReminder.isPending}
                                promoteDisabled={rosterFull}
                                onPromote={() =>
                                  promoteFromWaitlist.mutate(b.id, {
                                    onSuccess: () => {
                                      toast.success(`${b.member?.name ?? "Member"} added to roster`);
                                      roster.refetch();
                                    },
                                    onError: (e) => toast.error(e.message),
                                  })
                                }
                                onRemind={() =>
                                  sendReminder.mutate(b.id, {
                                    onSuccess: () => toast.success("Reminder sent"),
                                    onError: (e) => toast.error(e.message),
                                  })
                                }
                                onCancel={() => openCancel(b)}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3 shrink-0">
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
        </DialogContent>
      </Dialog>

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

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              Send {cancelTarget?.memberName} a cancellation text, then remove them from the roster.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={cancelMessage}
            onChange={(e) => setCancelMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelBooking.isPending || !cancelMessage.trim()}
              onClick={() => {
                if (!cancelTarget) return;
                cancelBooking.mutate(
                  { id: cancelTarget.id, message: cancelMessage.trim() },
                  {
                    onSuccess: () => {
                      toast.success("Cancelled and message sent");
                      setCancelTarget(null);
                      roster.refetch();
                    },
                    onError: (e) => toast.error(e.message),
                  }
                );
              }}
            >
              Send & cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
