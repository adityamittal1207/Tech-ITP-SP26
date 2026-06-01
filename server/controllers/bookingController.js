import Booking from "../models/Booking.js";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  localDateKey,
  markAttended,
} from "../services/bookingService.js";
import { getOwnerUid } from "../utils/tenant.js";

export async function getBookings(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const bookings = await Booking.find({ ownerUid })
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
    const ownerUid = getOwnerUid(req);
    const booking = await Booking.findOne({ _id: req.params.id, ownerUid })
      .populate("memberId", "name email phone")
      .populate("classId", "name instructor dayOfWeek time");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function createBookingHandler(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const { memberId, classId, occurrenceDate, date } = req.body;
    if (!memberId || !classId) {
      return res.status(400).json({ message: "memberId and classId are required" });
    }
    const booking = await createBooking({
      ownerUid,
      memberId,
      classId,
      occurrenceDate: occurrenceDate || date || localDateKey(),
      source: "staff",
    });
    res.status(201).json(booking);
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ message: error.message });
    next(error);
  }
}

export async function updateBooking(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const { attended, status } = req.body;

    if (attended !== undefined) {
      const booking = await markAttended(req.params.id, ownerUid, attended);
      return res.json(booking);
    }
    if (status === "confirmed") {
      const booking = await confirmBooking(req.params.id, ownerUid, { by: "staff" });
      return res.json(booking);
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, ownerUid },
      req.body,
      { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function deleteBooking(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await cancelBooking(req.params.id, ownerUid, { by: "staff" });
    res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    next(error);
  }
}

export async function cancelBookingHandler(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await cancelBooking(req.params.id, ownerUid, { by: "staff" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function confirmBookingHandler(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await confirmBooking(req.params.id, ownerUid, { by: "staff" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}
