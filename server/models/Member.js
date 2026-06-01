import mongoose from "mongoose";
import config from "../config/businessConfig.js";

const memberSchema = new mongoose.Schema(
  {
    ownerUid: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      match: [/^\+\d{10,15}$/, "Phone must be in E.164 format (e.g. +16195551234)"],
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    membershipType: {
      type: String,
      enum: config.membershipTiers,
      required: [true, "Membership type is required"],
    },
    source: {
      type: String,
      enum: config.sourceChannels,
      required: [true, "Source is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["new", "regular", "at-risk", "lapsed"],
      default: "new",
    },
    milestoneSent: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    joinSource: {
      type: String,
      enum: ["Instagram", "Groupon", "Referral", "Walk-in"],
      default: "Walk-in",
    },
    tags: {
      type: [String],
      default: [],
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

memberSchema.index({ ownerUid: 1, email: 1 }, { unique: true, sparse: true });
memberSchema.index({ ownerUid: 1, phone: 1 }, { unique: true });
memberSchema.index({ externalSource: 1, externalId: 1 }, { sparse: true });

export default mongoose.model("Member", memberSchema);
