import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export function useSendOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, type }: { memberId: string; type: "atRisk" | "winback" }) =>
      apiRequest<{ success: boolean }>("/sms/outreach", {
        method: "POST",
        body: JSON.stringify({ memberId, type }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });
}

export function useImportCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, csv }: { kind: "members" | "classes" | "bookings"; csv: string }) =>
      apiRequest<{ imported: number; updated: number; errors: string[] }>(`/import/${kind}`, {
        method: "POST",
        body: JSON.stringify({ csv }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });
}
