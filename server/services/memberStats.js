import { localDateKey } from "../utils/studioTimezone.js";

const MEMBERSHIP_LTV = { basic: 15, premium: 28, unlimited: 45 };
const MS_PER_DAY = 86_400_000;

export function bookingVisitMs(booking) {
  return new Date(booking.bookedAt).getTime();
}

export function bookingMemberId(booking) {
  const mid = booking.memberId;
  if (mid == null) return null;
  if (typeof mid === "object" && mid._id != null) return String(mid._id);
  return String(mid);
}

/** Class session has started (bookedAt is the occurrence start time). */
export function hasSessionStarted(booking, now = Date.now()) {
  return bookingVisitMs(booking) <= now;
}

/** Visit trend bucket: visit, noShow, or skip (future session / cancelled). */
export function classifyBookingForVisitTrend(booking, now = Date.now()) {
  if (booking.status === "cancelled") return null;
  if (!hasSessionStarted(booking, now)) return null;
  return booking.attended ? "visit" : "noShow";
}

export function applyBookingToVisitTrend(dateMap, booking, now = Date.now()) {
  const kind = classifyBookingForVisitTrend(booking, now);
  if (!kind) return;
  const key = localDateKey(booking.bookedAt);
  if (!(key in dateMap)) return;
  if (kind === "visit") dateMap[key].visits++;
  else dateMap[key].noShows++;
}

/** Counts toward visit stats — staff-marked attendance always counts. */
export function isPastBooking(booking, now = Date.now()) {
  if (booking.status === "cancelled") return false;
  if (booking.attended) return true;
  return bookingVisitMs(booking) <= now;
}

/**
 * Most recent visit timestamp: latest attended past session, else latest past booking.
 * Ignores future bookings so scheduling ahead does not reset "last visit".
 */
export function getLastVisitMs(bookings = [], now = Date.now()) {
  let lastAttended = null;
  let lastPast = null;

  for (const b of bookings) {
    if (!isPastBooking(b, now)) continue;
    const ms = bookingVisitMs(b);
    lastPast = lastPast == null ? ms : Math.max(lastPast, ms);
    if (b.attended) {
      lastAttended = lastAttended == null ? ms : Math.max(lastAttended, ms);
    }
  }

  return lastAttended ?? lastPast;
}

export function daysSinceTimestamp(timestampMs, now = Date.now()) {
  return Math.max(0, Math.floor((now - timestampMs) / MS_PER_DAY));
}

export function groupBookingsByMember(bookings) {
  const map = {};
  for (const b of bookings) {
    const id = bookingMemberId(b);
    if (!id) continue;
    (map[id] ??= []).push(b);
  }
  return map;
}

export function enrichMember(member, bookings = [], now = Date.now()) {
  const doc = member.toObject ? member.toObject() : { ...member };
  const ninetyDaysAgo = now - 90 * MS_PER_DAY;

  const visits90 = bookings.filter(
    (b) =>
      b.attended &&
      isPastBooking(b, now) &&
      bookingVisitMs(b) >= ninetyDaysAgo
  ).length;

  const attended = bookings.filter((b) => b.attended && isPastBooking(b, now)).length;

  const lastVisitMs = getLastVisitMs(bookings, now);
  const daysSinceJoin = Math.max(
    0,
    Math.floor((now - new Date(doc.joinDate).getTime()) / MS_PER_DAY)
  );
  const estimatedNoBookingGap = Math.min(Math.max(daysSinceJoin, 28), 180);
  const daysSinceLast =
    lastVisitMs != null ? daysSinceTimestamp(lastVisitMs, now) : estimatedNoBookingGap;

  const ltv = Math.round(attended * (MEMBERSHIP_LTV[doc.membershipType] || 20));

  let reason;
  if (doc.status === "at-risk") {
    reason = `${daysSinceLast} days since last visit`;
  }

  return {
    ...doc,
    visits90,
    daysSinceLast,
    lastVisitAt: lastVisitMs != null ? new Date(lastVisitMs).toISOString() : null,
    ltv,
    reason,
  };
}
