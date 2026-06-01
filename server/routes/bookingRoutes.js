import { Router } from "express";
import {
  cancelBookingHandler,
  confirmBookingHandler,
  createBookingHandler,
  deleteBooking,
  getBooking,
  getBookings,
  updateBooking,
} from "../controllers/bookingController.js";

const router = Router();

router.route("/").get(getBookings).post(createBookingHandler);
router.post("/:id/cancel", cancelBookingHandler);
router.post("/:id/confirm", confirmBookingHandler);
router.route("/:id").get(getBooking).put(updateBooking).delete(deleteBooking);

export default router;
