import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import { sendTemplate } from "../services/messageService.js";
import { normalizePhone } from "../services/phone.js";
import { enrichMember, groupBookingsByMember } from "../services/memberStats.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

export async function getMembers(req, res, next) {
  try {
    const filter = ownerFilter(getOwnerUid(req));
    const [members, bookings] = await Promise.all([
      Member.find(filter).sort({ createdAt: -1 }),
      Booking.find(filter, { memberId: 1, bookedAt: 1, attended: 1 }),
    ]);
    const byMember = groupBookingsByMember(bookings);
    res.json(
      members.map((m) => enrichMember(m, byMember[String(m._id)] ?? []))
    );
  } catch (error) {
    next(error);
  }
}

export async function getMember(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const member = await Member.findOne({ _id: req.params.id, ownerUid });
    if (!member) return res.status(404).json({ message: "Member not found" });
    const [bookings, messages] = await Promise.all([
      Booking.find({ ownerUid, memberId: member._id }, { memberId: 1, bookedAt: 1, attended: 1 }).sort({
        bookedAt: -1,
      }),
      Message.find({ ownerUid, memberId: member._id }).sort({ sentAt: -1 }).limit(10),
    ]);
    res.json({
      ...enrichMember(member, bookings),
      messages,
    });
  } catch (error) {
    next(error);
  }
}

export async function createMember(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    if (req.body.phone) {
      try {
        req.body.phone = normalizePhone(req.body.phone);
      } catch (err) {
        return next(Object.assign(err, { status: 400 }));
      }
    }
    const member = await Member.create({ ...req.body, ownerUid });
    if (member.phone) {
      try {
        await sendTemplate(member._id, "welcome");
      } catch (err) {
        console.error("Welcome SMS failed:", err.message);
      }
    }
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
}

export async function updateMember(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    if (req.body.phone) {
      try {
        req.body.phone = normalizePhone(req.body.phone);
      } catch (err) {
        return next(Object.assign(err, { status: 400 }));
      }
    }
    const member = await Member.findOneAndUpdate(
      { _id: req.params.id, ownerUid },
      req.body,
      { new: true, runValidators: true },
    );
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (error) {
    next(error);
  }
}

export async function deleteMember(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const member = await Member.findOneAndDelete({ _id: req.params.id, ownerUid });
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Member deleted" });
  } catch (error) {
    next(error);
  }
}
