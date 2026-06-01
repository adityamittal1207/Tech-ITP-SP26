import Booking from "../models/Booking.js";
import { sendTemplate } from "../services/messageService.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export async function sendReminder(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "bookingId is required" });

    const booking = await Booking.findOne({ _id: bookingId, ...ownerFilter(getOwnerUid(req)) })
      .populate("memberId", "name phone")
      .populate("classId", "name time dayOfWeek");

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Cannot remind cancelled booking" });
    }

    try {
      const message = await sendTemplate(
        booking.memberId._id,
        "reminder",
        {
          className: booking.classId.name,
          classTime: formatTime12(booking.classId.time),
        },
        undefined,
        { bookingId: booking._id }
      );
      booking.reminderSent = true;
      booking.reminderSentAt = new Date();
      await booking.save();
      res.json({ success: true, message });
    } catch (smsErr) {
      res.status(502).json({ message: smsErr.message });
    }
  } catch (error) {
    next(error);
  }
}

export async function sendOutreach(req, res, next) {
  try {
    const { memberId, type, body } = req.body;
    if (!memberId) return res.status(400).json({ message: "memberId is required" });
    const allowedTypes = ["atRisk", "winback", "welcome", "milestone", "reminder"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${allowedTypes.join(", ")}` });
    }

    try {
      const message = await sendTemplate(memberId, type, {}, typeof body === "string" ? body : undefined);
      res.json({ success: true, message });
    } catch (smsErr) {
      res.status(502).json({ message: smsErr.message });
    }
  } catch (error) {
    next(error);
  }
}
