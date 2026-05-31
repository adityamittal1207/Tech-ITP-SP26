const MEMBERSHIP_LTV = { basic: 15, premium: 28, unlimited: 45 };

export function groupBookingsByMember(bookings) {
  const map = {};
  for (const b of bookings) {
    const id = String(b.memberId);
    (map[id] ??= []).push(b);
  }
  return map;
}

export function enrichMember(member, bookings = [], now = Date.now()) {
  const doc = member.toObject ? member.toObject() : { ...member };
  const ninetyDaysAgo = now - 90 * 86_400_000;
  const visits90 = bookings.filter(
    (b) => new Date(b.bookedAt).getTime() >= ninetyDaysAgo
  ).length;
  const attended = bookings.filter((b) => b.attended).length;

  const lastBookedAt = bookings.length
    ? Math.max(...bookings.map((b) => new Date(b.bookedAt).getTime()))
    : null;
  const daysSinceLast =
    lastBookedAt != null ? Math.floor((now - lastBookedAt) / 86_400_000) : 999;

  const ltv = Math.round(attended * (MEMBERSHIP_LTV[doc.membershipType] || 20));

  let reason;
  if (doc.status === "at-risk") {
    reason =
      daysSinceLast < 999
        ? `${daysSinceLast} days since last visit`
        : "No recent bookings on record";
  }

  return {
    ...doc,
    visits90,
    daysSinceLast,
    ltv,
    reason,
  };
}
