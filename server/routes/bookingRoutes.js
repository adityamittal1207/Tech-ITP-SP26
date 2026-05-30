import { Router } from "express";
import {
  createBooking,
  deleteBooking,
  getBooking,
  getBookings,
  updateBooking,
} from "../controllers/bookingController.js";

const router = Router();

router.route("/").get(getBookings).post(createBooking);
router.route("/:id").get(getBooking).put(updateBooking).delete(deleteBooking);

export default router;
