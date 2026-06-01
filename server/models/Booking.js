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
    status: {
      type: String,
      enum: ["pending", "booked", "confirmed", "cancelled", "waitlisted"],
      default: "booked",
    },
    confirmedAt: Date,
    cancelledAt: Date,
    attended: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: Date,
    secondReminderSentAt: Date,
    source: {
      type: String,
      enum: ["staff", "public", "import"],
      default: "staff",
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
bookingSchema.index({ ownerUid: 1, memberId: 1, classId: 1, bookedAt: 1 }, { unique: true });
bookingSchema.index({ ownerUid: 1, classId: 1, bookedAt: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);
