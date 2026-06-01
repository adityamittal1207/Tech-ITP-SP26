import Booking from "../models/Booking.js";
import { buildCancelUrl, verifyCancelToken } from "../services/cancelLinkService.js";
import { cancelBooking } from "../services/bookingService.js";
import { sendTemplate } from "../services/messageService.js";

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function readCancelToken(raw) {
  try {
    return decodeURIComponent(String(raw ?? ""));
  } catch {
    return String(raw ?? "");
  }
}

async function loadBookingForToken(rawToken) {
  const token = readCancelToken(rawToken);
  const { bookingId, ownerUid } = verifyCancelToken(token);
  const booking = await Booking.findOne({ _id: bookingId, ownerUid })
    .populate("memberId", "name")
    .populate("classId", "name instructor time");

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  return booking;
}

export async function getCancelByToken(req, res, next) {
  try {
    const booking = await loadBookingForToken(req.params.token);
    const cls = booking.classId;

    res.json({
      bookingId: String(booking._id),
      status: booking.status,
      cancelled: booking.status === "cancelled",
      memberName: booking.memberId?.name?.split(" ")[0] ?? "there",
      className: cls?.name ?? "Class",
      instructor: cls?.instructor ?? "",
      timeLabel: cls?.time ? formatTime12(cls.time) : "",
      bookedAt: booking.bookedAt,
      cancelUrl: buildCancelUrl(booking._id, booking.ownerUid, booking.bookedAt),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}

export async function postCancelByToken(req, res, next) {
  try {
    const booking = await loadBookingForToken(req.params.token);

    if (booking.status === "cancelled") {
      return res.json({ success: true, alreadyCancelled: true });
    }

    if (!["booked", "confirmed", "waitlisted"].includes(booking.status)) {
      return res.status(400).json({ message: "This booking cannot be cancelled" });
    }

    const className = booking.classId?.name ?? "your class";
    const classTime = booking.classId?.time ? formatTime12(booking.classId.time) : "";

    await cancelBooking(booking._id, booking.ownerUid, { by: "magic_link" });

    try {
      await sendTemplate(
        booking.memberId._id,
        "cancelAck",
        { className, classTime, firstName: booking.memberId.name.split(" ")[0] },
        undefined,
        { bookingId: booking._id }
      );
    } catch (err) {
      console.error("cancel ack SMS failed:", err.message);
    }

    res.json({ success: true, className, timeLabel: classTime });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}
