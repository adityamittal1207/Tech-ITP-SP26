import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    attended: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    externalSource: {
      type: String,
      enum: ["mindbody", "native"],
    },
    externalId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ externalSource: 1, externalId: 1 }, { sparse: true });

export default mongoose.model("Booking", bookingSchema);
