import Class from "../models/Class.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";
import {
  countActiveBookings,
  resolveOccurrenceDateTime,
} from "../services/bookingService.js";

export async function getClasses(req, res, next) {
  try {
    const classes = await Class.find(ownerFilter(getOwnerUid(req))).sort({ dayOfWeek: 1, time: 1 });
    res.json(classes);
  } catch (error) {
    next(error);
  }
}

export async function getClass(req, res, next) {
  try {
    const cls = await Class.findOne({ _id: req.params.id, ...ownerFilter(getOwnerUid(req)) });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (error) {
    next(error);
  }
}

export async function createClass(req, res, next) {
  try {
    const cls = await Class.create({ ...req.body, ownerUid: getOwnerUid(req) });
    res.status(201).json(cls);
  } catch (error) {
    next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const { occurrenceDate, ...updates } = req.body;
    const existing = await Class.findOne({ _id: req.params.id, ownerUid });
    if (!existing) return res.status(404).json({ message: "Class not found" });

    if (typeof updates.capacity === "number" && occurrenceDate) {
      const bookedAt = resolveOccurrenceDateTime(existing, occurrenceDate);
      const booked = await countActiveBookings(ownerUid, existing._id, bookedAt);
      if (updates.capacity < booked) {
        return res.status(400).json({
          message: `Class size cannot be below ${booked} — that many members are already booked.`,
        });
      }
    }

    const cls = await Class.findOneAndUpdate(
      { _id: req.params.id, ownerUid },
      updates,
      { new: true, runValidators: true },
    );

    res.json(cls);
  } catch (error) {
    next(error);
  }
}

export async function deleteClass(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    const cls = await Class.findOneAndDelete({ _id: req.params.id, ownerUid });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted" });
  } catch (error) {
    next(error);
  }
}
