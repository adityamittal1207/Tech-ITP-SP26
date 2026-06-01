import mongoose from "mongoose";

const syncLogSchema = new mongoose.Schema(
  {
    ownerUid: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["csv_import"],
      required: true,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ranAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SyncLog", syncLogSchema);
