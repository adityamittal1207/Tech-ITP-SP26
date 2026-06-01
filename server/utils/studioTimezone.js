export const STUDIO_TIMEZONE = process.env.STUDIO_TIMEZONE || "America/Los_Angeles";

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/** YYYY-MM-DD in studio (Pacific) local time. */
export function localDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: STUDIO_TIMEZONE });
}

export function studioDayName(date = new Date()) {
  return DAY_NAMES[studioDayIndex(date)];
}

export function studioDayIndex(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export function studioDayIndexFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function studioDayNameFromDateKey(dateKey) {
  return DAY_NAMES[studioDayIndexFromDateKey(dateKey)];
}

export function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Wall-clock date + time in studio TZ → UTC Date. */
export function studioDateTimeUtc(dateKey, hours, minutes) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(utcGuess)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return new Date(utcGuess.getTime() - (asIfUtc - utcGuess.getTime()));
}

export function getWeekStartKey(dateKey) {
  const dow = studioDayIndexFromDateKey(dateKey);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDaysToDateKey(dateKey, mondayOffset);
}

export function dateKeysForPastDays(count, from = new Date()) {
  const todayKey = localDateKey(from);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(addDaysToDateKey(todayKey, -i));
  }
  return keys;
}

export function formatStudioDateTime(date, options = {}) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: STUDIO_TIMEZONE,
    ...options,
  });
}

export function formatStudioDate(date, options = {}) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: STUDIO_TIMEZONE,
    ...options,
  });
}

export function formatStudioTime(date, options = {}) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: STUDIO_TIMEZONE,
    ...options,
  });
}
