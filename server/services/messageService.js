import Booking from "../models/Booking.js";
import Message from "../models/Message.js";
import Member from "../models/Member.js";
import { buildCancelUrl } from "./cancelLinkService.js";
import { BOOKING_CANCEL_TYPES, buildSmsBody, ensureCancelLinkPlaceholder, shouldIncludeCancelLink } from "./smsBody.js";
import { getEffectiveConfig } from "./configService.js";
import { sendSMS } from "./twilioService.js";

export async function sendTemplate(
  memberId,
  type,
  extraMergeData = {},
  bodyOverride,
  { bookingId, direction = "outbound" } = {}
) {
  const member = await Member.findById(memberId);
  if (!member) throw Object.assign(new Error("Member not found"), { statusCode: 404 });
  if (!member.phone) throw Object.assign(new Error("Member has no phone number"), { statusCode: 400 });

  const { smsTemplates } = await getEffectiveConfig(member.ownerUid);
  const template = smsTemplates[type];
  if (!template && !bodyOverride) {
    throw Object.assign(new Error(`Unknown SMS type: ${type}`), { statusCode: 400 });
  }

  const mergeData = { firstName: member.name.split(" ")[0], ...extraMergeData };

  let bookingStatus;
  if (bookingId) {
    const booking = await Booking.findById(bookingId).select("ownerUid bookedAt status");
    if (booking) {
      bookingStatus = booking.status;
      if (shouldIncludeCancelLink(type, booking.status)) {
        mergeData.cancelLink = buildCancelUrl(booking._id, booking.ownerUid, booking.bookedAt);
      }
    }
  }

  const resolvedTemplate = BOOKING_CANCEL_TYPES.has(type)
    ? ensureCancelLinkPlaceholder(template ?? "", type)
    : (template ?? "");

  const body = buildSmsBody({
    template: resolvedTemplate,
    bodyOverride,
    mergeData: { ...mergeData, _bookingStatus: bookingStatus },
    type,
  });

  let status = direction === "inbound" ? "received" : "sent";
  let twilioError = null;

  if (direction === "outbound") {
    try {
      await sendSMS(member.phone, body);
    } catch (err) {
      status = "failed";
      twilioError = err;
    }
  }

  const message = await Message.create({
    ownerUid: member.ownerUid,
    memberId: member._id,
    bookingId: bookingId ?? undefined,
    direction,
    type,
    templateUsed: type,
    body,
    sentAt: new Date(),
    status,
  });

  if (twilioError) throw twilioError;
  return message;
}

export async function logInboundMessage({
  ownerUid,
  memberId,
  bookingId,
  body,
  replyKeyword,
}) {
  return Message.create({
    ownerUid,
    memberId,
    bookingId,
    direction: "inbound",
    type: "reminder",
    body,
    replyKeyword,
    sentAt: new Date(),
    status: "received",
  });
}
