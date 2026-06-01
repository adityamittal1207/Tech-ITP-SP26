import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export type ScheduleOccurrence = {
  classId: string;
  name: string;
  instructor: string;
  time: string;
  timeLabel: string;
  durationMinutes: number;
  capacity: number;
  category: string;
  date: string;
  bookedAt: string;
  booked: number;
  waitlisted: number;
  spotsLeft: number;
};

export type ScheduleDay = {
  date: string;
  dayName: string;
  label: string;
  occurrences: ScheduleOccurrence[];
};

export function useSchedule(week?: string) {
  const q = week ? `?week=${week}` : "";
  return useQuery({
    queryKey: ["schedule", week ?? "current"],
    queryFn: () =>
      apiRequest<{ weekStart: string; days: ScheduleDay[] }>(`/schedule${q}`),
  });
}

export function useRoster(classId: string | null, date: string | null) {
  return useQuery({
    queryKey: ["schedule", "roster", classId, date],
    enabled: Boolean(classId && date),
    queryFn: () =>
      apiRequest<{
        class: { name: string; instructor: string; time: string; capacity: number };
        occurrenceDate: string;
        bookings: {
          id: string;
          status: string;
          attended: boolean;
          reminderSent: boolean;
          member: { id: string; name: string; email: string; phone: string; status: string } | null;
        }[];
      }>(`/schedule/${classId}/roster?date=${date}`),
  });
}
