import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import { computeStatus } from "../services/retentionService.js";

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
    const booking = await Booking.create(req.body);
    try {
      const member = await Member.findById(booking.memberId);
      if (member) {
        const memberBookings = await Booking.find(
          { memberId: booking.memberId },
          { memberId: 1, bookedAt: 1 }
        );
        await Member.findByIdAndUpdate(member._id, {
          $set: { status: computeStatus(member, memberBookings) },
        });
      }
    } catch (syncErr) {
      console.error("post-booking status sync failed (cron will reconcile):", syncErr);
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
