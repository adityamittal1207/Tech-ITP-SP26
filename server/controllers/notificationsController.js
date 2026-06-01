import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import { enrichMember, groupBookingsByMember } from "../services/memberStats.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

function relativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export async function getNotifications(req, res, next) {
  try {
    const filter = ownerFilter(getOwnerUid(req));
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86_400_000;
    const twoDaysAgo = now - 2 * 86_400_000;

    const [members, bookings, messages] = await Promise.all([
      Member.find(filter),
      Booking.find(filter, { memberId: 1, bookedAt: 1, attended: 1 }),
      Message.find(filter).populate("memberId", "name").sort({ sentAt: -1 }).limit(10),
    ]);

    const byMember = groupBookingsByMember(bookings);
    const atRisk = members.filter((m) => m.status === "at-risk");
    const enriched = atRisk.map((m) =>
      enrichMember(m, byMember[String(m._id)] ?? [])
    );
    enriched.sort((a, b) => b.ltv - a.ltv);

    const newMembers = members.filter(
      (m) => new Date(m.joinDate).getTime() >= sevenDaysAgo
    );
    const recentMessages = messages.filter(
      (m) => new Date(m.sentAt).getTime() >= twoDaysAgo
    );

    const items = [];

    if (atRisk.length > 0) {
      const top = enriched[0];
      items.push({
        id: "n-at-risk",
        type: "alert",
        title: `${atRisk.length} clients need outreach`,
        subtitle: top ? `Top priority: ${top.name} ($${top.ltv} LTV)` : "Review at-risk list",
        route: "/clients",
        time: "Now",
      });
    }

    if (newMembers.length > 0) {
      items.push({
        id: "n-new",
        type: "signup",
        title: `${newMembers.length} new member${newMembers.length === 1 ? "" : "s"} this week`,
        subtitle: newMembers.slice(0, 2).map((m) => m.name).join(", "),
        route: "/clients",
        time: relativeTime(newMembers[0].joinDate),
      });
    }

    const outreachCount = members.filter(
      (m) => m.status === "at-risk" || m.status === "lapsed"
    ).length;
    if (outreachCount > 0) {
      items.push({
        id: "n-queue",
        type: "comms",
        title: `${Math.min(outreachCount, 8)} in outreach queue`,
        subtitle: "Review and send retention messages",
        route: "/communications",
        time: "Today",
      });
    }

    for (const msg of recentMessages.slice(0, 3)) {
      items.push({
        id: `n-msg-${msg._id}`,
        type: "message",
        title: `SMS sent to ${msg.memberId?.name ?? "member"}`,
        subtitle: msg.type === "atRisk" ? "At-risk outreach" : msg.templateUsed ?? msg.type,
        route: "/communications",
        time: relativeTime(msg.sentAt),
      });
    }

    res.json({
      unreadCount: items.length,
      items: items.slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
}
