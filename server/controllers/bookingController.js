import Booking from "../models/Booking.js";
import Class from "../models/Class.js";
import Member from "../models/Member.js";
import { computeStatus } from "../services/retentionService.js";
import config from "../config/businessConfig.js";
import { sendTemplate } from "../services/messageService.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

export async function getBookings(req, res, next) {
  try {
    const bookings = await Booking.find(ownerFilter(getOwnerUid(req)))
      .populate("memberId", "name email")
      .populate("classId", "name instructor dayOfWeek time")
      .sort({ bookedAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, ...ownerFilter(getOwnerUid(req)) })
      .populate("memberId", "name email")
      .populate("classId", "name instructor dayOfWeek time");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const { memberId, classId } = req.body;

    const [member, cls] = await Promise.all([
      Member.findOne({ _id: memberId, ownerUid }),
      Class.findOne({ _id: classId, ownerUid }),
    ]);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const booking = await Booking.create({ ...req.body, ownerUid });

    let memberBookings;
    try {
      memberBookings = await Booking.find(
        { ownerUid, memberId: booking.memberId },
        { memberId: 1, bookedAt: 1 },
      );
    } catch (fetchErr) {
      console.error("post-booking fetch failed (cron will reconcile):", fetchErr);
    }

    try {
      if (memberBookings) {
        await Member.findByIdAndUpdate(member._id, {
          $set: { status: computeStatus(member, memberBookings) },
        });
      }
    } catch (syncErr) {
      console.error("post-booking status sync failed (cron will reconcile):", syncErr);
    }

    try {
      if (memberBookings && !member.milestoneSent && memberBookings.length >= config.milestoneVisits) {
        await sendTemplate(member._id, "milestone", { visitCount: memberBookings.length });
        await Member.findByIdAndUpdate(member._id, { $set: { milestoneSent: true } });
      }
    } catch (milestoneErr) {
      console.error("milestone SMS failed:", milestoneErr);
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

export async function updateBooking(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, ownerUid },
      req.body,
      { new: true, runValidators: true },
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function deleteBooking(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const booking = await Booking.findOneAndDelete({ _id: req.params.id, ownerUid });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch (error) {
    next(error);
  }
}
