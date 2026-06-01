import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import config from "../config/businessConfig.js";
import { computeStatus } from "./retentionService.js";
import { sendTemplate } from "./messageService.js";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_INDEX = Object.fromEntries(DAY_NAMES.map((d, i) => [d, i]));

const ACTIVE_STATUSES = ["booked", "confirmed", "waitlisted"];
const TZ = process.env.STUDIO_TIMEZONE || "America/Los_Angeles";

export function localDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function parseTime24(timeStr) {
  const [hStr, mStr] = timeStr.split(":");
  return { hours: Number(hStr), minutes: Number(mStr) || 0 };
}

export function resolveOccurrenceDateTime(cls, dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const { hours, minutes } = parseTime24(cls.time);
  const dow = new Date(y, m - 1, d).getDay();
  const expected = DAY_INDEX[cls.dayOfWeek?.toLowerCase()];
  if (expected !== undefined && dow !== expected) {
    let diff = expected - dow;
    if (diff < 0) diff += 7;
    const adjusted = new Date(y, m - 1, d + diff, hours, minutes, 0, 0);
    return adjusted;
  }
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

export function getWeekStartKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = date.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return localDateKey(date);
}

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export async function countActiveBookings(ownerUid, classId, bookedAt) {
  const start = new Date(bookedAt);
  const end = new Date(start.getTime() + 60000);
  return Booking.countDocuments({
    ownerUid,
    classId,
    bookedAt: { $gte: start, $lt: end },
    status: { $in: ["booked", "confirmed"] },
  });
}

export async function countWaitlisted(ownerUid, classId, bookedAt) {
  const start = new Date(bookedAt);
  const end = new Date(start.getTime() + 60000);
  return Booking.countDocuments({
    ownerUid,
    classId,
    bookedAt: { $gte: start, $lt: end },
    status: "waitlisted",
  });
}

async function syncMemberRetention(ownerUid, memberId) {
  const member = await Member.findOne({ _id: memberId, ownerUid });
  if (!member) return;
  const memberBookings = await Booking.find(
    { ownerUid, memberId, status: { $ne: "cancelled" } },
    { memberId: 1, bookedAt: 1, attended: 1 }
  );
  await Member.findByIdAndUpdate(member._id, {
    $set: { status: computeStatus(member, memberBookings) },
  });
}

async function maybeSendMilestone(ownerUid, memberId) {
  const member = await Member.findOne({ _id: memberId, ownerUid });
  if (!member || member.milestoneSent) return;
  const count = await Booking.countDocuments({
    ownerUid,
    memberId,
    status: { $ne: "cancelled" },
    attended: true,
  });
  if (count >= config.milestoneVisits) {
    try {
      await sendTemplate(member._id, "milestone", { visitCount: count });
      await Member.findByIdAndUpdate(member._id, { $set: { milestoneSent: true } });
    } catch (err) {
      console.error("milestone SMS failed:", err.message);
    }
  }
}

export async function createBooking({
  ownerUid,
  memberId,
  classId,
  occurrenceDate,
  source = "staff",
}) {
  const [member, cls] = await Promise.all([
    Member.findOne({ _id: memberId, ownerUid }),
    Class.findOne({ _id: classId, ownerUid }),
  ]);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });
  if (!cls) throw Object.assign(new Error("Class not found"), { status: 404 });

  const dateKey = typeof occurrenceDate === "string" ? occurrenceDate : localDateKey(occurrenceDate);
  const bookedAt = resolveOccurrenceDateTime(cls, dateKey);

  const existing = await Booking.findOne({ ownerUid, memberId, classId, bookedAt });
  if (existing && existing.status !== "cancelled") {
    throw Object.assign(new Error("Member already booked for this class"), { status: 409 });
  }

  const activeCount = await countActiveBookings(ownerUid, classId, bookedAt);
  const status = activeCount >= cls.capacity ? "waitlisted" : "booked";

  let booking;
  if (existing?.status === "cancelled") {
    booking = await Booking.findByIdAndUpdate(
      existing._id,
      {
        status,
        attended: false,
        confirmedAt: null,
        cancelledAt: null,
        source,
        externalSource: "native",
      },
      { new: true }
    );
  } else {
    booking = await Booking.create({
      ownerUid,
      memberId,
      classId,
      bookedAt,
      status,
      source,
      externalSource: "native",
    });
  }

  await syncMemberRetention(ownerUid, memberId);
  return Booking.findById(booking._id)
    .populate("memberId", "name email phone")
    .populate("classId", "name time dayOfWeek");
}

export async function promoteWaitlist(ownerUid, classId, bookedAt) {
  const start = new Date(bookedAt);
  const end = new Date(start.getTime() + 60000);
  const next = await Booking.findOne({
    ownerUid,
    classId,
    bookedAt: { $gte: start, $lt: end },
    status: "waitlisted",
  }).sort({ createdAt: 1 });
  if (!next) return null;
  next.status = "booked";
  await next.save();
  return next;
}

export async function cancelBooking(bookingId, ownerUid, { by = "staff" } = {}) {
  const booking = await Booking.findOne({ _id: bookingId, ownerUid });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  if (booking.status === "cancelled") return booking;

  const wasActive = ["booked", "confirmed"].includes(booking.status);
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  await booking.save();

  if (wasActive) {
    await promoteWaitlist(ownerUid, booking.classId, booking.bookedAt);
  }

  await syncMemberRetention(ownerUid, booking.memberId);
  return booking;
}

export async function confirmBooking(bookingId, ownerUid, { by = "staff" } = {}) {
  const booking = await Booking.findOne({ _id: bookingId, ownerUid });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  if (booking.status === "cancelled") {
    throw Object.assign(new Error("Cannot confirm a cancelled booking"), { status: 400 });
  }
  booking.status = "confirmed";
  booking.confirmedAt = new Date();
  await booking.save();
  return booking;
}

export async function markAttended(bookingId, ownerUid, attended) {
  const booking = await Booking.findOne({ _id: bookingId, ownerUid });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  booking.attended = Boolean(attended);
  await booking.save();
  await syncMemberRetention(ownerUid, booking.memberId);
  if (attended) await maybeSendMilestone(ownerUid, booking.memberId);
  return booking;
}

export async function getRoster(ownerUid, classId, dateKey) {
  const cls = await Class.findOne({ _id: classId, ownerUid });
  if (!cls) throw Object.assign(new Error("Class not found"), { status: 404 });
  const bookedAt = resolveOccurrenceDateTime(cls, dateKey);
  const start = new Date(bookedAt);
  const end = new Date(start.getTime() + 60000);

  const bookings = await Booking.find({
    ownerUid,
    classId,
    bookedAt: { $gte: start, $lt: end },
    status: { $ne: "cancelled" },
  })
    .populate("memberId", "name email phone status")
    .sort({ status: 1, createdAt: 1 });

  return {
    class: cls,
    occurrenceDate: dateKey,
    bookedAt,
    bookings: bookings.map((b) => ({
      id: String(b._id),
      status: b.status,
      attended: b.attended,
      reminderSent: b.reminderSent || Boolean(b.reminderSentAt),
      member: b.memberId
        ? {
            id: String(b.memberId._id),
            name: b.memberId.name,
            email: b.memberId.email,
            phone: b.memberId.phone,
            status: b.memberId.status,
          }
        : null,
    })),
  };
}

export async function getWeekSchedule(ownerUid, weekStartKey) {
  const weekStart = weekStartKey || getWeekStartKey(localDateKey());
  const [y, m, d] = weekStart.split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 7);

  const [classes, bookings] = await Promise.all([
    Class.find({ ownerUid }).sort({ dayOfWeek: 1, time: 1 }),
    Booking.find({
      ownerUid,
      bookedAt: { $gte: startDate, $lt: endDate },
      status: { $ne: "cancelled" },
    }).populate("memberId", "name"),
  ]);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateKey = localDateKey(d);
    const dayName = DAY_NAMES[d.getUTCDay()];

    const occurrences = classes
      .filter((c) => c.dayOfWeek === dayName)
      .map((c) => {
        const occBookedAt = resolveOccurrenceDateTime(c, dateKey);
        const occStart = new Date(occBookedAt);
        const occEnd = new Date(occStart.getTime() + 60000);
        const slotBookings = bookings.filter((b) => {
          const bt = new Date(b.bookedAt).getTime();
          return String(b.classId) === String(c._id) && bt >= occStart.getTime() && bt < occEnd.getTime();
        });
        const booked = slotBookings.filter((b) => ["booked", "confirmed"].includes(b.status)).length;
        const waitlisted = slotBookings.filter((b) => b.status === "waitlisted").length;
        return {
          classId: String(c._id),
          name: c.name,
          instructor: c.instructor,
          time: c.time,
          timeLabel: formatTime12(c.time),
          durationMinutes: c.durationMinutes,
          capacity: c.capacity,
          category: c.category,
          date: dateKey,
          bookedAt: occBookedAt.toISOString(),
          booked,
          waitlisted,
          spotsLeft: Math.max(0, c.capacity - booked),
        };
      });

    days.push({ date: dateKey, dayName, label: dayName.charAt(0).toUpperCase() + dayName.slice(1), occurrences });
  }

  return { weekStart, days };
}

export async function findStudioBySlug(slug) {
  const StudioSettings = (await import("../models/StudioSettings.js")).default;
  return StudioSettings.findOne({ bookingSlug: slug.toLowerCase(), publicBookingEnabled: true });
}
