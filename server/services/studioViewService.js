import businessConfig from "../config/businessConfig.js";
import Booking from "../models/Booking.js";
import { getEffectiveConfig } from "./configService.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import SyncLog from "../models/SyncLog.js";
import { enrichMember, groupBookingsByMember } from "./memberStats.js";
import { EXPORT_GUIDES } from "./importService.js";
import {
  attendanceByMonth,
  computeChannelQuality,
  computeClassDetail,
  computeCohortRetention,
  computeHomeKpiDeltas,
  computeInstructorReturnRate,
  computeRevPashTrend,
  computeSmsConversion,
  smsSummaryFromConversion,
} from "./metricsService.js";

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

const TEMPLATE_CATALOG = [
  { key: "reminder", name: "Class reminder", category: "Reminders" },
  { key: "atRisk", name: "At-risk check-in", category: "Retention" },
  { key: "winback", name: "Win-back", category: "Win-back" },
  { key: "milestone", name: "Visit milestone", category: "Lifecycle" },
  { key: "welcome", name: "Welcome", category: "Lifecycle" },
];

const MESSAGE_TYPE_LABELS = {
  reminder: "Class reminder",
  atRisk: "At-risk",
  winback: "Win-back",
  welcome: "Welcome",
  milestone: "Milestone",
};

function buildTemplateLibrary(smsTemplates) {
  return TEMPLATE_CATALOG.map(({ key, name, category }) => ({
    id: key,
    key,
    name,
    category,
    body: smsTemplates[key] ?? "",
  }));
}

function outreachTemplateForClient(client, smsTemplates) {
  const key = client.status === "At-Risk" ? "atRisk" : "winback";
  const meta = TEMPLATE_CATALOG.find((t) => t.key === key) ?? TEMPLATE_CATALOG[1];
  return { id: key, key, name: meta.name, body: smsTemplates[key] ?? "" };
}

function formatTime(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function localDateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

async function loadCoreData(ownerUid) {
  const filter = { ownerUid };
  const [members, bookings, classes, messages] = await Promise.all([
    Member.find(filter),
    Booking.find(filter)
      .populate("memberId", "name")
      .populate("classId", "name instructor time dayOfWeek category capacity"),
    Class.find(filter),
    Message.find(filter).populate("memberId", "name").sort({ sentAt: -1 }),
  ]);

  const classIndex = {};
  for (const c of classes) classIndex[String(c._id)] = c;

  const byMember = groupBookingsByMember(bookings);
  return { members, bookings, classes, messages, classIndex, byMember };
}

export async function getStudioMeta(ownerUid) {
  const config = await getEffectiveConfig(ownerUid);
  return {
    name: config.studioName,
    city: config.city,
    owner: config.studioOwner ?? "Studio Owner",
  };
}

export async function getHomePage(ownerUid) {
  const now = Date.now();
  const todayKey = localDateKey();
  const todayDow = DAY_NAMES[new Date().getDay()];
  const { members, bookings, classes, messages, byMember } = await loadCoreData(ownerUid);

  const atRiskMembers = members.filter((m) => m.status === "at-risk");
  const kpis = computeHomeKpiDeltas(members, bookings, byMember);

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
        localDateKey(b.bookedAt) === todayKey
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

  const todayBookedSeats = todayClasses.reduce((s, c) => s + c.booked, 0);
  const todaySummary = {
    classCount: todayClasses.length,
    bookedSeats: todayBookedSeats,
  };

  return {
    studio: await getStudioMeta(ownerUid),
    kpis,
    visitsTrend,
    todayClasses,
    todaySummary,
    actionItems,
    activityFeed,
  };
}

export async function getClientsPage(ownerUid) {
  const { members, bookings, classIndex, byMember, messages } = await loadCoreData(ownerUid);

  const messagesByMember = {};
  for (const msg of messages) {
    const mid = String(msg.memberId?._id ?? msg.memberId);
    if (!messagesByMember[mid]) messagesByMember[mid] = [];
    messagesByMember[mid].push(msg);
  }

  const clients = members.map((m) => {
    const memberBookings = byMember[String(m._id)] ?? [];
    const enriched = enrichMember(m, memberBookings);
    const base = toClient(m, enriched, classIndex, memberBookings);
    const recentMessages = (messagesByMember[String(m._id)] ?? [])
      .slice(0, 5)
      .map((msg) => ({
        id: String(msg._id),
        out: true,
        body: msg.body,
        time: relativeTime(msg.sentAt),
      }));
    return {
      ...base,
      attendanceMonthly: attendanceByMonth(memberBookings),
      recentMessages,
    };
  });

  const counts = {
    New: clients.filter((c) => c.status === "New").length,
    Regular: clients.filter((c) => c.status === "Regular").length,
    "At-Risk": clients.filter((c) => c.status === "At-Risk").length,
    Lapsed: clients.filter((c) => c.status === "Lapsed").length,
    "Win-back": clients.filter((c) => c.status === "Win-back").length,
  };

  const cohorts = computeCohortRetention(members, bookings);

  return { clients, counts, cohorts };
}

export async function getAnalyticsPage(ownerUid) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;
  const { members, bookings, classes, messages } = await loadCoreData(ownerUid);
  const milestoneVisits = businessConfig.milestoneVisits ?? 4;

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

  const returnRates = computeInstructorReturnRate(bookings, classes);
  const instructors = Object.entries(instructorMap).map(([name, s], i) => {
    const stats = returnRates[name] ?? { returnRate: 0, uniqueClients: 0 };
    return {
      id: `i${i + 1}`,
      name,
      specialty: s.specialty,
      fillRate: s.count > 0 ? Math.round((s.totalFill / s.count) * 100) / 100 : 0,
      retention: stats.returnRate,
      uniqueClients: stats.uniqueClients,
      classes30d: s.classes30d,
    };
  });

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

  const { revpashTrend, currentRevpash, revpashDeltaPct } = computeRevPashTrend(
    bookings,
    classes,
    members,
    now
  );

  const classDetails = {};
  for (const { name } of classTypes) {
    classDetails[name] = computeClassDetail(name, bookings, classes, members);
  }

  const channelQuality = computeChannelQuality(members, bookings, { milestoneVisits });
  const smsConversion = computeSmsConversion(messages, bookings);

  return {
    days: DAY_SHORT,
    slots: SLOTS,
    scheduleHeatmap,
    classTypes,
    classTrend,
    classDetails,
    instructors,
    revenueMix,
    revpashTrend,
    currentRevpash,
    revpashDeltaPct,
    channelQuality,
    smsConversion,
  };
}

export async function getCommunicationsPage(ownerUid) {
  const { members, bookings, classIndex, byMember, messages } = await loadCoreData(ownerUid);
  const { smsTemplates, retention } = await getEffectiveConfig(ownerUid);

  const clients = members.map((m) => {
    const memberBookings = byMember[String(m._id)] ?? [];
    const enriched = enrichMember(m, memberBookings);
    return toClient(m, enriched, classIndex, memberBookings);
  });

  const reminderRules = [
    { id: "r1", name: "24-hour SMS reminder", trigger: "24h before class", enabled: true, replies: "Reply C to cancel · Y to confirm" },
    { id: "r2", name: "2-hour SMS reminder", trigger: "2h before class", enabled: true, replies: "Reply C to cancel" },
    { id: "r3", name: "At-risk outreach", trigger: `${retention.daysUntilAtRisk}+ days inactive`, enabled: true, replies: "Automated via retention scoring" },
    { id: "r4", name: "Win-back outreach", trigger: `${retention.daysUntilLapsed}+ days lapsed`, enabled: true, replies: "Manual or scheduled send" },
  ];

  const reminderExamples = [
    { id: "ex1", body: smsTemplates.reminder.replace("{firstName}", "Member").replace("{className}", "Morning Flow").replace("{classTime}", "7:00 AM") },
    { id: "ex2", body: smsTemplates.atRisk.replace("{firstName}", "Member") },
    { id: "ex3", body: smsTemplates.winback.replace("{firstName}", "Member") },
  ];

  const outreachClients = clients
    .filter((c) => c.status === "At-Risk" || c.status === "Win-back" || c.status === "Lapsed")
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 8);

  const sendQueue = outreachClients.map((client, i) => ({
    id: `q${i}`,
    memberId: client.id,
    client,
    template: outreachTemplateForClient(client, smsTemplates),
  }));

  const messageLog = messages.slice(0, 50).map((m) => ({
    id: String(m._id),
    client: m.memberId?.name ?? "Unknown",
    template: MESSAGE_TYPE_LABELS[m.type] ?? m.templateUsed ?? m.type,
    type: m.type,
    sent: formatSentAt(m.sentAt),
    status: m.status,
    body: m.body,
  }));

  const smsConversion = computeSmsConversion(messages, bookings);
  const smsSummary = smsSummaryFromConversion(smsConversion);

  return {
    reminderRules,
    reminderExamples,
    templates: buildTemplateLibrary(smsTemplates),
    sendQueue,
    messageLog,
    smsSummary,
  };
}

export async function getSettingsPage(ownerUid) {
  const logFilter = { ownerUid };
  const lastImport = await SyncLog.findOne({ ...logFilter, type: "csv_import" }).sort({ ranAt: -1 });
  const lastMindbodyImport = await SyncLog.findOne({
    ...logFilter,
    type: "csv_import",
    "summary.source": "mindbody",
  }).sort({ ranAt: -1 });
  const lastAcuityImport = await SyncLog.findOne({
    ...logFilter,
    type: "csv_import",
    "summary.source": "acuity",
  }).sort({ ranAt: -1 });
  const config = await getEffectiveConfig(ownerUid);
  const studioMeta = await getStudioMeta(ownerUid);

  return {
    studio: {
      ...studioMeta,
      name: config.studioName,
      owner: config.studioOwner,
      city: config.city,
      smsSender: process.env.TWILIO_PHONE_NUMBER
        ?? (process.env.SMS_DRY_RUN === "true" ? "Demo mode (dry run)" : "Not configured"),
      replyToEmail: config.replyToEmail,
    },
    retention: config.retention,
    membershipTiers: config.membershipTiers,
    smsTemplates: config.smsTemplates,
    reminderRules: [
      { id: "r1", name: "24-hour SMS reminder", trigger: "24h before class", enabled: true, replies: "Reply C to cancel · Y to confirm" },
      { id: "r2", name: "2-hour SMS reminder", trigger: "2h before class", enabled: true, replies: "Reply C to cancel" },
      { id: "r3", name: "At-risk outreach", trigger: `${config.retention.daysUntilAtRisk}+ days inactive`, enabled: true, replies: "Automated via retention scoring" },
      { id: "r4", name: "Win-back outreach", trigger: `${config.retention.daysUntilLapsed}+ days lapsed`, enabled: true, replies: "Manual or scheduled send" },
    ],
    integrations: [
      {
        id: "mindbody",
        name: "Mindbody",
        desc: "Import via CSV export from Mindbody reports",
        connected: Boolean(lastMindbodyImport),
        lastSync: lastMindbodyImport ? relativeTime(lastMindbodyImport.ranAt) : null,
        importSource: "mindbody",
      },
      {
        id: "acuity",
        name: "Acuity Scheduling",
        desc: "Import via CSV export from Acuity",
        connected: Boolean(lastAcuityImport),
        lastSync: lastAcuityImport ? relativeTime(lastAcuityImport.ranAt) : null,
        importSource: "acuity",
      },
      {
        id: "twilio",
        name: "Twilio SMS",
        desc: process.env.SMS_DRY_RUN === "true" ? "Demo mode (SMS_DRY_RUN)" : "Reminders and retention outreach",
        connected: Boolean(process.env.TWILIO_ACCOUNT_SID) || process.env.SMS_DRY_RUN === "true",
        lastSync: process.env.TWILIO_ACCOUNT_SID ? "Configured" : process.env.SMS_DRY_RUN === "true" ? "Dry run" : null,
      },
    ],
    exportGuides: EXPORT_GUIDES,
    lastImport: lastImport
      ? { ranAt: lastImport.ranAt, summary: lastImport.summary }
      : null,
  };
}
