import Message from "../models/Message.js";

export async function getMessages(req, res, next) {
  try {
    const filter = req.query.memberId ? { memberId: req.query.memberId } : {};
    const messages = await Message.find(filter)
      .populate("memberId", "name email")
      .sort({ sentAt: -1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
}
