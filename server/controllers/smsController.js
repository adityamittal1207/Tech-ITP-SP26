import Booking from "../models/Booking.js";
import { sendTemplate } from "../services/messageService.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

export async function sendReminder(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "bookingId is required" });

    const booking = await Booking.findOne({ _id: bookingId, ...ownerFilter(getOwnerUid(req)) })
      .populate("memberId", "name phone")
      .populate("classId", "name time dayOfWeek");

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.reminderSent) return res.status(400).json({ message: "Reminder already sent for this booking" });

    try {
      const message = await sendTemplate(booking.memberId._id, "reminder", {
        className: booking.classId.name,
        classTime: booking.classId.time,
      });
      booking.reminderSent = true;
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
