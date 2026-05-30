import Member from "../models/Member.js";
import { sendTemplate } from "../services/messageService.js";

export async function getMembers(_req, res, next) {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    next(error);
  }
}

export async function getMember(req, res, next) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (error) {
    next(error);
  }
}

export async function createMember(req, res, next) {
  try {
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
