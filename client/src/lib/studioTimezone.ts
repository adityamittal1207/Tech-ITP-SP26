export const STUDIO_TIMEZONE = import.meta.env.VITE_STUDIO_TIMEZONE || "America/Los_Angeles";

/** YYYY-MM-DD in studio (Pacific) local time. */
export function localDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: STUDIO_TIMEZONE });
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatStudioDateTime(date: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(date).toLocaleString("en-US", {
    timeZone: STUDIO_TIMEZONE,
    ...options,
  });
}

export function formatStudioDate(date: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: STUDIO_TIMEZONE,
    ...options,
  });
}
