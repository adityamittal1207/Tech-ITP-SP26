import Booking from "../models/Booking.js";
import StudioSettings from "../models/StudioSettings.js";
import { getEffectiveConfig } from "./configService.js";
import { sendTemplate } from "./messageService.js";
import config from "../config/businessConfig.js";

const FIRST_MS = (config.reminderLeadTimes?.firstHours ?? 24) * 3600000;
const SECOND_MS = (config.reminderLeadTimes?.secondHours ?? 2) * 3600000;
const WINDOW_MS = 15 * 60000;

function formatTime12(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

async function sendBookingReminder(booking, type = "first") {
  const member = booking.memberId;
  const cls = booking.classId;
  if (!member?.phone) return false;

  const classTime = formatTime12(cls.time);
  const className = cls.name;

  try {
    await sendTemplate(
      member._id,
      "reminder",
      { className, classTime, firstName: member.name.split(" ")[0] },
      undefined,
      { bookingId: booking._id }
    );
    if (type === "first") {
      booking.reminderSent = true;
      booking.reminderSentAt = new Date();
    } else {
      booking.secondReminderSentAt = new Date();
    }
    await booking.save();
    return true;
  } catch (err) {
    console.error(`Reminder failed for booking ${booking._id}:`, err.message);
    return false;
  }
}

export async function runReminderJob(ownerUidFilter) {
  const now = Date.now();
  const settingsList = ownerUidFilter
    ? await StudioSettings.find({ ownerUid: ownerUidFilter })
    : await StudioSettings.find({});

  let sent = 0;

  for (const settings of settingsList) {
    const ownerUid = settings.ownerUid;
    const upcoming = await Booking.find({
      ownerUid,
      status: { $in: ["booked", "confirmed"] },
      bookedAt: { $gt: new Date(now) },
    })
      .populate("memberId", "name phone")
      .populate("classId", "name time dayOfWeek");

    for (const booking of upcoming) {
      const until = new Date(booking.bookedAt).getTime() - now;

      if (!booking.reminderSentAt && until <= FIRST_MS + WINDOW_MS && until >= FIRST_MS - WINDOW_MS) {
        if (await sendBookingReminder(booking, "first")) sent++;
        continue;
      }

      if (
        booking.reminderSentAt &&
        !booking.secondReminderSentAt &&
        until <= SECOND_MS + WINDOW_MS &&
        until >= SECOND_MS - WINDOW_MS
      ) {
        if (await sendBookingReminder(booking, "second")) sent++;
      }
    }
  }

  return { sent };
}
