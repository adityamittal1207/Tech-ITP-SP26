import { Router } from "express";
import {
  cancelPublicBooking,
  createPublicBooking,
  getPublicBookings,
  getPublicSchedule,
  getPublicStudio,
} from "../controllers/publicBookingController.js";

const router = Router();

const postCounts = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const window = postCounts.get(ip) ?? { count: 0, reset: now + 60000 };
  if (now > window.reset) {
    postCounts.set(ip, { count: 1, reset: now + 60000 });
    return next();
  }
  if (window.count >= 30) {
    return res.status(429).json({ message: "Too many requests" });
  }
  window.count++;
  postCounts.set(ip, window);
  next();
}

router.get("/studios/:slug", getPublicStudio);
router.get("/studios/:slug/schedule", getPublicSchedule);
router.get("/studios/:slug/bookings", getPublicBookings);
router.post("/studios/:slug/bookings", rateLimit, createPublicBooking);
router.post("/studios/:slug/bookings/:id/cancel", rateLimit, cancelPublicBooking);

export default router;
