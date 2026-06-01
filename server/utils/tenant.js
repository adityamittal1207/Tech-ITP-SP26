import { isFirebaseAuthEnabled } from "../config/firebaseAdmin.js";

/** Studio owner — all seeded/demo data belongs to this Firebase UID. */
export const PRIMARY_OWNER_UID =
  process.env.PRIMARY_OWNER_UID || "BuwHZGfenUMFrR8LnJZ6kUiIbyk1";

export function ownerFilter(ownerUid) {
  return { ownerUid };
}

export function getOwnerUid(req) {
  if (req.user?.uid) return req.user.uid;
  if (!isFirebaseAuthEnabled) return PRIMARY_OWNER_UID;
  const err = new Error("Authentication required");
  err.status = 401;
  throw err;
}

export async function assertMemberOwned(memberId, ownerUid) {
  const Member = (await import("../models/Member.js")).default;
  const member = await Member.findOne({ _id: memberId, ownerUid });
  if (!member) {
    const err = new Error("Member not found");
    err.status = 404;
    throw err;
  }
  return member;
}
