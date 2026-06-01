import Booking from "../models/Booking.js";
import Member from "../models/Member.js";
import Message from "../models/Message.js";
import { sendTemplate } from "../services/messageService.js";
import { normalizePhone } from "../services/phone.js";
import { enrichMember, groupBookingsByMember } from "../services/memberStats.js";

export async function getMembers(_req, res, next) {
  try {
    const [members, bookings] = await Promise.all([
      Member.find().sort({ createdAt: -1 }),
      Booking.find({}, { memberId: 1, bookedAt: 1, attended: 1 }),
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
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    const [bookings, messages] = await Promise.all([
      Booking.find({ memberId: member._id }, { memberId: 1, bookedAt: 1, attended: 1 }).sort({
        bookedAt: -1,
      }),
      Message.find({ memberId: member._id }).sort({ sentAt: -1 }).limit(10),
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
    if (req.body.phone) {
      try {
        req.body.phone = normalizePhone(req.body.phone);
      } catch (err) {
        return next(Object.assign(err, { status: 400 }));
      }
    }
    const member = await Member.create(req.body);
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
    if (req.body.phone) {
      try {
        req.body.phone = normalizePhone(req.body.phone);
      } catch (err) {
        return next(Object.assign(err, { status: 400 }));
      }
    }
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (error) {
    next(error);
  }
}

export async function deleteMember(req, res, next) {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Member deleted" });
  } catch (error) {
    next(error);
  }
}
