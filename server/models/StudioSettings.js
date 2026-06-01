import mongoose from "mongoose";

const reminderTimingSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    firstReminder: String,
    secondReminder: String,
    note: { type: String, default: "" },
  },
  { _id: false }
);

const studioSettingsSchema = new mongoose.Schema(
  {
    ownerUid: { type: String, required: true, index: true },
    key: { type: String, default: "main" },
    studioName: String,
    studioOwner: String,
    city: String,
    replyToEmail: String,
    retention: {
      newMemberDays: Number,
      daysUntilAtRisk: Number,
      daysUntilLapsed: Number,
    },
    reminderTiming: [reminderTimingSchema],
    smsTemplates: {
      reminder: String,
      atRisk: String,
      winback: String,
      milestone: String,
      welcome: String,
      confirmAck: String,
      cancelAck: String,
      waitlistPromoted: String,
      waitlistJoined: String,
    },
    bookingSlug: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    publicBookingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

studioSettingsSchema.index({ ownerUid: 1, key: 1 }, { unique: true });
studioSettingsSchema.index({ bookingSlug: 1 }, { unique: true, sparse: true });

export default mongoose.model("StudioSettings", studioSettingsSchema);
