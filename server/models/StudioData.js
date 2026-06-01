import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    email: String,
    status: String,
    joinDate: String,
    joinSource: String,
    membership: String,
    ltv: Number,
    visits90: Number,
    daysSinceLast: Number,
    favoriteInstructor: String,
    reason: String,
    tags: [String],
    notes: String,
  },
  { _id: false }
);

const studioDataSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    studio: {
      name: String,
      city: String,
      owner: String,
    },
    clients: [clientSchema],
    counts: mongoose.Schema.Types.Mixed,
    kpis: [mongoose.Schema.Types.Mixed],
    todayClasses: [mongoose.Schema.Types.Mixed],
    actionItems: [mongoose.Schema.Types.Mixed],
    activityFeed: [mongoose.Schema.Types.Mixed],
    visitsTrend: [mongoose.Schema.Types.Mixed],
    instructors: [mongoose.Schema.Types.Mixed],
    classTypes: [mongoose.Schema.Types.Mixed],
    days: [String],
    slots: [String],
    scheduleHeatmap: [mongoose.Schema.Types.Mixed],
    cohorts: [mongoose.Schema.Types.Mixed],
    classTrend: [mongoose.Schema.Types.Mixed],
    revenueMix: [mongoose.Schema.Types.Mixed],
    revpashTrend: [mongoose.Schema.Types.Mixed],
    channelLtv: [mongoose.Schema.Types.Mixed],
    reminderRules: [mongoose.Schema.Types.Mixed],
    reminderExamples: [mongoose.Schema.Types.Mixed],
    templates: [mongoose.Schema.Types.Mixed],
    sendQueue: [mongoose.Schema.Types.Mixed],
    messageLog: [mongoose.Schema.Types.Mixed],
    integrations: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
);

export default mongoose.model("StudioData", studioDataSchema);
