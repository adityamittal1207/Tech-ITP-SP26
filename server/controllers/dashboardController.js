import businessConfig from "../config/businessConfig.js";
import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import { buildActivityFeed } from "../services/studioViewService.js";
import { applyBookingToVisitTrend, enrichMember, groupBookingsByMember } from "../services/memberStats.js";
import { computeChurnRatePct } from "../services/metricsService.js";
import { parseTime24 } from "../services/bookingService.js";
import {
  dateKeysForPastDays,
  localDateKey,
  studioDayName,
} from "../utils/studioTimezone.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

const FILLED_BOOKING_STATUSES = ["booked", "confirmed"];

function minutesFromTime24(time24) {
  const { hours, minutes } = parseTime24(time24);
  return hours * 60 + minutes;
}

function isUnderBookedToday({ booked, capacity }) {
  return capacity > 0 && booked > 0 && booked / capacity < 0.5;
}

function formatTime(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function relativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export async function getHomeDashboard(req, res, next) {
  try {
    const filter = ownerFilter(getOwnerUid(req));
    const now = Date.now();
    const todayKey = localDateKey();
    const todayDow = studioDayName();

    const [members, bookings, classes, messages] = await Promise.all([
      Member.find(filter),
      Booking.find(filter).populate("memberId", "name").populate("classId", "name instructor"),
      Class.find(filter),
      Message.find(filter).populate("memberId", "name").sort({ sentAt: -1 }).limit(10),
    ]);

    const byMember = groupBookingsByMember(bookings);
    const activeMembers = members.filter((m) => m.isActive).length;
    const atRiskMembers = members.filter((m) => m.status === "at-risk");
    const attendedCount = bookings.filter((b) => b.attended).length;
    const noShowCount = bookings.filter((b) => !b.attended).length;
    const attendanceRate = bookings.length
      ? Math.round((attendedCount / bookings.length) * 100)
      : 0;
    const churnRate = computeChurnRatePct(members, byMember);

    const tierMrr = { basic: 79, premium: 129, unlimited: 189 };
    const mrr = members
      .filter((m) => m.isActive && m.status !== "lapsed")
      .reduce((sum, m) => sum + (tierMrr[m.membershipType] || 0), 0);

    const kpis = [
      { label: "Active Clients", value: activeMembers, delta: 4.2, unit: "" },
      { label: "MRR", value: mrr, delta: 6.8, unit: "$" },
      { label: "Fill Rate", value: attendanceRate, delta: 3.1, unit: "%" },
      { label: "Churn Rate", value: churnRate, delta: -0.9, unit: "%", invert: true },
      {
        label: "4-Visit Conversion",
        value: members.length
          ? Math.round(
              (members.filter((m) => (byMember[String(m._id)]?.length ?? 0) >= 4).length /
                members.length) *
                100
            )
          : 0,
        delta: 5.4,
        unit: "%",
      },
    ];

    const dateMap = Object.fromEntries(dateKeysForPastDays(30).map((key) => [key, { visits: 0, noShows: 0 }]));
    for (const b of bookings) {
      applyBookingToVisitTrend(dateMap, b, now);
    }
    const visitsTrend = Object.entries(dateMap).map(([date, counts], i) => ({
      d: `D${i + 1}`,
      visits: counts.visits,
      noShows: counts.noShows,
    }));

    const todayClassesRaw = classes
      .filter((c) => c.dayOfWeek === todayDow)
      .sort((a, b) => minutesFromTime24(a.time) - minutesFromTime24(b.time));
    const todayClasses = todayClassesRaw.map((c) => {
      const classBookings = bookings.filter(
        (b) =>
          String(b.classId?._id ?? b.classId) === String(c._id) &&
          localDateKey(b.bookedAt) === todayKey &&
          b.status !== "cancelled"
      );
      const booked = classBookings.filter((b) => FILLED_BOOKING_STATUSES.includes(b.status)).length;
      const waitlist = classBookings.filter((b) => b.status === "waitlisted").length;
      return {
        id: String(c._id),
        name: c.name,
        time24: c.time,
        time: formatTime(c.time),
        instructor: c.instructor,
        booked,
        capacity: c.capacity,
        waitlist,
      };
    });

    const underBooked = todayClasses.filter(isUnderBookedToday);
    const waitlistedClasses = todayClasses.filter((c) => c.waitlist > 0);
    const waitlistTotal = waitlistedClasses.reduce((sum, c) => sum + c.waitlist, 0);
    const newMembers = members.filter((m) => m.status === "new");

    const actionItems = [
      ...(atRiskMembers.length > 0
        ? [
            {
              id: "a1",
              title: `${atRiskMembers.length} at-risk client${atRiskMembers.length === 1 ? "" : "s"} need outreach this week`,
              subtitle: "Sorted by engagement — highest value first",
              cta: "Open at-risk list",
              route: "/clients",
            },
          ]
        : []),
      ...(underBooked.length
        ? [
            {
              id: "a2",
              title: `${underBooked.length} class${underBooked.length === 1 ? "" : "es"} under 50% full today`,
              subtitle: underBooked.map((c) => `${c.name} (${c.time})`).join(" · "),
              cta: "View schedule",
              route: "/schedule",
            },
          ]
        : []),
      ...(waitlistTotal > 0
        ? [
            {
              id: "a-waitlist",
              title: `${waitlistTotal} client${waitlistTotal === 1 ? "" : "s"} on waitlists today`,
              subtitle: waitlistedClasses.map((c) => `${c.name} (+${c.waitlist})`).join(" · "),
              cta: "Manage waitlists",
              route: "/schedule",
            },
          ]
        : []),
      ...(newMembers.length > 0
        ? [
            {
              id: "a3",
              title: `${newMembers.length} new member${newMembers.length === 1 ? "" : "s"} joined recently`,
              subtitle: "Review welcome messages and first bookings",
              cta: "Review queue",
              route: "/communications",
            },
          ]
        : []),
      {
        id: "a4",
        title: "Retention scoring runs hourly",
        subtitle: `Thresholds: at-risk after ${businessConfig.retention.daysUntilAtRisk}d · lapsed after ${businessConfig.retention.daysUntilLapsed}d`,
        cta: "Open settings",
        route: "/settings",
      },
    ];

    const activityFeed = buildActivityFeed({ bookings, members, messages, now });

    res.json({
      studio: {
        name: businessConfig.studioName,
        city: "",
        owner: "Studio Owner",
      },
      kpis,
      visitsTrend,
      todayClasses,
      actionItems,
      activityFeed,
    });
  } catch (error) {
    next(error);
  }
}
