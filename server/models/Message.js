import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required"],
    },
    type: {
      type: String,
      enum: ["reminder", "atRisk", "winback", "welcome"],
      required: [true, "Type is required"],
    },
    templateUsed: {
      type: String,
    },
    body: {
      type: String,
      required: [true, "Body is required"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "delivered"],
      default: "sent",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
