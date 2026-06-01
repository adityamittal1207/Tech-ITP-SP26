const JOIN_SOURCE_MAP = {
  Instagram: "instagram",
  Groupon: "groupon",
  Referral: "referral",
  "Walk-in": "walk-in",
};

const CHANNEL_LABELS = {
  instagram: "Instagram",
  groupon: "Groupon",
  referral: "Referral",
  "walk-in": "Walk-in",
  google: "Google",
  event: "Event",
  website: "Website",
  mindbody: "Mindbody",
  acuity: "Acuity",
  native: "Native",
};

const OUTREACH_TYPES = new Set(["atRisk", "winback", "welcome"]);
const MS_PER_DAY = 86_400_000;

const TIER_MRR = { basic: 79, premium: 129, unlimited: 189 };
const TIER_REV = { basic: 15, premium: 28, unlimited: 45 };

export function percentDelta(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function getMemberChannel(member) {
  if (member.source) return member.source;
  if (member.joinSource && JOIN_SOURCE_MAP[member.joinSource]) {
    return JOIN_SOURCE_MAP[member.joinSource];
  }
  return "walk-in";
}

export function formatChannelLabel(key) {
  return CHANNEL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function memberIdStr(booking) {
  return String(booking.memberId?._id ?? booking.memberId);
}

function classIdStr(booking) {
  return String(booking.classId?._id ?? booking.classId);
}

function attendedInWindow(bookings, memberId, startMs, endMs) {
  return bookings.filter(
    (b) =>
      memberIdStr(b) === memberId &&
      b.attended &&
      new Date(b.bookedAt).getTime() > startMs &&
      new Date(b.bookedAt).getTime() <= endMs
  );
}

export function computeChannelQuality(members, bookings, options = {}) {
  const { milestoneVisits = 4, lookbackDays = 90 } = options;
  const lookbackMs = lookbackDays * MS_PER_DAY;

  const channelMembers = {};
  for (const m of members) {
    const ch = getMemberChannel(m);
    if (!channelMembers[ch]) channelMembers[ch] = [];
    channelMembers[ch].push(m);
  }

  const rows = Object.entries(channelMembers).map(([channel, group]) => {
    let retained = 0;
    let totalVisits90d = 0;
    let milestoneHits = 0;

    for (const m of group) {
      if (m.status === "new" || m.status === "regular") retained++;

      const joinMs = new Date(m.joinDate).getTime();
      const windowEnd = joinMs + lookbackMs;
      const memberBookings = bookings.filter((b) => memberIdStr(b) === String(m._id));
      const visits90d = memberBookings.filter(
        (b) =>
          b.attended &&
          new Date(b.bookedAt).getTime() >= joinMs &&
          new Date(b.bookedAt).getTime() <= windowEnd
      ).length;
      totalVisits90d += visits90d;
      if (visits90d >= milestoneVisits) milestoneHits++;
    }

    const count = group.length;
    return {
      channel: formatChannelLabel(channel),
      channelKey: channel,
      count,
      retentionRate: count > 0 ? Math.round((retained / count) * 100) : 0,
      avgVisits90d: count > 0 ? Math.round((totalVisits90d / count) * 10) / 10 : 0,
      milestoneRate: count > 0 ? Math.round((milestoneHits / count) * 100) : 0,
    };
  });

  const studioRetention =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.retentionRate * r.count, 0) /
        rows.reduce((s, r) => s + r.count, 0)
      : 0;
  const studioAvgVisits =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.avgVisits90d * r.count, 0) /
        rows.reduce((s, r) => s + r.count, 0)
      : 0;

  const withHealth = rows.map((row) => {
    let health;
    if (row.count < 5) {
      health = "promising";
    } else if (
      row.retentionRate >= studioRetention &&
      row.avgVisits90d >= studioAvgVisits
    ) {
      health = "strong";
    } else if (row.retentionRate < studioRetention * 0.8 && row.count >= 10) {
      health = "weak";
    } else {
      health = "moderate";
    }
    return { ...row, health };
  });

  return withHealth.sort((a, b) => b.count - a.count);
}

export function computeInstructorReturnRate(bookings, classes, options = {}) {
  const { windowDays = 30 } = options;
  const now = Date.now();
  const windowStart = now - windowDays * MS_PER_DAY;
  const returnWindowMs = windowDays * MS_PER_DAY;

  const classInstructor = {};
  for (const c of classes) {
    classInstructor[String(c._id)] = c.instructor;
  }

  const attendedRecent = bookings.filter(
    (b) => b.attended && new Date(b.bookedAt).getTime() >= windowStart
  );

  const instructorClients = {};
  for (const b of attendedRecent) {
    const instructor = classInstructor[classIdStr(b)];
    if (!instructor) continue;
    const mid = memberIdStr(b);
    const visitMs = new Date(b.bookedAt).getTime();
    if (!instructorClients[instructor]) instructorClients[instructor] = {};
    const existing = instructorClients[instructor][mid];
    if (!existing || visitMs > existing) {
      instructorClients[instructor][mid] = visitMs;
    }
  }

  const rates = {};
  for (const [instructor, clients] of Object.entries(instructorClients)) {
    const entries = Object.entries(clients);
    let returned = 0;
    for (const [mid, visitMs] of entries) {
      const followUps = attendedInWindow(
        bookings,
        mid,
        visitMs,
        visitMs + returnWindowMs
      );
      if (followUps.length > 0) returned++;
    }
    rates[instructor] = {
      returnRate: entries.length > 0 ? Math.round((returned / entries.length) * 100) / 100 : 0,
      uniqueClients: entries.length,
    };
  }

  return rates;
}

export function computeSmsConversion(messages, bookings, options = {}) {
  const { conversionWindowDays = 7, periodDays = 30 } = options;
  const now = Date.now();
  const periodStart = now - periodDays * MS_PER_DAY;
  const conversionMs = conversionWindowDays * MS_PER_DAY;

  const recentMessages = messages.filter(
    (m) => m.status !== "failed" && new Date(m.sentAt).getTime() >= periodStart
  );

  const byTypeMap = {};
  for (const type of ["atRisk", "winback", "welcome", "reminder", "milestone"]) {
    byTypeMap[type] = { type, sent: 0, converted: 0, visitsRecovered: 0 };
  }

  let totalSent = 0;
  let totalConverted = 0;
  let totalVisitsRecovered = 0;

  for (const msg of recentMessages) {
    const type = msg.type;
    if (!byTypeMap[type]) byTypeMap[type] = { type, sent: 0, converted: 0, visitsRecovered: 0 };

    byTypeMap[type].sent++;
    totalSent++;

    if (!OUTREACH_TYPES.has(type)) continue;

    const sentMs = new Date(msg.sentAt).getTime();
    const mid = String(msg.memberId?._id ?? msg.memberId);
    const recovered = attendedInWindow(bookings, mid, sentMs, sentMs + conversionMs);

    if (recovered.length > 0) {
      byTypeMap[type].converted++;
      totalConverted++;
    }
    byTypeMap[type].visitsRecovered += recovered.length;
    totalVisitsRecovered += recovered.length;
  }

  const byType = Object.values(byTypeMap)
    .filter((row) => row.sent > 0 || OUTREACH_TYPES.has(row.type))
    .map((row) => ({
      ...row,
      conversionRate: row.sent > 0 ? Math.round((row.converted / row.sent) * 100) : 0,
    }));

  const recentBookings = bookings.filter(
    (b) => new Date(b.bookedAt).getTime() >= periodStart
  );

  function noShowStats(subset) {
    if (subset.length === 0) return { bookings: 0, noShowRate: 0 };
    const noShows = subset.filter((b) => !b.attended).length;
    return {
      bookings: subset.length,
      noShowRate: Math.round((noShows / subset.length) * 100),
    };
  }

  const withReminder = recentBookings.filter((b) => b.reminderSent);
  const withoutReminder = recentBookings.filter((b) => !b.reminderSent);

  return {
    periodDays,
    conversionWindowDays,
    byType,
    reminderImpact: {
      withReminder: noShowStats(withReminder),
      withoutReminder: noShowStats(withoutReminder),
    },
    totals: {
      sent: totalSent,
      converted: totalConverted,
      visitsRecovered: totalVisitsRecovered,
      conversionRate: totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0,
    },
  };
}

function uniqueAttendedMembers(bookings, startMs, endMs) {
  const ids = new Set();
  for (const b of bookings) {
    const t = new Date(b.bookedAt).getTime();
    if (t >= startMs && t < endMs && b.attended) ids.add(memberIdStr(b));
  }
  return ids;
}

function fillRateInWindow(bookings, startMs, endMs) {
  const subset = bookings.filter((b) => {
    const t = new Date(b.bookedAt).getTime();
    return t >= startMs && t < endMs;
  });
  if (!subset.length) return 0;
  return Math.round((subset.filter((b) => b.attended).length / subset.length) * 100);
}

function mrrForEngaged(members, memberIds) {
  return members
    .filter((m) => memberIds.has(String(m._id)) && m.isActive)
    .reduce((sum, m) => sum + (TIER_MRR[m.membershipType] || 0), 0);
}

function churnProxyPct(members, bookings, byMember, asOfMs) {
  if (!members.length) return 0;
  let lapsedLike = 0;
  for (const m of members) {
    const bks = (byMember[String(m._id)] ?? []).filter((b) => b.attended);
    const last = bks.reduce((max, b) => {
      const t = new Date(b.bookedAt).getTime();
      return t <= asOfMs && t > max ? t : max;
    }, 0);
    const daysSince = last ? (asOfMs - last) / MS_PER_DAY : 999;
    if (daysSince >= 21) lapsedLike++;
  }
  return Math.round((lapsedLike / members.length) * 1000) / 10;
}

function fourVisitConversionPct(members, byMember, joinStartMs, joinEndMs) {
  const cohort = members.filter((m) => {
    const j = new Date(m.joinDate).getTime();
    return j >= joinStartMs && j < joinEndMs;
  });
  if (!cohort.length) return 0;
  const reached = cohort.filter(
    (m) => (byMember[String(m._id)] ?? []).filter((b) => b.attended).length >= 4
  );
  return Math.round((reached.length / cohort.length) * 100);
}

export function computeHomeKpiDeltas(members, bookings, byMember) {
  const now = Date.now();
  const curStart = now - 30 * MS_PER_DAY;
  const prevStart = now - 60 * MS_PER_DAY;

  const curEngaged = uniqueAttendedMembers(bookings, curStart, now);
  const prevEngaged = uniqueAttendedMembers(bookings, prevStart, curStart);

  const activeMembers = members.filter((m) => m.isActive).length;
  const mrr = members
    .filter((m) => m.isActive && m.status !== "lapsed")
    .reduce((sum, m) => sum + (TIER_MRR[m.membershipType] || 0), 0);
  const attendanceRate = bookings.length
    ? Math.round((bookings.filter((b) => b.attended).length / bookings.length) * 100)
    : 0;
  const churnRate = members.length
    ? Math.round((members.filter((m) => m.status === "lapsed").length / members.length) * 1000) / 10
    : 0;
  const fourVisit = members.length
    ? Math.round(
        (members.filter((m) => (byMember[String(m._id)]?.length ?? 0) >= 4).length /
          members.length) *
          100
      )
    : 0;

  return [
    {
      label: "Active Clients",
      value: activeMembers,
      delta: percentDelta(curEngaged.size, prevEngaged.size),
      unit: "",
    },
    {
      label: "MRR",
      value: mrr,
      delta: percentDelta(mrrForEngaged(members, curEngaged), mrrForEngaged(members, prevEngaged)),
      unit: "$",
    },
    {
      label: "Fill Rate",
      value: attendanceRate,
      delta: percentDelta(fillRateInWindow(bookings, curStart, now), fillRateInWindow(bookings, prevStart, curStart)),
      unit: "%",
    },
    {
      label: "Churn Rate",
      value: churnRate,
      delta: percentDelta(churnRate, churnProxyPct(members, bookings, byMember, curStart)),
      unit: "%",
      invert: true,
    },
    {
      label: "4-Visit Conversion",
      value: fourVisit,
      delta: percentDelta(
        fourVisitConversionPct(members, byMember, curStart, now),
        fourVisitConversionPct(members, byMember, prevStart, curStart)
      ),
      unit: "%",
    },
  ];
}

export function computeCohortRetention(members, bookings) {
  const cohortMap = {};
  for (const m of members) {
    const d = new Date(m.joinDate);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
    if (!cohortMap[key]) cohortMap[key] = { members: [], monthDate: d };
    cohortMap[key].members.push(m);
  }

  const retentionRate = (cohort, days) => {
    if (!cohort.length) return 0;
    let retained = 0;
    for (const m of cohort) {
      const join = new Date(m.joinDate).getTime();
      if (attendedInWindow(bookings, String(m._id), join, join + days * MS_PER_DAY).length > 0) {
        retained++;
      }
    }
    return Math.round((retained / cohort.length) * 100);
  };

  return Object.entries(cohortMap)
    .sort((a, b) => a[1].monthDate - b[1].monthDate)
    .slice(-12)
    .map(([month, { members: cohort, monthDate }]) => {
      const ageDays = (Date.now() - monthDate.getTime()) / MS_PER_DAY;
      return {
        month,
        size: cohort.length,
        m1: retentionRate(cohort, 30),
        m3: ageDays >= 90 ? retentionRate(cohort, 90) : null,
        m6: ageDays >= 180 ? retentionRate(cohort, 180) : null,
        m12: ageDays >= 365 ? retentionRate(cohort, 365) : null,
      };
    });
}

export function computeClassDetail(className, bookings, classes, members) {
  const classIds = new Set(
    classes.filter((c) => c.name === className).map((c) => String(c._id))
  );
  const relevant = bookings.filter((b) => classIds.has(classIdStr(b)));
  const classRows = classes.filter((c) => classIds.has(String(c._id)));
  const weeklyCapacity = classRows.reduce((s, c) => s + c.capacity, 0);
  const now = Date.now();

  const trend = Array.from({ length: 12 }, (_, i) => {
    const weekStart = now - (11 - i) * 7 * MS_PER_DAY;
    const weekEnd = weekStart + 7 * MS_PER_DAY;
    const weekBookings = relevant.filter((b) => {
      const t = new Date(b.bookedAt).getTime();
      return t >= weekStart && t < weekEnd;
    });
    return {
      wk: `W${i + 1}`,
      attended: weekBookings.filter((b) => b.attended).length,
      capacity: weeklyCapacity,
      noShow: weekBookings.filter((b) => !b.attended).length,
    };
  });

  const twelveWeeksAgo = now - 12 * 7 * MS_PER_DAY;
  const recent = relevant.filter((b) => new Date(b.bookedAt).getTime() >= twelveWeeksAgo);
  const attended = recent.filter((b) => b.attended).length;
  const total = recent.length;
  const noShowRatePct = total > 0 ? Math.round(((total - attended) / total) * 1000) / 10 : 0;
  const slotCapacity = weeklyCapacity * 12;
  const avgFillPct = slotCapacity > 0 ? Math.round((attended / slotCapacity) * 100) : 0;

  const counts = {};
  for (const b of recent.filter((x) => x.attended)) {
    const id = memberIdStr(b);
    counts[id] = (counts[id] || 0) + 1;
  }
  const memberById = Object.fromEntries(members.map((m) => [String(m._id), m]));
  const topRegulars = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, visits]) => ({
      name: memberById[id]?.name ?? "Member",
      visits,
    }));

  return { trend, topRegulars, avgFillPct, noShowRatePct };
}

export function computeRevPashTrend(bookings, classes, members, now = Date.now()) {
  const memberById = Object.fromEntries(members.map((m) => [String(m._id), m]));
  const weeklySeatHours = classes.reduce(
    (s, c) => s + c.capacity * (c.durationMinutes / 60),
    0
  );

  const revpashTrend = Array.from({ length: 12 }, (_, i) => {
    const weekStart = now - (11 - i) * 7 * MS_PER_DAY;
    const weekEnd = weekStart + 7 * MS_PER_DAY;
    const weekBookings = bookings.filter((b) => {
      const t = new Date(b.bookedAt).getTime();
      return t >= weekStart && t < weekEnd && b.attended;
    });
    const revenue = weekBookings.reduce((sum, b) => {
      const m = memberById[memberIdStr(b)];
      return sum + (TIER_REV[m?.membershipType] ?? 20);
    }, 0);
    const revpash = weeklySeatHours > 0 ? +(revenue / weeklySeatHours).toFixed(2) : 0;
    return { wk: `W${i + 1}`, revpash };
  });

  const currentRevpash = revpashTrend[revpashTrend.length - 2]?.revpash
    ?? revpashTrend[revpashTrend.length - 1]?.revpash
    ?? 0;
  const priorRevpash = revpashTrend[revpashTrend.length - 3]?.revpash
    ?? revpashTrend[revpashTrend.length - 2]?.revpash
    ?? 0;

  return {
    revpashTrend,
    currentRevpash,
    revpashDeltaPct: percentDelta(currentRevpash, priorRevpash),
  };
}

export function attendanceByMonth(memberBookings, months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const visits = memberBookings.filter((b) => {
      if (!b.attended) return false;
      const t = new Date(b.bookedAt).getTime();
      return t >= start && t <= end;
    }).length;
    return {
      m: d.toLocaleDateString("en-US", { month: "short" }),
      visits,
    };
  });
}

export function smsSummaryFromConversion(smsConversion) {
  const { totals, periodDays, conversionWindowDays } = smsConversion;
  return {
    periodDays,
    conversionWindowDays,
    sent: totals.sent,
    converted: totals.converted,
    visitsRecovered: totals.visitsRecovered,
    conversionRate: totals.conversionRate,
  };
}
