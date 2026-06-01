import businessConfig from "../config/businessConfig.js";
import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import SyncLog from "../models/SyncLog.js";
import { enrichMember, groupBookingsByMember } from "./memberStats.js";

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["6a", "7a", "8a", "9a", "10a", "12p", "4p", "5p", "6p", "7p", "8p"];

const STATUS_UI = {
  new: "New",
  regular: "Regular",
  "at-risk": "At-Risk",
  lapsed: "Lapsed",
};

const MEMBERSHIP_UI = {
  basic: "4-pack",
  premium: "8-pack",
  unlimited: "Unlimited",
};

const TIER_MRR = { basic: 79, premium: 129, unlimited: 189 };
const TIER_REV = { basic: 15, premium: 28, unlimited: 45 };

const CLASS_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)", "var(--chart-1)",
];

const SMS_TEMPLATES = [
  { id: "tpl1", name: "Welcome series — Day 1", category: "Lifecycle", replyRate: 0.42, bookingRate: 0.34, revenue: 1280, body: "Welcome to {studio}, {first_name}! Book your first class and let's get started." },
  { id: "tpl2", name: "4-visit milestone offer", category: "Conversion", replyRate: 0.51, bookingRate: 0.46, revenue: 4620, body: "{first_name}, you've made 4 visits — unlimited is 30% off this week if you want to keep the momentum." },
  { id: "tpl3", name: "At-risk check-in", category: "Retention", replyRate: 0.38, bookingRate: 0.27, revenue: 2140, body: "Hey {first_name} — haven't seen you since {last_class_date}. {favorite_instructor} is teaching this week if you want a soft re-entry." },
  { id: "tpl4", name: "Lapsed win-back (60d)", category: "Win-back", replyRate: 0.22, bookingRate: 0.14, revenue: 1860, body: "We miss you, {first_name}. Here's a free class on us — pick any class this month." },
  { id: "tpl5", name: "Birthday", category: "Lifecycle", replyRate: 0.61, bookingRate: 0.33, revenue: 720, body: "Happy birthday, {first_name}! Bring a friend free this week — our gift." },
  { id: "tpl6", name: "Referral thank-you", category: "Lifecycle", replyRate: 0.48, bookingRate: 0.29, revenue: 940, body: "Thanks for the referral, {first_name} — 1 free class added to your account." },
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

function formatSentAt(date) {
  const d = new Date(date);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function timeToSlot(time24) {
  const [hStr] = time24.split(":");
  const h = Number(hStr);
  if (h === 6) return "6a";
  if (h === 7) return "7a";
  if (h === 8) return "8a";
  if (h === 9) return "9a";
  if (h === 10) return "10a";
  if (h === 12) return "12p";
  if (h === 16) return "4p";
  if (h === 17) return "5p";
  if (h === 18) return "6p";
  if (h === 19) return "7p";
  if (h === 20) return "8p";
  return "10a";
}

function dayToShort(dayOfWeek) {
  const map = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun",
  };
  return map[dayOfWeek] ?? dayOfWeek;
}

function isWinBack(bookings, now = Date.now()) {
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
  );
  if (sorted.length < 2) return false;
  const latest = new Date(sorted[0].bookedAt).getTime();
  const prev = new Date(sorted[1].bookedAt).getTime();
  const daysSinceLatest = (now - latest) / 86_400_000;
  const gapDays = (latest - prev) / 86_400_000;
  return daysSinceLatest <= 30 && gapDays >= 21;
}

function favoriteInstructor(memberBookings, classIndex) {
  const counts = {};
  for (const b of memberBookings) {
    const cls = classIndex[String(b.classId?._id ?? b.classId)];
    if (cls?.instructor) {
      counts[cls.instructor] = (counts[cls.instructor] || 0) + 1;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? "—";
}

function toClient(member, enriched, classIndex, bookings) {
  const uiStatus = isWinBack(bookings)
    ? "Win-back"
    : STATUS_UI[member.status] ?? "Regular";
  const membership =
    member.status === "lapsed" && uiStatus !== "Win-back"
      ? "Lapsed"
      : MEMBERSHIP_UI[member.membershipType] ?? "Drop-in";

  return {
    id: String(member._id),
    name: member.name,
    email: member.email,
    status: uiStatus,
    joinDate: new Date(member.joinDate).toISOString().slice(0, 10),
    joinSource: member.joinSource ?? "Walk-in",
    membership,
    ltv: enriched.ltv,
    visits90: enriched.visits90,
    daysSinceLast: enriched.daysSinceLast,
    favoriteInstructor: favoriteInstructor(bookings, classIndex),
    reason: enriched.reason,
    tags: member.tags ?? [],
    notes: member.notes ?? "",
  };
}

async function loadCoreData() {
  const [members, bookings, classes, messages] = await Promise.all([
    Member.find(),
    Booking.find().populate("memberId", "name").populate("classId", "name instructor time dayOfWeek category capacity"),
    Class.find(),
    Message.find().populate("memberId", "name").sort({ sentAt: -1 }),
  ]);

  const classIndex = {};
  for (const c of classes) classIndex[String(c._id)] = c;

  const byMember = groupBookingsByMember(bookings);
  return { members, bookings, classes, messages, classIndex, byMember };
}

export async function getStudioMeta() {
  return {
    name: businessConfig.studioName,
    city: "Encinitas, CA",
    owner: businessConfig.studioOwner ?? "Studio Owner",
  };
}

export async function getHomePage() {
  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDow = DAY_NAMES[new Date().getDay()];
  const { members, bookings, classes, messages, byMember } = await loadCoreData();

  const activeMembers = members.filter((m) => m.isActive).length;
  const atRiskMembers = members.filter((m) => m.status === "at-risk");
  const attendedCount = bookings.filter((b) => b.attended).length;
  const attendanceRate = bookings.length
    ? Math.round((attendedCount / bookings.length) * 100)
    : 0;
  const churnRate = members.length
    ? Math.round((members.filter((m) => m.status === "lapsed").length / members.length) * 1000) / 10
    : 0;
  const mrr = members
    .filter((m) => m.isActive && m.status !== "lapsed")
    .reduce((sum, m) => sum + (TIER_MRR[m.membershipType] || 0), 0);

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
  const visitsTrend = Object.entries(dateMap).map(([_, counts], i) => ({
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

  const underBooked = todayClasses.filter((c) => c.capacity > 0 && c.booked / c.capacity < 0.5);
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
      ? [{
          id: "a2",
          title: `${underBooked.length} classes under 50% full today`,
          subtitle: underBooked.map((c) => c.name).join(", "),
          cta: "View schedule",
          route: "/analytics",
        }]
      : []),
    ...(newMembers.length
      ? [{
          id: "a3",
          title: `${newMembers.length} new members joined recently`,
          subtitle: "Review welcome messages and first bookings",
          cta: "Review queue",
          route: "/communications",
        }]
      : []),
    {
      id: "a4",
      title: "Import booking data via CSV",
      subtitle: "Upload members, classes, and bookings from your booking system",
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
      text: `New signup: ${m.name}${m.joinSource ? ` — ${m.joinSource}` : ""}`,
      time: relativeTime(m.joinDate),
    }));

  const recentMessages = messages.slice(0, 4).map((m) => ({
    id: String(m._id),
    type: "reply",
    text: `Outreach sent to ${m.memberId?.name ?? "member"} (${m.type})`,
    time: relativeTime(m.sentAt),
  }));

  const activityFeed = [...recentBookings, ...recentSignups, ...recentMessages].slice(0, 9);

  return {
    studio: await getStudioMeta(),
    kpis,
    visitsTrend,
    todayClasses,
    actionItems,
    activityFeed,
  };
}

export async function getClientsPage() {
  const { members, bookings, classIndex, byMember } = await loadCoreData();

  const clients = members.map((m) => {
    const memberBookings = byMember[String(m._id)] ?? [];
    const enriched = enrichMember(m, memberBookings);
    return toClient(m, enriched, classIndex, memberBookings);
  });

  const counts = {
    New: clients.filter((c) => c.status === "New").length,
    Regular: clients.filter((c) => c.status === "Regular").length,
    "At-Risk": clients.filter((c) => c.status === "At-Risk").length,
    Lapsed: clients.filter((c) => c.status === "Lapsed").length,
    "Win-back": clients.filter((c) => c.status === "Win-back").length,
  };

  const cohortMap = {};
  for (const m of members) {
    const d = new Date(m.joinDate);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
    if (!cohortMap[key]) cohortMap[key] = { size: 0, active: 0, monthDate: d };
    cohortMap[key].size++;
    if (m.status === "new" || m.status === "regular") cohortMap[key].active++;
  }

  const cohorts = Object.entries(cohortMap)
    .sort((a, b) => a[1].monthDate - b[1].monthDate)
    .slice(-12)
    .map(([month, { size, active }]) => ({
      month,
      size,
      m1: size > 0 ? Math.round((active / size) * 100) : 0,
      m3: size > 0 ? Math.round((active / size) * 85) : null,
      m6: size > 0 ? Math.round((active / size) * 70) : null,
      m12: null,
    }));

  return { clients, counts, cohorts };
}

export async function getAnalyticsPage() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;
  const { members, bookings, classes } = await loadCoreData();

  const classIndex = {};
  for (const c of classes) classIndex[String(c._id)] = c;

  const recentBookings = bookings.filter(
    (b) => new Date(b.bookedAt).getTime() >= thirtyDaysAgo
  );

  const heatmapData = {};
  for (const day of DAY_SHORT) {
    heatmapData[day] = {};
    for (const slot of SLOTS) heatmapData[day][slot] = { booked: 0, capacity: 0 };
  }

  for (const c of classes) {
    const day = dayToShort(c.dayOfWeek);
    const slot = timeToSlot(c.time);
    if (heatmapData[day]?.[slot]) {
      heatmapData[day][slot].capacity += c.capacity;
    }
  }

  for (const b of recentBookings) {
    const cls = classIndex[String(b.classId?._id ?? b.classId)];
    if (!cls) continue;
    const day = dayToShort(cls.dayOfWeek);
    const slot = timeToSlot(cls.time);
    if (heatmapData[day]?.[slot]) heatmapData[day][slot].booked++;
  }

  const scheduleHeatmap = DAY_SHORT.map((day) => ({
    day,
    cells: SLOTS.map((slot) => {
      const cell = heatmapData[day][slot];
      const fill = cell.capacity > 0 ? cell.booked / cell.capacity : 0;
      return { slot, fill: Math.min(0.99, Math.max(0, fill)) };
    }),
  }));

  const classTypes = [...new Set(classes.map((c) => c.name))].slice(0, 6).map((name, i) => ({
    name,
    color: CLASS_COLORS[i % CLASS_COLORS.length],
  }));

  const classTrend = Array.from({ length: 12 }, (_, i) => {
    const weekStart = now - (11 - i) * 7 * 86_400_000;
    const weekEnd = weekStart + 7 * 86_400_000;
    const weekBookings = bookings.filter((b) => {
      const t = new Date(b.bookedAt).getTime();
      return t >= weekStart && t < weekEnd;
    });
    return {
      wk: `W${i + 1}`,
      attended: weekBookings.filter((b) => b.attended).length,
      capacity: classes.reduce((s, c) => s + c.capacity, 0),
      noShow: weekBookings.filter((b) => !b.attended).length,
    };
  });

  const instructorMap = {};
  for (const c of classes) {
    if (!instructorMap[c.instructor]) {
      instructorMap[c.instructor] = { specialty: c.category, fillRate: 0, retention: 0, classes30d: 0, totalFill: 0, count: 0 };
    }
    const inst = instructorMap[c.instructor];
    const classBookings = recentBookings.filter(
      (b) => String(b.classId?._id ?? b.classId) === String(c._id)
    );
    inst.classes30d++;
    inst.count++;
    inst.totalFill += c.capacity > 0 ? classBookings.length / c.capacity : 0;
  }

  const instructors = Object.entries(instructorMap).map(([name, s], i) => ({
    id: `i${i + 1}`,
    name,
    specialty: s.specialty,
    fillRate: s.count > 0 ? Math.round((s.totalFill / s.count) * 100) / 100 : 0,
    retention: 0.7 + (i % 3) * 0.05,
    classes30d: s.classes30d,
  }));

  const tierCounts = { basic: 0, premium: 0, unlimited: 0 };
  for (const m of members.filter((m) => m.isActive)) {
    tierCounts[m.membershipType] = (tierCounts[m.membershipType] || 0) + 1;
  }
  const revenueMix = [
    { name: "Unlimited", value: tierCounts.unlimited * TIER_MRR.unlimited },
    { name: "8-pack", value: tierCounts.premium * TIER_MRR.premium },
    { name: "4-pack", value: tierCounts.basic * TIER_MRR.basic },
    { name: "Drop-ins", value: Math.round(recentBookings.length * 22) },
  ].filter((r) => r.value > 0);

  const revpashTrend = classTrend.map((w) => ({
    wk: w.wk,
    revpash: +(8 + w.attended * 0.05).toFixed(2),
  }));

  const channelMap = {};
  for (const m of members) {
    const ch = m.joinSource ?? "Walk-in";
    if (!channelMap[ch]) channelMap[ch] = { count: 0, ltv: 0 };
    channelMap[ch].count++;
    const memberBookings = bookings.filter((b) => String(b.memberId?._id ?? b.memberId) === String(m._id));
    const attended = memberBookings.filter((b) => b.attended).length;
    channelMap[ch].ltv += attended * (TIER_REV[m.membershipType] || 20);
  }

  const cacMap = { Referral: 0, Instagram: 38, "Walk-in": 12, Groupon: 22 };
  const channelLtv = Object.entries(channelMap).map(([channel, { count, ltv }]) => ({
    channel,
    cac: cacMap[channel] ?? 15,
    ltv: count > 0 ? Math.round(ltv / count) : 0,
    count,
  }));

  return {
    days: DAY_SHORT,
    slots: SLOTS,
    scheduleHeatmap,
    classTypes,
    classTrend,
    instructors,
    revenueMix,
    revpashTrend,
    channelLtv,
  };
}

export async function getCommunicationsPage() {
  const { members, bookings, classIndex, byMember, messages } = await loadCoreData();

  const clients = members.map((m) => {
    const memberBookings = byMember[String(m._id)] ?? [];
    const enriched = enrichMember(m, memberBookings);
    return toClient(m, enriched, classIndex, memberBookings);
  });

  const reminderRules = [
    { id: "r1", name: "24-hour SMS reminder", trigger: "24h before class", enabled: true, replies: "Reply C to cancel · Y to confirm" },
    { id: "r2", name: "2-hour SMS reminder", trigger: "2h before class", enabled: true, replies: "Reply C to cancel" },
    { id: "r3", name: "At-risk outreach", trigger: `${businessConfig.retention.daysUntilAtRisk}+ days inactive`, enabled: true, replies: "Automated via retention scoring" },
    { id: "r4", name: "Win-back outreach", trigger: `${businessConfig.retention.daysUntilLapsed}+ days lapsed`, enabled: true, replies: "Manual or scheduled send" },
  ];

  const reminderExamples = [
    { id: "ex1", body: businessConfig.smsTemplates.reminder.replace("{firstName}", "Member").replace("{className}", "Morning Flow").replace("{classTime}", "7:00 AM") },
    { id: "ex2", body: businessConfig.smsTemplates.atRisk.replace("{firstName}", "Member") },
    { id: "ex3", body: businessConfig.smsTemplates.winback.replace("{firstName}", "Member") },
  ];

  const outreachClients = clients
    .filter((c) => c.status === "At-Risk" || c.status === "Win-back" || c.status === "Lapsed")
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 8);

  const sendQueue = outreachClients.map((client, i) => ({
    id: `q${i}`,
    memberId: client.id,
    client,
    template:
      client.status === "At-Risk" ? SMS_TEMPLATES[2] :
      client.status === "Win-back" || client.status === "Lapsed" ? SMS_TEMPLATES[3] :
      SMS_TEMPLATES[0],
  }));

  const messageLog = messages.slice(0, 20).map((m) => ({
    id: String(m._id),
    client: m.memberId?.name ?? "Unknown",
    template: m.templateUsed ?? m.type,
    sent: formatSentAt(m.sentAt),
    reply: m.status === "sent" ? "—" : m.status,
    booked: "—",
    revenue: 0,
  }));

  return {
    reminderRules,
    reminderExamples,
    templates: SMS_TEMPLATES,
    sendQueue,
    messageLog,
  };
}

export async function getSettingsPage() {
  const lastImport = await SyncLog.findOne({ type: "csv_import" }).sort({ ranAt: -1 });

  return {
    studio: {
      ...(await getStudioMeta()),
      smsSender: process.env.TWILIO_PHONE_NUMBER
        ?? (process.env.SMS_DRY_RUN === "true" ? "Demo mode (dry run)" : "Not configured"),
      replyToEmail: "hi@tether.studio",
    },
    retention: businessConfig.retention,
    membershipTiers: businessConfig.membershipTiers,
    smsTemplates: businessConfig.smsTemplates,
    reminderRules: [
      { id: "r1", name: "24-hour SMS reminder", trigger: "24h before class", enabled: true, replies: "Reply C to cancel · Y to confirm" },
      { id: "r2", name: "2-hour SMS reminder", trigger: "2h before class", enabled: true, replies: "Reply C to cancel" },
      { id: "r3", name: "At-risk outreach", trigger: `${businessConfig.retention.daysUntilAtRisk}+ days inactive`, enabled: true, replies: "Automated via retention scoring" },
      { id: "r4", name: "Win-back outreach", trigger: `${businessConfig.retention.daysUntilLapsed}+ days lapsed`, enabled: true, replies: "Manual or scheduled send" },
    ],
    integrations: [
      {
        id: "csv",
        name: "CSV Import",
        desc: "Upload members, classes, and bookings from any booking system",
        connected: true,
        lastSync: lastImport ? relativeTime(lastImport.ranAt) : null,
      },
      {
        id: "mongodb",
        name: "MongoDB",
        desc: "Members, classes, bookings, messages",
        connected: true,
        lastSync: "Live",
      },
      {
        id: "twilio",
        name: "Twilio SMS",
        desc: process.env.SMS_DRY_RUN === "true" ? "Demo mode (SMS_DRY_RUN)" : "Reminders and retention outreach",
        connected: Boolean(process.env.TWILIO_ACCOUNT_SID) || process.env.SMS_DRY_RUN === "true",
        lastSync: process.env.TWILIO_ACCOUNT_SID ? "Configured" : process.env.SMS_DRY_RUN === "true" ? "Dry run" : null,
      },
      {
        id: "mindbody",
        name: "Mindbody",
        desc: "API sync — coming soon",
        connected: false,
        lastSync: null,
      },
      {
        id: "acuity",
        name: "Acuity Scheduling",
        desc: "API sync — coming soon",
        connected: false,
        lastSync: null,
      },
    ],
    lastImport: lastImport
      ? { ranAt: lastImport.ranAt, summary: lastImport.summary }
      : null,
  };
}
