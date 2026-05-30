import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
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
      enum: ["basic", "premium", "unlimited"],
      required: [true, "Membership type is required"],
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
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Member", memberSchema);
