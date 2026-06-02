import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import StudioSettings from "../models/StudioSettings.js";
import SyncLog from "../models/SyncLog.js";
import {
  buildBookings,
  buildSupplementalBookings,
  buildTodayBookings,
  buildTomorrowBookings,
  generateOperationalSeed,
} from "../data/operationalSeed.js";
import { getDemoTenantProfile } from "../data/demoTenantConfig.js";
import businessConfig from "../config/businessConfig.js";
import { resolveOccurrenceDateTime } from "./bookingService.js";
import { localDateKey, studioDayName, studioDateTimeUtc } from "../utils/studioTimezone.js";
import { getEffectiveConfig, buildDefaultSettings } from "./configService.js";
import { runRetentionScoring } from "./scoringJob.js";
import { seedDefaultSettings } from "./configService.js";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const hoursAgo = (n) => new Date(Date.now() - n * 3_600_000);
const minutesAgo = (n) => new Date(Date.now() - n * 60_000);

const SMS_BODIES = {
  atRisk: "Hi {name}, we've missed you! It's been a while since your last class. Come back and join us.",
  winback: "Hi {name}, we haven't seen you in a while. We'd love to have you back — check the latest schedule and book your spot.",
  welcome: "Welcome to Tether, {name}! We're excited to have you. Book your first class and let's get started.",
};

export async function clearTenantData(ownerUid) {
  const filter = { ownerUid };
  const [bookings, classes, members, messages, settings, syncLogs] = await Promise.all([
    Booking.deleteMany(filter),
    Class.deleteMany(filter),
    Member.deleteMany(filter),
    Message.deleteMany(filter),
    StudioSettings.deleteMany(filter),
    SyncLog.deleteMany(filter),
  ]);
  return {
    bookings: bookings.deletedCount,
    classes: classes.deletedCount,
    members: members.deletedCount,
    messages: messages.deletedCount,
    settings: settings.deletedCount,
    syncLogs: syncLogs.deletedCount,
  };
}

function applyDemoProfileToSeed(demoProfile, memberCount) {
  const count = demoProfile?.memberCount ?? memberCount;
  const generated = generateOperationalSeed(count);
  if (!demoProfile?.ownerMember) return generated;

  const owner = demoProfile.ownerMember;
  const ownerProfile = {
    ...owner,
    bookingOffsets: owner.bookingOffsets ?? [5, 12, 20],
  };
  return {
    ...generated,
    memberProfiles: [ownerProfile, ...generated.memberProfiles.slice(1)],
    memberDocs: [
      {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        membershipType: owner.membershipType ?? "unlimited",
        joinSource: owner.joinSource ?? "Referral",
        source: "referral",
        joinDate: daysAgo(owner.joinDaysAgo ?? 365),
        isActive: true,
        tags: owner.tags ?? ["Owner"],
        notes: owner.notes ?? "",
      },
      ...generated.memberDocs.slice(1),
    ],
  };
}

async function applyDemoStudioSettings(ownerUid, demoProfile) {
  const base = buildDefaultSettings(ownerUid);
  const patch = {
    studioName: demoProfile.studioName ?? base.studioName,
    studioOwner: demoProfile.studioOwner ?? base.studioOwner,
    city: demoProfile.city ?? base.city,
    replyToEmail: demoProfile.replyToEmail ?? base.replyToEmail,
    bookingSlug: demoProfile.bookingSlug ?? base.bookingSlug,
    publicBookingEnabled: demoProfile.publicBookingEnabled ?? true,
    retention: { ...base.retention },
    reminderTiming: base.reminderTiming,
    smsTemplates: { ...base.smsTemplates },
  };
  await StudioSettings.findOneAndUpdate(
    { ownerUid, key: "main" },
    { $set: patch },
    { upsert: true },
  );
}

/**
 * One fully booked class today with an empty waitlist — Maya is not on the roster.
 * Used for live waitlist + Twilio SMS demo on Schedule.
 */
async function seedWaitlistSmsDemoClass(ownerUid, demoProfile, members) {
  const cfg = demoProfile?.waitlistSmsDemo;
  if (!cfg) return null;

  const todayKey = localDateKey();
  const todayDow = studioDayName();
  const ownerMember =
    members.find((m) => m.name === demoProfile.ownerMember?.name) ?? members[0];

  if (demoProfile.ownerMember?.phone) {
    await Member.findByIdAndUpdate(ownerMember._id, {
      phone: demoProfile.ownerMember.phone,
    });
    ownerMember.phone = demoProfile.ownerMember.phone;
  }

  let demoClass = await Class.findOne({ ownerUid, name: cfg.className });
  if (!demoClass) {
    demoClass = await Class.create({
      ownerUid,
      name: cfg.className,
      instructor: cfg.instructor ?? "Mia Russo",
      dayOfWeek: todayDow,
      time: cfg.time ?? "18:00",
      durationMinutes: 45,
      capacity: cfg.capacity ?? 6,
      category: cfg.category ?? "hiit",
    });
  } else {
    await Class.findByIdAndUpdate(demoClass._id, {
      $set: {
        instructor: cfg.instructor ?? demoClass.instructor,
        dayOfWeek: todayDow,
        time: cfg.time ?? demoClass.time,
        capacity: cfg.capacity ?? demoClass.capacity,
      },
    });
    demoClass = await Class.findById(demoClass._id);
  }

  const bookedAt = resolveOccurrenceDateTime(demoClass, todayKey);
  const occStart = new Date(bookedAt);
  const occEnd = new Date(occStart.getTime() + 60_000);

  await Booking.deleteMany({
    ownerUid,
    classId: demoClass._id,
    bookedAt: { $gte: occStart, $lt: occEnd },
  });

  const capacity = demoClass.capacity;
  const fillerMembers = members.filter((m) => String(m._id) !== String(ownerMember._id));
  const bookedIds = [];
  let fillerIdx = 0;

  for (let i = 0; i < capacity && fillerIdx < fillerMembers.length; i++) {
    const member = fillerMembers[fillerIdx++];
    const doc = await Booking.create({
      ownerUid,
      memberId: member._id,
      classId: demoClass._id,
      bookedAt,
      status: "booked",
      source: "staff",
      externalSource: "native",
      attended: false,
      reminderSent: false,
    });
    bookedIds.push(doc._id);
  }

  return {
    classId: String(demoClass._id),
    className: demoClass.name,
    time: demoClass.time,
    date: todayKey,
    capacity,
    booked: bookedIds.length,
    ownerMemberId: String(ownerMember._id),
    ownerMemberName: ownerMember.name,
    ownerPhone: ownerMember.phone,
  };
}

/**
 * Recent bookings, signups, SMS replies, and a cancel — powers Home activity feed (24h window).
 */
async function appendDemoActivityLayer(ownerUid, { members, classes, insertedBookings }) {
  const todayKey = localDateKey();
  const todayDow = studioDayName();
  const todayClass = classes.find((c) => c.dayOfWeek === todayDow);
  if (!todayClass) return { extraMembers: 0, extraMessages: 0, extraBookings: 0 };

  const classIdx = classes.indexOf(todayClass);
  const [hStr, mStr] = todayClass.time.split(":");
  const todayOccurrence = studioDateTimeUtc(todayKey, Number(hStr), Number(mStr));

  const RECENT_SIGNUPS = [
    { name: "Reed Aaberg", email: "reed.aaberg@tidewatermembers.com", phone: "+16195551201", joinSource: "Referral", hours: 1 },
    { name: "Ines Quintero", email: "ines.quintero@tidewatermembers.com", phone: "+16195551202", joinSource: "Instagram", hours: 3 },
    { name: "Knox Aldridge", email: "knox.aldridge@tidewatermembers.com", phone: "+16195551203", joinSource: "Walk-in", hours: 5 },
    { name: "Pia Solis", email: "pia.solis@tidewatermembers.com", phone: "+16195551204", joinSource: "Groupon", hours: 8 },
  ];

  const signupSource = {
    Referral: "referral",
    Instagram: "instagram",
    "Walk-in": "walk-in",
    Groupon: "groupon",
  };

  const signupMembers = await Member.insertMany(
    RECENT_SIGNUPS.map((s) => ({
      ownerUid,
      name: s.name,
      email: s.email,
      phone: s.phone,
      membershipType: "premium",
      joinSource: s.joinSource,
      source: signupSource[s.joinSource] ?? "walk-in",
      joinDate: hoursAgo(s.hours),
      isActive: true,
      status: "new",
      tags: ["New"],
      notes: "",
      milestoneSent: false,
    })),
  );

  const signupBookings = await Booking.insertMany(
    signupMembers.map((m, i) => ({
      ownerUid,
      memberId: m._id,
      classId: todayClass._id,
      bookedAt: minutesAgo(20 + i * 7),
      status: "booked",
      source: i % 2 === 0 ? "public" : "staff",
      externalSource: "native",
      attended: false,
      reminderSent: false,
    })),
  );

  const waitlistBooking = insertedBookings.find((b) => b.status === "waitlisted");
  if (waitlistBooking) {
    await Booking.findByIdAndUpdate(waitlistBooking._id, {
      $set: { bookedAt: minutesAgo(45) },
    });
  }

  const bookedToday = insertedBookings.filter(
    (b) => b.status === "booked" && localDateKey(b.bookedAt) === todayKey,
  );
  if (bookedToday.length > 1) {
    const toCancel = bookedToday[1];
    await Booking.findByIdAndUpdate(toCancel._id, {
      $set: {
        status: "cancelled",
        cancelledAt: hoursAgo(2),
        attended: false,
      },
    });
  }

  const atRiskSample = members.find((m) => m.status === "at-risk") ?? members[10];
  const regularSample = members.find((m) => m.status === "regular") ?? members[5];

  const activityMessages = [
    {
      ownerUid,
      memberId: regularSample._id,
      type: "reminder",
      templateUsed: "reminder",
      body: "Hi! Reminder: Morning Flow is today at 7:00 AM. Reply C to cancel.",
      sentAt: hoursAgo(4),
      status: "sent",
      direction: "outbound",
    },
    {
      ownerUid,
      memberId: regularSample._id,
      type: "confirmAck",
      templateUsed: "confirmAck",
      body: "Y",
      sentAt: hoursAgo(3.5),
      status: "received",
      direction: "inbound",
      replyKeyword: "confirm",
    },
    {
      ownerUid,
      memberId: atRiskSample._id,
      type: "atRisk",
      templateUsed: "atRisk",
      body: `Hi ${atRiskSample.name.split(" ")[0]}, we've missed you at Tidewater — hope to see you this week!`,
      sentAt: hoursAgo(6),
      status: "sent",
      direction: "outbound",
    },
    {
      ownerUid,
      memberId: signupMembers[0]._id,
      type: "welcome",
      templateUsed: "welcome",
      body: `Welcome to Tidewater, ${signupMembers[0].name.split(" ")[0]}! Book your first class anytime.`,
      sentAt: hoursAgo(0.75),
      status: "sent",
      direction: "outbound",
    },
    {
      ownerUid,
      memberId: signupMembers[1]._id,
      type: "cancelAck",
      templateUsed: "cancelAck",
      body: "CANCEL",
      sentAt: hoursAgo(2.5),
      status: "received",
      direction: "inbound",
      replyKeyword: "cancel",
    },
  ];

  await Message.insertMany(activityMessages);

  const recentPublicBooking = await Booking.create({
    ownerUid,
    memberId: signupMembers[2]._id,
    classId: classes[(classIdx + 2) % classes.length]._id,
    bookedAt: minutesAgo(12),
    status: "booked",
    source: "public",
    externalSource: "native",
    attended: false,
    reminderSent: false,
  });

  await SyncLog.create({
    ownerUid,
    type: "csv_import",
    ranAt: daysAgo(6),
    summary: { source: "mindbody", members: 42, classes: 14, bookings: 318 },
  });

  return {
    extraMembers: signupMembers.length,
    extraMessages: activityMessages.length,
    extraBookings: signupBookings.length + 1 + (waitlistBooking ? 0 : 0),
    recentPublicBooking: recentPublicBooking._id,
  };
}

/**
 * Seed demo studio data for one Firebase Auth UID (MongoDB ownerUid).
 */
export async function seedTenant(ownerUid, { memberCount = 150 } = {}) {
  const demoProfile = getDemoTenantProfile(ownerUid);
  const effectiveCount = demoProfile?.memberCount ?? memberCount;

  const cleared = await clearTenantData(ownerUid);
  console.log(`  Cleared tenant ${ownerUid}:`, cleared);

  const { memberProfiles, memberDocs, classData } = applyDemoProfileToSeed(demoProfile, effectiveCount);

  await seedDefaultSettings(ownerUid);
  if (demoProfile) {
    await applyDemoStudioSettings(ownerUid, demoProfile);
  } else {
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
  }

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

  const todayKey = localDateKey();
  const todayDow = studioDayName();
  const todayClassIdxSet = new Set(
    classes.map((c, i) => (c.dayOfWeek === todayDow ? i : -1)).filter((i) => i >= 0),
  );
  const isTodayOccurrence = (b) =>
    todayClassIdxSet.has(b.classIdx) && localDateKey(b.bookedAt) === todayKey;

  const todaySpecs = buildTodayBookings(memberProfiles, classes);
  const historicalSpecs = [
    ...buildBookings(memberProfiles, classes),
    ...buildSupplementalBookings(memberProfiles, classes),
    ...buildTomorrowBookings(memberProfiles, classes),
  ].filter((b) => !isTodayOccurrence(b));

  const seenBookingKeys = new Set();
  const allSpecs = [...historicalSpecs, ...todaySpecs];
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
        status: "booked",
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
  }

  if (messageDocs.length > 0) await Message.insertMany(messageDocs);
  if (conversionBookings.length > 0) await Booking.insertMany(conversionBookings);

  await runRetentionScoring(ownerUid);

  let activity = { extraMembers: 0, extraMessages: 0, extraBookings: 0 };
  let waitlistSmsDemo = null;
  if (demoProfile) {
    const scoredForActivity = await Member.find({ ownerUid });
    activity = await appendDemoActivityLayer(ownerUid, {
      members: scoredForActivity,
      classes,
      insertedBookings,
    });
    waitlistSmsDemo = await seedWaitlistSmsDemoClass(ownerUid, demoProfile, scoredForActivity);
    await runRetentionScoring(ownerUid);
  }

  const scored = await Member.find({ ownerUid }, { status: 1 });
  const counts = { new: 0, regular: 0, "at-risk": 0, lapsed: 0 };
  for (const m of scored) counts[m.status] = (counts[m.status] || 0) + 1;

  const settings = await StudioSettings.findOne({ ownerUid, key: "main" });

  return {
    ownerUid,
    studioName: settings?.studioName,
    bookingSlug: settings?.bookingSlug,
    classes: classes.length,
    members: members.length + (activity.extraMembers ?? 0),
    bookings:
      bookingDocs.length +
      conversionBookings.length +
      (activity.extraBookings ?? 0),
    messages: messageDocs.length + (activity.extraMessages ?? 0),
    retention: counts,
    demoActivity: activity,
    waitlistSmsDemo,
  };
}
