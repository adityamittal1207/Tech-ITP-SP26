import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import { computeStatus } from "../services/retentionService.js";
import config from "../config/businessConfig.js";
import { sendTemplate } from "../services/messageService.js";

export async function getBookings(_req, res, next) {
  try {
    const bookings = await Booking.find()
      .populate("memberId", "name email")
      .populate("classId", "name instructor dayOfWeek time")
      .sort({ bookedAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("memberId", "name email")
      .populate("classId", "name instructor dayOfWeek time");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req, res, next) {
  try {
    const { memberId, classId } = req.body;

    const [member, cls] = await Promise.all([
      Member.findById(memberId),
      Class.findById(classId),
    ]);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const booking = await Booking.create(req.body);

    // Shared fetch — one DB round-trip used by both side effects below
    let memberBookings;
    try {
      memberBookings = await Booking.find(
        { memberId: booking.memberId },
        { memberId: 1, bookedAt: 1 }
      );
    } catch (fetchErr) {
      console.error("post-booking fetch failed (cron will reconcile):", fetchErr);
    }

    // Status sync — independent of milestone
    try {
      if (memberBookings) {
        await Member.findByIdAndUpdate(member._id, {
          $set: { status: computeStatus(member, memberBookings) },
        });
      }
    } catch (syncErr) {
      console.error("post-booking status sync failed (cron will reconcile):", syncErr);
    }

    // Milestone — independent of status sync; fires exactly once via flag guard.
    // member.milestoneSent is read from the request-scoped object fetched during Gap-1 validation;
    // a concurrent double-fire race is accepted as negligible at boutique-studio scale.
    // The flag is set only after a successful send, so a failed send retries on the next booking.
    try {
      if (memberBookings && !member.milestoneSent && memberBookings.length >= config.milestoneVisits) {
        await sendTemplate(member._id, "milestone", { visitCount: memberBookings.length });
        await Member.findByIdAndUpdate(member._id, { $set: { milestoneSent: true } });
      }
    } catch (milestoneErr) {
      console.error("milestone SMS failed:", milestoneErr);
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

export async function updateBooking(req, res, next) {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function deleteBooking(req, res, next) {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch (error) {
    next(error);
  }
}
