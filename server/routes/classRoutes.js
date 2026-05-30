import { Router } from "express";
import {
  createClass,
  deleteClass,
  getClass,
  getClasses,
  updateClass,
} from "../controllers/classController.js";

const router = Router();

router.route("/").get(getClasses).post(createClass);
router.route("/:id").get(getClass).put(updateClass).delete(deleteClass);

export default router;
