import config from "../config/businessConfig.js";

export function computeStatus(member, bookings, now = Date.now()) {
  const daysSinceJoin = (now - new Date(member.joinDate)) / 86_400_000;

  if (daysSinceJoin <= config.retention.newMemberDays) {
    return "new";
  }

  if (!bookings || bookings.length === 0) {
    return "lapsed";
  }

  const lastBookedAt = bookings.reduce((latest, b) => {
    const d = new Date(b.bookedAt).getTime();
    return d > latest ? d : latest;
  }, 0);

  const daysSinceLastBooking = (now - lastBookedAt) / 86_400_000;

  if (daysSinceLastBooking > config.retention.daysUntilLapsed) {
    return "lapsed";
  }
  if (daysSinceLastBooking > config.retention.daysUntilAtRisk) {
    return "at-risk";
  }
  return "regular";
}
