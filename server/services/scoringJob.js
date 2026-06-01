import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import { computeStatus } from "./retentionService.js";

export async function runRetentionScoring(ownerUid) {
  const filter = ownerUid ? { ownerUid } : {};
  const [members, bookings] = await Promise.all([
    Member.find(filter),
    Booking.find({ ...filter, status: { $ne: "cancelled" } }, { memberId: 1, bookedAt: 1, attended: 1 }),
  ]);

  const byMember = {};
  for (const b of bookings) {
    const id = String(b.memberId);
    (byMember[id] ??= []).push(b);
  }

  const ops = members.map(m => ({
    updateOne: {
      filter: { _id: m._id },
      update: { $set: { status: computeStatus(m, byMember[String(m._id)] ?? []) } },
    },
  }));

  if (ops.length > 0) {
    await Member.bulkWrite(ops);
  }
  console.log(`[retention] scored ${ops.length} members`);
}
