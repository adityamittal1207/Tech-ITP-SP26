import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GENERIC_OWNER_NAMES = new Set(["", "studio owner", "owner"]);

/** First name for "Good morning, …" — avoids "Studio" when owner is unset. */
export function ownerGreetingName(owner: string): string {
  const trimmed = owner.trim();
  if (GENERIC_OWNER_NAMES.has(trimmed.toLowerCase())) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}
