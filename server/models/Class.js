import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    instructor: {
      type: String,
      required: [true, "Instructor is required"],
      trim: true,
    },
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: [true, "Day of week is required"],
    },
    time: {
      type: String,
      required: [true, "Time is required"],
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    category: {
      type: String,
      enum: ["yoga", "pilates", "hiit", "spin", "strength"],
      required: [true, "Category is required"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Class", classSchema);
