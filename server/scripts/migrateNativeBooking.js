/**
 * Backfill native booking fields on existing MongoDB data.
 * Run: node server/scripts/migrateNativeBooking.js
 * Full reseed: node server/seed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Message from "../models/Message.js";
import StudioSettings from "../models/StudioSettings.js";
import { resolveOccurrenceDateTime, localDateKey } from "../services/bookingService.js";
import { PRIMARY_OWNER_UID } from "../utils/tenant.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumnus";
const RESEED = process.argv.includes("--reseed");

async function backfillBookings(ownerUid) {
  const classes = await Class.find({ ownerUid });
  const classById = Object.fromEntries(classes.map((c) => [String(c._id), c]));

  const bookings = await Booking.find({ ownerUid });
  let updated = 0;

  for (const booking of bookings) {
    const patch = {};
    if (!booking.status) patch.status = booking.attended ? "booked" : "booked";
    if (!booking.source) {
      patch.source = booking.externalSource === "mindbody" ? "import" : "staff";
    }
    if (!booking.externalSource) patch.externalSource = "native";
    if (booking.reminderSent && !booking.reminderSentAt) {
      patch.reminderSentAt = new Date(booking.bookedAt.getTime() - 24 * 3_600_000);
    }

    const cls = classById[String(booking.classId)];
    if (cls) {
      const aligned = resolveOccurrenceDateTime(cls, localDateKey(booking.bookedAt));
      const driftMs = Math.abs(aligned.getTime() - booking.bookedAt.getTime());
      if (driftMs > 3_600_000) {
        patch.bookedAt = aligned;
      }
    }

    if (Object.keys(patch).length > 0) {
      await Booking.updateOne({ _id: booking._id }, { $set: patch });
      updated++;
    }
  }

  return { total: bookings.length, updated };
}

async function backfillMessages(ownerUid) {
  const result = await Message.updateMany(
    { ownerUid, direction: { $exists: false } },
    { $set: { direction: "outbound" } }
  );
  return result.modifiedCount;
}

async function backfillSettings(ownerUid) {
  const result = await StudioSettings.updateMany(
    { ownerUid },
    {
      $set: {
        bookingSlug: "tether-encinitas",
        publicBookingEnabled: true,
      },
    },
    { upsert: false }
  );
  if (result.matchedCount === 0) {
    const { seedDefaultSettings } = await import("../services/configService.js");
    await seedDefaultSettings(ownerUid);
    await StudioSettings.updateOne(
      { ownerUid, key: "main" },
      { $set: { bookingSlug: "tether-encinitas", publicBookingEnabled: true } }
    );
    return 1;
  }
  return result.modifiedCount;
}

async function main() {
  await connectDB(MONGODB_URI);
  const ownerUid = process.env.PRIMARY_OWNER_UID || PRIMARY_OWNER_UID;

  if (RESEED) {
    console.log(`Reseeding tenant ${ownerUid}…`);
    const { seedTenant } = await import("../services/tenantSeedService.js");
    const summary = await seedTenant(ownerUid);
    console.log("Reseed complete:", summary);
  } else {
    console.log(`Migrating tenant ${ownerUid}…`);
    const settings = await backfillSettings(ownerUid);
    const bookings = await backfillBookings(ownerUid);
    const messages = await backfillMessages(ownerUid);
    console.log(`  Studio settings updated: ${settings}`);
    console.log(`  Bookings: ${bookings.updated}/${bookings.total} patched`);
    console.log(`  Messages direction backfilled: ${messages}`);
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
