import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    ownerUid: {
      type: String,
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required"],
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      default: "outbound",
    },
    type: {
      type: String,
      enum: ["reminder", "atRisk", "winback", "welcome", "milestone", "confirmAck", "cancelAck", "waitlistPromoted", "waitlistJoined"],
      required: [true, "Type is required"],
    },
    templateUsed: {
      type: String,
    },
    body: {
      type: String,
      required: [true, "Body is required"],
    },
    replyKeyword: {
      type: String,
      enum: ["confirm", "cancel", "unknown"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "delivered", "received"],
      default: "sent",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
