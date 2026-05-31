import { Router } from "express";
import {
  getAnalyticsPageHandler,
  getClientsPageHandler,
  getCommunicationsPageHandler,
  getHome,
  getSettingsPageHandler,
  getStudio,
} from "../controllers/studioController.js";

const router = Router();

router.get("/", getStudio);
router.get("/home", getHome);
router.get("/clients", getClientsPageHandler);
router.get("/analytics", getAnalyticsPageHandler);
router.get("/communications", getCommunicationsPageHandler);
router.get("/settings", getSettingsPageHandler);

export default router;
