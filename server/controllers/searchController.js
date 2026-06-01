import Class from "../models/Class.js";
import Member from "../models/Member.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

export async function search(req, res, next) {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      return res.json({ clients: [], classes: [] });
    }

    const ownerUid = getOwnerUid(req);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [members, classes] = await Promise.all([
      Member.find({ ...ownerFilter(ownerUid), $or: [{ name: regex }, { email: regex }] })
        .limit(8)
        .select("name email status"),
      Class.find({ ...ownerFilter(ownerUid), $or: [{ name: regex }, { instructor: regex }] })
        .limit(8)
        .select("name instructor dayOfWeek time"),
    ]);

    res.json({
      clients: members.map((m) => ({
        id: String(m._id),
        name: m.name,
        email: m.email,
        status: m.status,
      })),
      classes: classes.map((c) => ({
        id: String(c._id),
        name: c.name,
        instructor: c.instructor,
        dayOfWeek: c.dayOfWeek,
        time: c.time,
      })),
    });
  } catch (error) {
    next(error);
  }
}
