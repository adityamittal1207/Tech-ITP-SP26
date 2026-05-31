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

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tether";

async function seed() {
  await connectDB(MONGODB_URI);

  const { memberProfiles, memberDocs, classData } = generateOperationalSeed(150);

  await Booking.deleteMany({});
  await Class.deleteMany({});
  await Member.deleteMany({});
  await Message.deleteMany({});
  console.log("Cleared existing data");

  const classes = await Class.insertMany(classData);
  console.log(`Inserted ${classes.length} classes`);

  const members = await Member.insertMany(memberDocs);
  console.log(`Inserted ${members.length} members`);

  const bookingSpecs = buildBookings(memberProfiles, classes);
  const bookings = bookingSpecs.map((b) => ({
    memberId: members[b.memberIdx]._id,
    classId: classes[b.classIdx]._id,
    bookedAt: b.bookedAt,
    attended: b.attended,
  }));
  await Booking.insertMany(bookings);
  console.log(`Inserted ${bookings.length} bookings`);

  await runRetentionScoring();

  const scored = await Member.find({}, { status: 1 });
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
