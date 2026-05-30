import Class from "../models/Class.js";

export async function getClasses(_req, res, next) {
  try {
    const classes = await Class.find().sort({ dayOfWeek: 1, time: 1 });
    res.json(classes);
  } catch (error) {
    next(error);
  }
}

export async function getClass(req, res, next) {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (error) {
    next(error);
  }
}

export async function createClass(req, res, next) {
  try {
    const cls = await Class.create(req.body);
    res.status(201).json(cls);
  } catch (error) {
    next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (error) {
    next(error);
  }
}

export async function deleteClass(req, res, next) {
  try {
    const cls = await Class.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted" });
  } catch (error) {
    next(error);
  }
}
