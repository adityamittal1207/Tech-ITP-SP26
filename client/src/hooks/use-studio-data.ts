import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import type { Client, Studio } from "@/lib/mock-data";

export function useStudio() {
  return useQuery({
    queryKey: ["studio"],
    queryFn: () => apiRequest<Studio>("/studio"),
  });
}

export function useHomePage() {
  return useQuery({
    queryKey: ["studio", "home"],
    queryFn: () =>
      apiRequest<{
        studio: Studio;
        kpis: { label: string; value: number; delta: number; unit: string; invert?: boolean }[];
        todayClasses: { id: string; name: string; time: string; instructor: string; booked: number; capacity: number; waitlist: number }[];
        todaySummary: { classCount: number; bookedSeats: number };
        actionItems: { id: string; title: string; subtitle: string; cta: string; route: string }[];
        activityFeed: { id: string; type: string; text: string; time: string }[];
        visitsTrend: { d: string; visits: number; noShows: number }[];
      }>("/studio/home"),
  });
}

export function useClientsPage() {
  return useQuery({
    queryKey: ["studio", "clients"],
    queryFn: () =>
      apiRequest<{
        clients: Client[];
        counts: Record<string, number>;
        cohorts: { month: string; size: number; m1: number; m3: number | null; m6: number | null; m12: number | null }[];
      }>("/studio/clients"),
  });
}

export function useAnalyticsPage() {
  return useQuery({
    queryKey: ["studio", "analytics"],
    queryFn: () => apiRequest("/studio/analytics"),
  });
}

export function useCommunicationsPage() {
  return useQuery({
    queryKey: ["studio", "communications"],
    queryFn: () => apiRequest("/studio/communications"),
  });
}

export function useSettingsPage() {
  return useQuery({
    queryKey: ["studio", "settings"],
    queryFn: () =>
      apiRequest<{
        studio: Studio;
        retention: { newMemberDays: number; daysUntilAtRisk: number; daysUntilLapsed: number };
        integrations: {
          id: string;
          name: string;
          desc: string;
          connected: boolean;
          lastSync: string | null;
          importSource?: string;
        }[];
        exportGuides: Record<string, { name: string; steps: string[] }>;
        lastImport: {
          ranAt: string;
          summary: {
            kind: string;
            source?: string;
            imported: number;
            updated: number;
            errors: string[];
          };
        } | null;
      }>("/studio/settings"),
  });
}
