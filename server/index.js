import "dotenv/config";
import cors from "cors";
import express from "express";
import cron from "node-cron";
import { connectDB } from "./config/db.js";
import { isFirebaseAuthEnabled } from "./config/firebaseAdmin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/requireAuth.js";
import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import studioRoutes from "./routes/studioRoutes.js";
import { runRetentionScoring } from "./services/scoringJob.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tether";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    auth: isFirebaseAuthEnabled ? "firebase" : "disabled",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", requireAuth);

app.use("/api/members", memberRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/config", configRoutes);
app.use("/api/import", importRoutes);
app.use("/api/studio", studioRoutes);
app.use("/api/settings", settingsRoutes);

app.use(errorHandler);

async function start() {
  try {
    await connectDB(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(
        isFirebaseAuthEnabled
          ? "API auth: Firebase ID tokens required"
          : "API auth: disabled (set FIREBASE_* in server/.env to enable)",
      );
    });
    await runRetentionScoring();
    cron.schedule("0 * * * *", runRetentionScoring);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
