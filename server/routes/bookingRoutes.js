import { Router } from "express";
import {
  cancelBookingHandler,
  createBookingHandler,
  deleteBooking,
  getBooking,
  getBookings,
  promoteFromWaitlistHandler,
  updateBooking,
} from "../controllers/bookingController.js";

const router = Router();

router.route("/").get(getBookings).post(createBookingHandler);
router.post("/:id/cancel", cancelBookingHandler);
router.post("/:id/promote", promoteFromWaitlistHandler);
router.route("/:id").get(getBooking).put(updateBooking).delete(deleteBooking);

export default router;
