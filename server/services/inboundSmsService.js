import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import config from "../config/businessConfig.js";
import { cancelBooking, confirmBooking } from "./bookingService.js";
import { logInboundMessage, sendTemplate } from "./messageService.js";
import { normalizePhone } from "./phone.js";

function parseReply(body) {
  const text = (body ?? "").trim().toUpperCase();
  const confirm = config.smsReplyKeywords?.confirm ?? ["Y", "YES"];
  const cancel = config.smsReplyKeywords?.cancel ?? ["C", "CANCEL", "N", "NO"];
  if (confirm.includes(text)) return "confirm";
  if (cancel.includes(text)) return "cancel";
  return "unknown";
}

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

async function findEligibleBooking(member) {
  const now = new Date();
  return Booking.findOne({
    ownerUid: member.ownerUid,
    memberId: member._id,
    status: "booked",
    reminderSentAt: { $ne: null },
    bookedAt: { $gt: now },
  })
    .populate("classId", "name time")
    .sort({ bookedAt: 1 });
}

export async function handleInboundSms(fromPhone, body) {
  let normalized;
  try {
    normalized = normalizePhone(fromPhone);
  } catch {
    return { handled: false, reason: "invalid_phone" };
  }

  const member = await Member.findOne({ phone: normalized });
  if (!member) return { handled: false, reason: "member_not_found" };

  const keyword = parseReply(body);
  const booking = await findEligibleBooking(member);

  await logInboundMessage({
    ownerUid: member.ownerUid,
    memberId: member._id,
    bookingId: booking?._id,
    body: body ?? "",
    replyKeyword: keyword,
  });

  if (!booking || keyword === "unknown") {
    return { handled: false, reason: "no_eligible_booking_or_unknown_keyword", keyword };
  }

  const className = booking.classId?.name ?? "your class";
  const classTime = formatTime12(booking.classId?.time ?? "00:00");

  if (keyword === "confirm") {
    await confirmBooking(booking._id, member.ownerUid, { by: "sms" });
    try {
      await sendTemplate(member._id, "confirmAck", { className, classTime }, undefined, {
        bookingId: booking._id,
      });
    } catch (err) {
      console.error("confirm ack SMS failed:", err.message);
    }
    return { handled: true, action: "confirmed", bookingId: String(booking._id) };
  }

  if (keyword === "cancel") {
    await cancelBooking(booking._id, member.ownerUid, { by: "sms" });
    try {
      await sendTemplate(member._id, "cancelAck", { className, classTime }, undefined, {
        bookingId: booking._id,
      });
    } catch (err) {
      console.error("cancel ack SMS failed:", err.message);
    }
    return { handled: true, action: "cancelled", bookingId: String(booking._id) };
  }

  return { handled: false, reason: "unknown" };
}
