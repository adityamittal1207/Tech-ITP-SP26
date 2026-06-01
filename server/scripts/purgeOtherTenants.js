/**
 * Assign all legacy data to PRIMARY_OWNER_UID, remove data for other UIDs,
 * and delete other Firebase Auth users.
 *
 * Usage: npm run purge-tenants --prefix server
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { admin, isFirebaseAuthEnabled } from "../config/firebaseAdmin.js";
import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import StudioData from "../models/StudioData.js";
import StudioSettings from "../models/StudioSettings.js";
import SyncLog from "../models/SyncLog.js";
import { PRIMARY_OWNER_UID } from "../utils/tenant.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tether";

const COLLECTIONS = [
  { model: Member, label: "members" },
  { model: Class, label: "classes" },
  { model: Booking, label: "bookings" },
  { model: Message, label: "messages" },
  { model: StudioSettings, label: "studio settings" },
  { model: SyncLog, label: "sync logs" },
];

async function migrateMongo() {
  console.log(`Primary owner UID: ${PRIMARY_OWNER_UID}\n`);

  const legacyRemoved = await StudioData.deleteMany({});
  console.log(`studio data (legacy): removed ${legacyRemoved.deletedCount}`);

  for (const { model, label } of COLLECTIONS) {
    const assigned = await model.updateMany(
      { $or: [{ ownerUid: { $exists: false } }, { ownerUid: null }, { ownerUid: "" }] },
      { $set: { ownerUid: PRIMARY_OWNER_UID } },
    );
    const removed = await model.deleteMany({
      ownerUid: { $exists: true, $nin: [PRIMARY_OWNER_UID, null, ""] },
    });
    console.log(
      `${label}: assigned ${assigned.modifiedCount}, removed ${removed.deletedCount}`,
    );
  }

  // Legacy StudioData used `key` without ownerUid
  await StudioData.deleteMany({
    ownerUid: { $exists: true, $nin: [PRIMARY_OWNER_UID, null, ""] },
  });
}

async function purgeFirebaseUsers() {
  if (!isFirebaseAuthEnabled) {
    console.log("\nFirebase Admin not configured — skipped Auth user cleanup");
    return;
  }

  let deleted = 0;
  let kept = 0;
  let pageToken;

  do {
    const list = await admin.auth().listUsers(1000, pageToken);
    for (const user of list.users) {
      if (user.uid === PRIMARY_OWNER_UID) {
        kept++;
        console.log(`Keeping Firebase user: ${user.email ?? user.uid}`);
        continue;
      }
      await admin.auth().deleteUser(user.uid);
      deleted++;
      console.log(`Deleted Firebase user: ${user.email ?? user.uid} (${user.uid})`);
    }
    pageToken = list.pageToken;
  } while (pageToken);

  console.log(`\nFirebase: kept ${kept}, deleted ${deleted}`);
}

async function main() {
  await connectDB(MONGODB_URI);
  await migrateMongo();
  await purgeFirebaseUsers();
  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
