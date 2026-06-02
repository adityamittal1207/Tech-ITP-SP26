/**
 * Seed demo data for specific Firebase Auth UIDs (MongoDB ownerUid).
 *
 * Usage:
 *   node --import dotenv/config scripts/seedFirebaseTenants.js
 *   node --import dotenv/config scripts/seedFirebaseTenants.js UID1 UID2
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { seedTenant } from "../services/tenantSeedService.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tether";

const DEFAULT_UIDS = [
  "CJKpE4LxDbS24OVIUIgD5SYpnyc2",
  "HdxBW17E6dacJlbNmPdd45SmbOu2",
  "BuwHZGfenUMFrR8LnJZ6kUiIbyk1",
];

async function main() {
  const uids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_UIDS;

  await connectDB(MONGODB_URI);
  console.log(`Seeding ${uids.length} tenant(s)…\n`);

  for (const ownerUid of uids) {
    console.log(`── ${ownerUid} ──`);
    const summary = await seedTenant(ownerUid);
    if (summary.studioName) {
      console.log(`  Studio: ${summary.studioName} (${summary.bookingSlug ?? "no slug"})`);
    }
    console.log(
      `  ${summary.classes} classes, ${summary.members} members, ${summary.bookings} bookings, ${summary.messages} messages`,
    );
    console.log(
      `  Retention: new=${summary.retention.new} regular=${summary.retention.regular} at-risk=${summary.retention["at-risk"]} lapsed=${summary.retention.lapsed}`,
    );
    if (summary.waitlistSmsDemo) {
      const w = summary.waitlistSmsDemo;
      console.log(
        `  SMS waitlist demo: "${w.className}" today ${w.time} — ${w.booked}/${w.capacity} booked, 0 waitlist (use ${w.ownerMemberName} for your phone)`,
      );
    }
    console.log("");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
