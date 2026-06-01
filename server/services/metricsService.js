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
