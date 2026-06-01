import Class from "../models/Class.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

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
    const cls = await Class.findOneAndUpdate(
      { _id: req.params.id, ownerUid },
      req.body,
      { new: true, runValidators: true },
    );
    if (!cls) return res.status(404).json({ message: "Class not found" });
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
