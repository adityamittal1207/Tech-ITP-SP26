import businessConfig from "../config/businessConfig.js";
import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import { enrichMember, groupBookingsByMember } from "../services/memberStats.js";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

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

export async function getHomeDashboard(_req, res, next) {
  try {
    const now = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayDow = DAY_NAMES[new Date().getDay()];

    const [members, bookings, classes, messages] = await Promise.all([
      Member.find(),
      Booking.find().populate("memberId", "name").populate("classId", "name instructor"),
      Class.find(),
      Message.find().populate("memberId", "name").sort({ sentAt: -1 }).limit(10),
    ]);

    const byMember = groupBookingsByMember(bookings);
    const activeMembers = members.filter((m) => m.isActive).length;
    const atRiskMembers = members.filter((m) => m.status === "at-risk");
    const attendedCount = bookings.filter((b) => b.attended).length;
    const noShowCount = bookings.filter((b) => !b.attended).length;
    const attendanceRate = bookings.length
      ? Math.round((attendedCount / bookings.length) * 100)
      : 0;
    const churnRate = members.length
      ? Math.round((members.filter((m) => m.status === "lapsed").length / members.length) * 1000) / 10
      : 0;

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

    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
      dateMap[key] = { visits: 0, noShows: 0 };
    }
    for (const b of bookings) {
      const key = new Date(b.bookedAt).toISOString().slice(0, 10);
      if (key in dateMap) {
        if (b.attended) dateMap[key].visits++;
        else dateMap[key].noShows++;
      }
    }
    const visitsTrend = Object.entries(dateMap).map(([date, counts], i) => ({
      d: `D${i + 1}`,
      visits: counts.visits,
      noShows: counts.noShows,
    }));

    const todayClassesRaw = classes.filter((c) => c.dayOfWeek === todayDow);
    const todayClasses = todayClassesRaw.map((c) => {
      const classBookings = bookings.filter(
        (b) =>
          String(b.classId?._id ?? b.classId) === String(c._id) &&
          new Date(b.bookedAt).toISOString().slice(0, 10) === todayKey
      );
      const booked = classBookings.length;
      return {
        id: String(c._id),
        name: c.name,
        time: formatTime(c.time),
        instructor: c.instructor,
        booked,
        capacity: c.capacity,
        waitlist: Math.max(0, booked - c.capacity),
      };
    });

    const underBooked = todayClasses.filter((c) => c.booked / c.capacity < 0.5);
    const newMembers = members.filter((m) => m.status === "new");

    const actionItems = [
      {
        id: "a1",
        title: `${atRiskMembers.length} at-risk clients need outreach this week`,
        subtitle: "Sorted by engagement — highest value first",
        cta: "Open at-risk list",
        route: "/clients",
      },
      ...(underBooked.length
        ? [
            {
              id: "a2",
              title: `${underBooked.length} classes under 50% full today`,
              subtitle: underBooked.map((c) => c.name).join(", "),
              cta: "View schedule",
              route: "/analytics",
            },
          ]
        : []),
      ...(newMembers.length
        ? [
            {
              id: "a3",
              title: `${newMembers.length} new members joined recently`,
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

    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt))
      .slice(0, 6)
      .map((b) => ({
        id: String(b._id),
        type: b.attended ? "booking" : "cancel",
        text: b.attended
          ? `${b.memberId?.name ?? "Member"} booked ${b.classId?.name ?? "a class"}`
          : `${b.memberId?.name ?? "Member"} missed ${b.classId?.name ?? "a class"}`,
        time: relativeTime(b.bookedAt),
      }));

    const recentSignups = members
      .filter((m) => (now - new Date(m.joinDate).getTime()) / 86_400_000 <= 7)
      .slice(0, 3)
      .map((m) => ({
        id: String(m._id),
        type: "signup",
        text: `New signup: ${m.name}`,
        time: relativeTime(m.joinDate),
      }));

    const recentMessages = messages.slice(0, 4).map((m) => ({
      id: String(m._id),
      type: "reply",
      text: `Outreach sent to ${m.memberId?.name ?? "member"} (${m.type})`,
      time: relativeTime(m.sentAt),
    }));

    const activityFeed = [...recentBookings, ...recentSignups, ...recentMessages]
      .sort((a, b) => 0)
      .slice(0, 9);

    res.json({
      studio: {
        name: businessConfig.studioName,
        city: "Encinitas, CA",
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
