import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export function useSendOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      type,
      body,
    }: {
      memberId: string;
      type: "atRisk" | "winback" | "welcome" | "milestone" | "reminder";
      body?: string;
    }) =>
      apiRequest<{ success: boolean }>("/sms/outreach", {
        method: "POST",
        body: JSON.stringify({ memberId, type, ...(body ? { body } : {}) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });
}

export type SettingsPatch = {
  smsTemplates?: Record<string, string>;
  bookingSlug?: string;
  publicBookingEnabled?: boolean;
  retention?: {
    newMemberDays?: number;
    daysUntilAtRisk?: number;
    daysUntilLapsed?: number;
  };
  reminderTiming?: {
    id: string;
    name: string;
    firstReminder: string;
    secondReminder: string;
    note?: string;
  }[];
};

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) =>
      apiRequest("/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });
}

export type ImportSource = "mindbody" | "acuity" | "native";

export function useImportCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      csv,
      source = "native",
    }: {
      kind: "members" | "classes" | "bookings";
      csv: string;
      source?: ImportSource;
    }) =>
      apiRequest<{ imported: number; updated: number; errors: string[]; source: string }>(
        `/import/${kind}`,
        {
          method: "POST",
          body: JSON.stringify({ csv, source }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });
}

function invalidateBookingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["studio"] });
  queryClient.invalidateQueries({ queryKey: ["schedule"] });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { memberId: string; classId: string; occurrenceDate: string }) =>
      apiRequest("/bookings", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) =>
      apiRequest(`/bookings/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(message ? { message } : {}),
      }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function usePromoteFromWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/bookings/${id}/promote`, { method: "POST" }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useMarkAttended() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      apiRequest(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ attended }),
      }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest("/sms/reminder", { method: "POST", body: JSON.stringify({ bookingId }) }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("/classes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      capacity?: number;
      occurrenceDate?: string;
    }) =>
      apiRequest(`/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/classes/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateBookingQueries(queryClient),
  });
}
