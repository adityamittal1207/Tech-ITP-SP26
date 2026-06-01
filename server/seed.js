import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { seedTenant } from "./services/tenantSeedService.js";
import { PRIMARY_OWNER_UID } from "./utils/tenant.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumnus";

async function seed() {
  await connectDB(MONGODB_URI);

  const ownerUid = PRIMARY_OWNER_UID;
  console.log(`Seeding primary tenant: ${ownerUid}\n`);

  const summary = await seedTenant(ownerUid);
  console.log(
    `Inserted ${summary.classes} classes, ${summary.members} members, ${summary.bookings} bookings, ${summary.messages} messages`,
  );
  console.log("\n── Retention Summary ──");
  console.log(`  New:     ${summary.retention.new}`);
  console.log(`  Regular: ${summary.retention.regular}`);
  console.log(`  At-Risk: ${summary.retention["at-risk"]}`);
  console.log(`  Lapsed:  ${summary.retention.lapsed}`);
  console.log(`  Total:   ${summary.members}`);

  await mongoose.disconnect();
  console.log("\nDone");
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
