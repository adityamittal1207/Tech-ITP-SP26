import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import Booking from "./models/Booking.js";
import Class from "./models/Class.js";
import Member from "./models/Member.js";
import Message from "./models/Message.js";
import {
  buildBookings,
  generateOperationalSeed,
} from "./data/operationalSeed.js";
import { runRetentionScoring } from "./services/scoringJob.js";
import { seedDefaultSettings } from "./services/configService.js";
import { PRIMARY_OWNER_UID } from "./utils/tenant.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumnus";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const SMS_BODIES = {
  atRisk: "Hi {name}, we've missed you! It's been a while since your last class. Come back and join us.",
  winback: "Hi {name}, we haven't seen you in a while. We'd love to have you back — check the latest schedule and book your spot.",
  welcome: "Welcome to Tether, {name}! We're excited to have you. Book your first class and let's get started.",
};

async function seed() {
  await connectDB(MONGODB_URI);

  const { memberProfiles, memberDocs, classData } = generateOperationalSeed(150);

  await Booking.deleteMany({});
  await Class.deleteMany({});
  await Member.deleteMany({});
  await Message.deleteMany({});
  console.log("Cleared existing data");

  const ownerUid = PRIMARY_OWNER_UID;
  await seedDefaultSettings(ownerUid);

  const classes = await Class.insertMany(
    classData.map((doc) => ({ ...doc, ownerUid })),
  );
  console.log(`Inserted ${classes.length} classes`);

  const members = await Member.insertMany(
    memberDocs.map((doc) => ({
      ...doc,
      ownerUid,
      milestoneSent: false,
    }))
  );
  console.log(`Inserted ${members.length} members`);

  const bookingSpecs = buildBookings(memberProfiles, classes);
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  let reminderToggle = 0;

  const bookingDocs = bookingSpecs.map((b) => {
    const bookedAt = b.bookedAt;
    const recent = bookedAt.getTime() >= thirtyDaysAgo;
    return {
      ownerUid,
      memberId: members[b.memberIdx]._id,
      classId: classes[b.classIdx]._id,
      bookedAt,
      attended: b.attended,
      reminderSent: recent ? reminderToggle++ % 2 === 0 : false,
    };
  });
  await Booking.insertMany(bookingDocs);
  console.log(`Inserted ${bookingDocs.length} bookings`);

  await runRetentionScoring(ownerUid);

  const scoredMembers = await Member.find({ ownerUid });
  const outreachPool = scoredMembers.filter(
    (m) => m.status === "at-risk" || m.status === "lapsed"
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
    });

    if (i % 5 < 2) {
      conversionBookings.push({
        ownerUid,
        memberId: member._id,
        classId: classes[i % classes.length]._id,
        bookedAt: daysAgo(Math.max(1, sentDaysAgo - 2)),
        attended: true,
        reminderSent: false,
      });
    }
  }

  if (messageDocs.length > 0) {
    await Message.insertMany(messageDocs);
    console.log(`Inserted ${messageDocs.length} demo messages`);
  }
  if (conversionBookings.length > 0) {
    await Booking.insertMany(conversionBookings);
    console.log(`Inserted ${conversionBookings.length} post-outreach bookings`);
  }

  const scored = await Member.find({ ownerUid }, { status: 1 });
  const counts = { new: 0, regular: 0, "at-risk": 0, lapsed: 0 };
  for (const m of scored) counts[m.status] = (counts[m.status] || 0) + 1;
  console.log("\n── Retention Summary ──");
  console.log(`  New:     ${counts.new}`);
  console.log(`  Regular: ${counts.regular}`);
  console.log(`  At-Risk: ${counts["at-risk"]}`);
  console.log(`  Lapsed:  ${counts.lapsed}`);
  console.log(`  Total:   ${scored.length}`);

  await mongoose.disconnect();
  console.log("\nDone");
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
