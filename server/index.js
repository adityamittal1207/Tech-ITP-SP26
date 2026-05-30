import cors from "cors";
import express from "express";
import cron from "node-cron";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import { runRetentionScoring } from "./services/scoringJob.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumnus";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/items", itemRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/messages", messageRoutes);

app.use(errorHandler);

async function start() {
  try {
    await connectDB(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    await runRetentionScoring();
    cron.schedule("0 * * * *", runRetentionScoring);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
