import { Router } from "express";
import {
  createItem,
  deleteItem,
  getItems,
} from "../controllers/itemController.js";

const router = Router();

router.route("/").get(getItems).post(createItem);
router.route("/:id").delete(deleteItem);

export default router;
