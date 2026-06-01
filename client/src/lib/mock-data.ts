// UI types and constants — data is loaded from /api/studio/* at runtime.

export type ClientStatus = "New" | "Regular" | "At-Risk" | "Lapsed" | "Win-back";
export const STATUSES: ClientStatus[] = ["New", "Regular", "At-Risk", "Lapsed", "Win-back"];

export const statusColor: Record<ClientStatus, string> = {
  New: "bg-status-new/15 text-status-new border-status-new/30",
  Regular: "bg-status-regular/15 text-status-regular border-status-regular/30",
  "At-Risk": "bg-status-atrisk/15 text-status-atrisk border-status-atrisk/40",
  Lapsed: "bg-status-lapsed/15 text-status-lapsed border-status-lapsed/30",
  "Win-back": "bg-status-winback/15 text-status-winback border-status-winback/30",
};

export type Channel = "Instagram" | "Groupon" | "Referral" | "Walk-in";

export type ClientMessage = {
  id: string;
  out: boolean;
  body: string;
  time: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  status: ClientStatus;
  joinDate: string;
  joinSource: Channel;
  membership: "Unlimited" | "8-pack" | "4-pack" | "Drop-in" | "Lapsed";
  ltv: number;
  visits90: number;
  daysSinceLast: number;
  favoriteInstructor: string;
  reason?: string;
  tags: string[];
  notes: string;
  attendanceMonthly?: { m: string; visits: number }[];
  recentMessages?: ClientMessage[];
};

export type Studio = {
  name: string;
  city: string;
  owner: string;
};
