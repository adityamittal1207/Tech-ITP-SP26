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
import config from "./config/businessConfig.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumnus";

const daysAgo = n => new Date(Date.now() - n * 86_400_000);

const classData = [
  { name: "Morning Flow",         instructor: "Sandra Lee",  dayOfWeek: "monday",    time: "07:00", durationMinutes: 60, capacity: 20, category: "yoga"     },
  { name: "Power Pilates",        instructor: "Tom Briggs",  dayOfWeek: "monday",    time: "09:30", durationMinutes: 50, capacity: 15, category: "pilates"  },
  { name: "HIIT Ignite",          instructor: "Mia Russo",   dayOfWeek: "tuesday",   time: "06:30", durationMinutes: 45, capacity: 25, category: "hiit"     },
  { name: "Spin Circuit",         instructor: "Chris Yates", dayOfWeek: "tuesday",   time: "18:00", durationMinutes: 50, capacity: 18, category: "spin"     },
  { name: "Strength Foundations", instructor: "Tom Briggs",  dayOfWeek: "wednesday", time: "07:30", durationMinutes: 60, capacity: 20, category: "strength" },
  { name: "Midday Yoga",          instructor: "Sandra Lee",  dayOfWeek: "wednesday", time: "12:00", durationMinutes: 45, capacity: 15, category: "yoga"     },
  { name: "Evening Pilates",      instructor: "Mia Russo",   dayOfWeek: "thursday",  time: "19:00", durationMinutes: 50, capacity: 15, category: "pilates"  },
  { name: "HIIT Express",         instructor: "Chris Yates", dayOfWeek: "thursday",  time: "06:30", durationMinutes: 30, capacity: 25, category: "hiit"     },
  { name: "Friday Spin",          instructor: "Chris Yates", dayOfWeek: "friday",    time: "07:00", durationMinutes: 50, capacity: 18, category: "spin"     },
  { name: "Core & Strength",      instructor: "Tom Briggs",  dayOfWeek: "friday",    time: "17:30", durationMinutes: 45, capacity: 20, category: "strength" },
  { name: "Weekend Warrior",      instructor: "Mia Russo",   dayOfWeek: "saturday",  time: "09:00", durationMinutes: 60, capacity: 25, category: "hiit"     },
  { name: "Restorative Yoga",     instructor: "Sandra Lee",  dayOfWeek: "saturday",  time: "11:00", durationMinutes: 75, capacity: 12, category: "yoga"     },
  { name: "Sunday Flow",          instructor: "Sandra Lee",  dayOfWeek: "sunday",    time: "10:00", durationMinutes: 60, capacity: 20, category: "yoga"     },
  { name: "Sunday Strength",      instructor: "Tom Briggs",  dayOfWeek: "sunday",    time: "12:00", durationMinutes: 60, capacity: 18, category: "strength" },
];

// bookingOffsets: array of "days ago" per booking. Smaller = more recent.
// Chosen so that computeStatus() produces the expected status for each member.
// source assignments tell a deliberate retention story:
//   referral/instagram → best retention; event/walk-in → lowest retention
const memberBookingData = [
  // ── NEW (joined ≤ 30 days ago) ──────────────────────────────────────
  { name: "Zoe Kim",        email: "zoe.kim@email.com",        phone: "+16195550201", membershipType: "basic",     source: "instagram", joinDaysAgo: 8,   bookingOffsets: [5] },
  { name: "Ben Torres",     email: "ben.torres@email.com",     phone: "+16195550202", membershipType: "premium",   source: "referral",  joinDaysAgo: 15,  bookingOffsets: [12, 10] },

  // ── REGULAR (last booking ≤ 14 days ago) ────────────────────────────
  { name: "Avery Chen",     email: "avery.chen@email.com",     phone: "+16195550101", membershipType: "unlimited", source: "referral",  joinDaysAgo: 540, bookingOffsets: [2, 9, 18, 26, 35, 44, 52, 61, 70, 78, 85, 91] },
  { name: "Jordan Malik",   email: "jordan.malik@email.com",   phone: "+16195550102", membershipType: "premium",   source: "referral",  joinDaysAgo: 365, bookingOffsets: [5, 14, 22, 31, 40, 50, 60, 72, 85] },
  { name: "Priya Nair",     email: "priya.nair@email.com",     phone: "+16195550103", membershipType: "unlimited", source: "website",   joinDaysAgo: 243, bookingOffsets: [1, 8, 16, 24, 33, 42, 51, 60, 68, 77, 85] },
  { name: "Sofia Reyes",    email: "sofia.reyes@email.com",    phone: "+16195550104", membershipType: "premium",   source: "google",    joinDaysAgo: 420, bookingOffsets: [3, 11, 20, 28, 37, 46, 56, 68, 80, 92] },
  { name: "Marcus Webb",    email: "marcus.webb@email.com",    phone: "+16195550105", membershipType: "basic",     source: "instagram", joinDaysAgo: 182, bookingOffsets: [7, 17, 28, 38, 50, 62, 75, 88] },

  // ── AT-RISK (last booking 15–19 days ago) ───────────────────────────
  { name: "Nina Kovacs",    email: "nina.kovacs@email.com",    phone: "+16195550106", membershipType: "unlimited", source: "event",     joinDaysAgo: 305, bookingOffsets: [16, 32, 48, 65, 82, 99, 115, 130] },
  { name: "Ethan Park",     email: "ethan.park@email.com",     phone: "+16195550107", membershipType: "premium",   source: "instagram", joinDaysAgo: 214, bookingOffsets: [18, 35, 52, 70, 88, 105, 120] },
  { name: "Chloe Andersen", email: "chloe.andersen@email.com", phone: "+16195550108", membershipType: "basic",     source: "walk-in",   joinDaysAgo: 122, bookingOffsets: [15, 29, 44, 60, 76, 92] },
  { name: "Aisha Patel",    email: "aisha.patel@email.com",    phone: "+16195550109", membershipType: "premium",   source: "event",     joinDaysAgo: 365, bookingOffsets: [19, 36, 54, 71, 89, 107, 125, 142, 158, 173] },

  // ── LAPSED (last booking > 21 days ago, or no bookings) ─────────────
  { name: "Liam Okafor",    email: "liam.okafor@email.com",    phone: "+16195550110", membershipType: "basic",     source: "walk-in",   joinDaysAgo: 608, bookingOffsets: [30, 65, 100, 135] },
  { name: "Ryan Nguyen",    email: "ryan.nguyen@email.com",    phone: "+16195550111", membershipType: "basic",     source: "walk-in",   joinDaysAgo: 305, bookingOffsets: [] },
  { name: "Diego Vargas",   email: "diego.vargas@email.com",   phone: "+16195550112", membershipType: "unlimited", source: "google",    joinDaysAgo: 730, bookingOffsets: [40, 80, 120, 165, 200] },
  { name: "Yuki Tanaka",    email: "yuki.tanaka@email.com",    phone: "+16195550113", membershipType: "premium",   source: "referral",  joinDaysAgo: 243, bookingOffsets: [28, 60] },
];
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

  // Insert members (strip bookingOffsets before saving)
  const memberDocs = memberBookingData.map(({ bookingOffsets, joinDaysAgo, ...fields }) => ({
    ...fields,
    joinDate: daysAgo(joinDaysAgo),
    milestoneSent: bookingOffsets.length >= config.milestoneVisits,
  }));
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
