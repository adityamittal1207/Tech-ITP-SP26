import Booking from "../models/Booking.js";
import {
  cancelBooking,
  createBooking,
  localDateKey,
  markAttended,
  promoteBookingFromWaitlist,
} from "../services/bookingService.js";
import { sendTemplate } from "../services/messageService.js";
import { getOwnerUid } from "../utils/tenant.js";

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

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
    const { attended } = req.body;

    if (attended !== undefined) {
      const booking = await markAttended(req.params.id, ownerUid, attended);
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
    const { message } = req.body ?? {};

    if (typeof message === "string" && message.trim()) {
      const existing = await Booking.findOne({ _id: req.params.id, ownerUid })
        .populate("memberId", "name phone")
        .populate("classId", "name time");
      if (!existing) return res.status(404).json({ message: "Booking not found" });
      try {
        await sendTemplate(
          existing.memberId._id,
          "cancelAck",
          {
            firstName: existing.memberId.name.split(" ")[0],
            className: existing.classId.name,
            classTime: formatTime12(existing.classId.time),
          },
          message.trim(),
          { bookingId: existing._id }
        );
      } catch (smsErr) {
        return res.status(502).json({ message: smsErr.message });
      }
    }

    const booking = await cancelBooking(req.params.id, ownerUid, { by: "staff" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function promoteFromWaitlistHandler(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await promoteBookingFromWaitlist(req.params.id, ownerUid);
    res.json(booking);
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}
