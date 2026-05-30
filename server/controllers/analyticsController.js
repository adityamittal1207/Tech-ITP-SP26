import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";

function groupByMember(bookings) {
  const map = {};
  for (const b of bookings) {
    const id = String(b.memberId);
    (map[id] ??= []).push(b);
  }
  return map;
}

export async function getDashboardStats(_req, res, next) {
  try {
    const [members, bookings, classes] = await Promise.all([
      Member.find(),
      Booking.find({}, { memberId: 1, classId: 1, bookedAt: 1, attended: 1 }),
      Class.find({}, { _id: 1, category: 1 }),
    ]);

    const totalMembers  = members.length;
    const activeMembers = members.filter(m => m.isActive).length;
    const classesPerWeek = classes.length;

    const attendedCount = bookings.filter(b => b.attended).length;
    const attendanceRate = bookings.length
      ? Math.round((attendedCount / bookings.length) * 100)
      : 0;

    // Bookings last 30 days — one slot per day
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86_400_000;
    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
      dateMap[key] = 0;
    }
    for (const b of bookings) {
      const key = new Date(b.bookedAt).toISOString().slice(0, 10);
      if (key in dateMap) dateMap[key]++;
    }
    const bookingsLast30Days = Object.entries(dateMap).map(([date, count]) => ({ date, count }));

    // Category popularity
    const classIndex = {};
    for (const c of classes) classIndex[String(c._id)] = c.category;
    const catCounts = {};
    for (const b of bookings) {
      const cat = classIndex[String(b.classId)];
      if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const categoryPopularity = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // At-risk members
    const byMember = groupByMember(bookings);
    const atRiskMembers = [];
    for (const m of members) {
      if (!m.isActive || m.status !== "at-risk") continue;
      const memberBookings = byMember[String(m._id)] ?? [];
      const lastBooking = memberBookings.length
        ? new Date(Math.max(...memberBookings.map(b => new Date(b.bookedAt).getTime())))
        : null;
      atRiskMembers.push({ _id: m._id, name: m.name, email: m.email, membershipType: m.membershipType, lastBooking });
    }

    res.json({ totalMembers, activeMembers, classesPerWeek, attendanceRate, bookingsLast30Days, categoryPopularity, atRiskMembers });
  } catch (error) {
    next(error);
  }
}

export async function getRetentionStats(_req, res, next) {
  try {
    const members = await Member.find();
    const statusCounts = { new: 0, regular: 0, "at-risk": 0, lapsed: 0 };
    const cohortMap = {};

    for (const m of members) {
      const status = m.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const cohortKey = new Date(m.joinDate).toISOString().slice(0, 7);
      if (!cohortMap[cohortKey]) cohortMap[cohortKey] = { total: 0, retained: 0 };
      cohortMap[cohortKey].total++;
      if (status === "new" || status === "regular") cohortMap[cohortKey].retained++;
    }

    const cohortData = Object.entries(cohortMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, retained }]) => ({
        month,
        total,
        retained,
        retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
      }));

    res.json({ memberStatusBreakdown: statusCounts, cohortData });
  } catch (error) {
    next(error);
  }
}

export async function getClassStats(_req, res, next) {
  try {
    const [classes, bookings] = await Promise.all([
      Class.find(),
      Booking.find({}, { classId: 1, attended: 1 }),
    ]);

    const bookingsByClass = {};
    for (const b of bookings) {
      const id = String(b.classId);
      if (!bookingsByClass[id]) bookingsByClass[id] = { total: 0, attended: 0 };
      bookingsByClass[id].total++;
      if (b.attended) bookingsByClass[id].attended++;
    }

    const perClassAttendance = classes.map(c => {
      const stats = bookingsByClass[String(c._id)] ?? { total: 0, attended: 0 };
      return {
        _id: c._id,
        name: c.name,
        instructor: c.instructor,
        category: c.category,
        dayOfWeek: c.dayOfWeek,
        capacity: c.capacity,
        totalBookings: stats.total,
        attended: stats.attended,
        fillRate: c.capacity > 0 ? Math.round((stats.total / c.capacity) * 100) : 0,
        attendanceRate: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
      };
    });

    const instructorMap = {};
    for (const c of perClassAttendance) {
      if (!instructorMap[c.instructor]) {
        instructorMap[c.instructor] = { classCount: 0, totalBookings: 0, attended: 0, totalFillRate: 0 };
      }
      const s = instructorMap[c.instructor];
      s.classCount++;
      s.totalBookings += c.totalBookings;
      s.attended += c.attended;
      s.totalFillRate += c.fillRate;
    }
    const instructorScorecard = Object.entries(instructorMap)
      .map(([instructor, s]) => ({
        instructor,
        classCount: s.classCount,
        totalBookings: s.totalBookings,
        attended: s.attended,
        avgFillRate: s.classCount > 0 ? Math.round(s.totalFillRate / s.classCount) : 0,
      }))
      .sort((a, b) => b.avgFillRate - a.avgFillRate);

    res.json({ perClassAttendance, instructorScorecard });
  } catch (error) {
    next(error);
  }
}
