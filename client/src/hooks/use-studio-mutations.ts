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
