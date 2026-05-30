import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMember,
  getMembers,
  updateMember,
} from "../controllers/memberController.js";

const router = Router();

router.route("/").get(getMembers).post(createMember);
router.route("/:id").get(getMember).put(updateMember).delete(deleteMember);

export default router;
