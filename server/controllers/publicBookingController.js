import Member from "../models/Member.js";
import StudioSettings from "../models/StudioSettings.js";
import {
  cancelBooking,
  createBooking,
  findStudioBySlug,
  getWeekSchedule,
  getWeekStartKey,
  localDateKey,
} from "../services/bookingService.js";
import { normalizePhone } from "../services/phone.js";
import Booking from "../models/Booking.js";

async function resolveStudio(slug) {
  const studio = await findStudioBySlug(slug);
  if (!studio) {
    throw Object.assign(new Error("Studio not found or public booking disabled"), { status: 404 });
  }
  return studio;
}

export async function getPublicStudio(req, res, next) {
  try {
    const studio = await resolveStudio(req.params.slug);
    res.json({
      name: studio.studioName,
      city: studio.city,
      slug: studio.bookingSlug,
      publicBookingEnabled: studio.publicBookingEnabled,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicSchedule(req, res, next) {
  try {
    const studio = await resolveStudio(req.params.slug);
    const week = req.query.week ? String(req.query.week) : getWeekStartKey(localDateKey());
    const schedule = await getWeekSchedule(studio.ownerUid, week);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

export async function getPublicBookings(req, res, next) {
  try {
    const studio = await resolveStudio(req.params.slug);
    const email = req.query.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email query required" });

    const member = await Member.findOne({ ownerUid: studio.ownerUid, email });
    if (!member) return res.json({ bookings: [] });

    const bookings = await Booking.find({
      ownerUid: studio.ownerUid,
      memberId: member._id,
      status: { $ne: "cancelled" },
      bookedAt: { $gte: new Date() },
    })
      .populate("classId", "name instructor time dayOfWeek")
      .sort({ bookedAt: 1 });

    res.json({
      bookings: bookings.map((b) => ({
        id: String(b._id),
        status: b.status,
        bookedAt: b.bookedAt,
        className: b.classId?.name,
        instructor: b.classId?.instructor,
        time: b.classId?.time,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createPublicBooking(req, res, next) {
  try {
    const studio = await resolveStudio(req.params.slug);
    const { email, name, phone, classId, date } = req.body;
    if (!email?.trim() || !classId || !date) {
      return res.status(400).json({ message: "email, classId, and date are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let member = await Member.findOne({ ownerUid: studio.ownerUid, email: normalizedEmail });

    if (!member) {
      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({ message: "name and phone required for new members" });
      }
      let normalizedPhone;
      try {
        normalizedPhone = normalizePhone(phone.trim());
      } catch {
        return res.status(400).json({ message: "Invalid phone number" });
      }
      member = await Member.create({
        ownerUid: studio.ownerUid,
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        membershipType: "basic",
        source: "native",
        joinSource: "Walk-in",
      });
    }

    const booking = await createBooking({
      ownerUid: studio.ownerUid,
      memberId: member._id,
      classId,
      occurrenceDate: date,
      source: "public",
    });

    res.status(201).json({
      booking: {
        id: String(booking._id),
        status: booking.status,
        bookedAt: booking.bookedAt,
      },
      waitlisted: booking.status === "waitlisted",
    });
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ message: error.message });
    next(error);
  }
}

export async function cancelPublicBooking(req, res, next) {
  try {
    const studio = await resolveStudio(req.params.slug);
    const { email } = req.body;
    const { id } = req.params;
    if (!email?.trim()) return res.status(400).json({ message: "email is required" });

    const member = await Member.findOne({
      ownerUid: studio.ownerUid,
      email: email.trim().toLowerCase(),
    });
    if (!member) return res.status(404).json({ message: "Booking not found" });

    const booking = await Booking.findOne({
      _id: id,
      ownerUid: studio.ownerUid,
      memberId: member._id,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    await cancelBooking(booking._id, studio.ownerUid, { by: "member" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
