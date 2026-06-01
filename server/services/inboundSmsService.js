import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import config from "../config/businessConfig.js";
import { cancelBooking } from "./bookingService.js";
import { logInboundMessage, sendTemplate } from "./messageService.js";
import { normalizePhone } from "./phone.js";

/** Outbound types that tell the member they can reply C to cancel. */
const CANCEL_REPLY_MESSAGE_TYPES = ["reminder", "waitlistPromoted", "waitlistJoined"];

const ACTIVE_BOOKING_STATUSES = ["booked", "confirmed"];

export function parseSmsReply(body) {
  const text = (body ?? "").trim().toUpperCase();
  const firstToken = text.split(/\s+/)[0]?.replace(/[^\w]/g, "") ?? "";
  const cancel = config.smsReplyKeywords?.cancel ?? ["C", "CANCEL", "N", "NO"];
  if (cancel.includes(firstToken) || cancel.includes(text)) return "cancel";
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

async function findBookingFromRecentCancelSms(member) {
  const recent = await Message.findOne({
    ownerUid: member.ownerUid,
    memberId: member._id,
    direction: "outbound",
    type: { $in: CANCEL_REPLY_MESSAGE_TYPES },
    bookingId: { $ne: null },
    status: { $in: ["sent", "delivered"] },
  })
    .sort({ sentAt: -1 })
    .select("bookingId");

  if (!recent?.bookingId) return null;

  return Booking.findOne({
    _id: recent.bookingId,
    ownerUid: member.ownerUid,
    memberId: member._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    bookedAt: { $gt: new Date() },
  }).populate("classId", "name time");
}

async function findNextUpcomingBooking(member) {
  return Booking.findOne({
    ownerUid: member.ownerUid,
    memberId: member._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    bookedAt: { $gt: new Date() },
  })
    .populate("classId", "name time")
    .sort({ bookedAt: 1 });
}

export async function findEligibleBookingForCancel(member) {
  return (await findBookingFromRecentCancelSms(member)) ?? (await findNextUpcomingBooking(member));
}

async function findMemberByPhone(fromPhone) {
  const normalized = normalizePhone(fromPhone);
  const members = await Member.find({ phone: normalized });
  if (members.length === 0) return null;
  if (members.length === 1) return members[0];

  for (const member of members) {
    const booking = await findEligibleBookingForCancel(member);
    if (booking) return { member, booking };
  }
  return { member: members[0], booking: null };
}

export async function handleInboundSms(fromPhone, body) {
  let member;
  let preloadedBooking = null;

  try {
    const found = await findMemberByPhone(fromPhone);
    if (!found) return { handled: false, reason: "member_not_found" };
    member = found.member;
    preloadedBooking = found.booking ?? null;
  } catch {
    return { handled: false, reason: "invalid_phone" };
  }

  const keyword = parseSmsReply(body);
  const booking = preloadedBooking ?? (await findEligibleBookingForCancel(member));

  await logInboundMessage({
    ownerUid: member.ownerUid,
    memberId: member._id,
    bookingId: booking?._id,
    body: body ?? "",
    replyKeyword: keyword,
  });

  if (keyword !== "cancel") {
    return { handled: false, reason: "unknown_keyword", keyword };
  }

  if (!booking) {
    return { handled: false, reason: "no_upcoming_booking", keyword };
  }

  const className = booking.classId?.name ?? "your class";
  const classTime = formatTime12(booking.classId?.time ?? "00:00");

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
