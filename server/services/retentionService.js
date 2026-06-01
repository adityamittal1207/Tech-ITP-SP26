import config from "../config/businessConfig.js";
import { daysSinceTimestamp, getLastVisitMs } from "./memberStats.js";

export function computeStatus(member, bookings, now = Date.now()) {
  const daysSinceJoin = (now - new Date(member.joinDate)) / 86_400_000;

  if (daysSinceJoin <= config.retention.newMemberDays) {
    return "new";
  }

  const lastVisitMs = getLastVisitMs(bookings ?? [], now);
  if (lastVisitMs == null) {
    return "lapsed";
  }

  const daysSinceLastBooking = daysSinceTimestamp(lastVisitMs, now);

  if (daysSinceLastBooking > config.retention.daysUntilLapsed) {
    return "lapsed";
  }
  if (daysSinceLastBooking > config.retention.daysUntilAtRisk) {
    return "at-risk";
  }
  return "regular";
}
