import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import StudioSettings from "../models/StudioSettings.js";
import {
  buildBookings,
  buildSupplementalBookings,
  buildTodayBookings,
  buildTomorrowBookings,
  generateOperationalSeed,
} from "../data/operationalSeed.js";
import businessConfig from "../config/businessConfig.js";
import { getEffectiveConfig } from "./configService.js";
import { runRetentionScoring } from "./scoringJob.js";
import { seedDefaultSettings } from "./configService.js";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const SMS_BODIES = {
  atRisk: "Hi {name}, we've missed you! It's been a while since your last class. Come back and join us.",
  winback: "Hi {name}, we haven't seen you in a while. We'd love to have you back — check the latest schedule and book your spot.",
  welcome: "Welcome to Tether, {name}! We're excited to have you. Book your first class and let's get started.",
};

export async function clearTenantData(ownerUid) {
  const filter = { ownerUid };
  const [bookings, classes, members, messages, settings] = await Promise.all([
    Booking.deleteMany(filter),
    Class.deleteMany(filter),
    Member.deleteMany(filter),
    Message.deleteMany(filter),
    StudioSettings.deleteMany(filter),
  ]);
  return {
    bookings: bookings.deletedCount,
    classes: classes.deletedCount,
    members: members.deletedCount,
    messages: messages.deletedCount,
    settings: settings.deletedCount,
  };
}

/**
 * Seed demo studio data for one Firebase Auth UID (MongoDB ownerUid).
 */
export async function seedTenant(ownerUid, { memberCount = 150 } = {}) {
  const cleared = await clearTenantData(ownerUid);
  console.log(`  Cleared tenant ${ownerUid}:`, cleared);

  const { memberProfiles, memberDocs, classData } = generateOperationalSeed(memberCount);

  await seedDefaultSettings(ownerUid);
  await StudioSettings.findOneAndUpdate(
    { ownerUid, key: "main" },
    {
      $set: {
        bookingSlug: "tether-encinitas",
        publicBookingEnabled: true,
      },
    },
    { upsert: true },
  );

  const classes = await Class.insertMany(
    classData.map((doc) => ({ ...doc, ownerUid })),
  );

  const members = await Member.insertMany(
    memberDocs.map((doc) => ({
      ...doc,
      ownerUid,
      milestoneSent: false,
    })),
  );

  const seenBookingKeys = new Set();
  const allSpecs = [
    ...buildBookings(memberProfiles, classes),
    ...buildSupplementalBookings(memberProfiles, classes),
    ...buildTodayBookings(memberProfiles, classes),
    ...buildTomorrowBookings(memberProfiles, classes),
  ];
  const bookingSpecs = allSpecs.filter((b) => {
    const key = `${b.memberIdx}:${b.classIdx}:${b.bookedAt.getTime()}`;
    if (seenBookingKeys.has(key)) return false;
    seenBookingKeys.add(key);
    return true;
  });
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  let reminderToggle = 0;

  const bookingDocs = bookingSpecs.map((b) => {
    const bookedAt = b.bookedAt;
    const recent = bookedAt.getTime() >= thirtyDaysAgo;
    const status = b.status ?? (b.attended ? "booked" : "booked");
    const reminderSent = b.reminderSent ?? (recent ? reminderToggle++ % 2 === 0 : false);
    return {
      ownerUid,
      memberId: members[b.memberIdx]._id,
      classId: classes[b.classIdx]._id,
      bookedAt,
      status,
      source: b.source ?? "import",
      externalSource: "native",
      attended: b.attended ?? false,
      reminderSent,
      reminderSentAt: reminderSent ? new Date(bookedAt.getTime() - 24 * 3_600_000) : undefined,
      confirmedAt: status === "confirmed" ? new Date() : b.confirmedAt,
    };
  });
  const insertedBookings = await Booking.insertMany(bookingDocs);

  await runRetentionScoring(ownerUid);

  const scoredMembers = await Member.find({ ownerUid });
  const outreachPool = scoredMembers.filter(
    (m) => m.status === "at-risk" || m.status === "lapsed",
  );
  const typeCycle = ["atRisk", "winback", "atRisk", "winback", "welcome"];
  const messageDocs = [];
  const conversionBookings = [];

  for (let i = 0; i < Math.min(32, outreachPool.length); i++) {
    const member = outreachPool[i % outreachPool.length];
    const type = typeCycle[i % typeCycle.length];
    const sentDaysAgo = 3 + (i % 25);
    const sentAt = daysAgo(sentDaysAgo);
    const firstName = member.name.split(" ")[0];
    messageDocs.push({
      ownerUid,
      memberId: member._id,
      type,
      templateUsed: type,
      body: (SMS_BODIES[type] ?? SMS_BODIES.atRisk).replace("{name}", firstName),
      sentAt,
      status: "sent",
      direction: "outbound",
    });

    if (i % 5 < 2) {
      conversionBookings.push({
        ownerUid,
        memberId: member._id,
        classId: classes[i % classes.length]._id,
        bookedAt: daysAgo(Math.max(1, sentDaysAgo - 2)),
        attended: true,
        status: "confirmed",
        source: "staff",
        externalSource: "native",
        reminderSent: false,
      });
    }
  }

  const config = await getEffectiveConfig(ownerUid);
  const reminderTemplate = config.smsTemplates?.reminder ?? businessConfig.smsTemplates.reminder;
  const tomorrowBookings = insertedBookings.filter(
    (b) => b.reminderSent && b.bookedAt > new Date()
  );

  for (const booking of tomorrowBookings.slice(0, 3)) {
    const member = members.find((m) => String(m._id) === String(booking.memberId));
    const cls = classes.find((c) => String(c._id) === String(booking.classId));
    if (!member || !cls) continue;
    const firstName = member.name.split(" ")[0];
    const sentAt = booking.reminderSentAt ?? daysAgo(1);
    messageDocs.push({
      ownerUid,
      memberId: member._id,
      bookingId: booking._id,
      type: "reminder",
      templateUsed: "reminder",
      body: reminderTemplate
        .replace("{firstName}", firstName)
        .replace("{className}", cls.name)
        .replace("{classTime}", cls.time),
      sentAt,
      status: "sent",
      direction: "outbound",
    });
    if (booking.status === "confirmed") {
      messageDocs.push({
        ownerUid,
        memberId: member._id,
        bookingId: booking._id,
        type: "reminder",
        templateUsed: null,
        body: "Y",
        sentAt: new Date(sentAt.getTime() + 360_000),
        status: "received",
        direction: "inbound",
        replyKeyword: "confirm",
      });
    }
  }

  if (messageDocs.length > 0) await Message.insertMany(messageDocs);
  if (conversionBookings.length > 0) await Booking.insertMany(conversionBookings);

  const scored = await Member.find({ ownerUid }, { status: 1 });
  const counts = { new: 0, regular: 0, "at-risk": 0, lapsed: 0 };
  for (const m of scored) counts[m.status] = (counts[m.status] || 0) + 1;

  return {
    ownerUid,
    classes: classes.length,
    members: members.length,
    bookings: bookingDocs.length + conversionBookings.length,
    messages: messageDocs.length,
    retention: counts,
  };
}
