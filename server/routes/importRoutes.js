import { Router } from "express";
import SyncLog from "../models/SyncLog.js";
import { runRetentionScoring } from "../services/scoringJob.js";
import {
  CSV_TEMPLATES,
  importBookings,
  importClasses,
  importMembers,
} from "../services/importService.js";

const router = Router();

async function handleImport(req, res, next, kind, importer) {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== "string") {
      return res.status(400).json({ message: "csv field is required" });
    }
    const result = await importer(csv);
    await runRetentionScoring();
    await SyncLog.create({
      type: "csv_import",
      summary: { kind, ...result },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

router.get("/templates/:kind", (req, res) => {
  const template = CSV_TEMPLATES[req.params.kind];
  if (!template) return res.status(404).json({ message: "Unknown template kind" });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.kind}-template.csv"`);
  res.send(template);
});

router.post("/classes", (req, res, next) => handleImport(req, res, next, "classes", importClasses));
router.post("/members", (req, res, next) => handleImport(req, res, next, "members", importMembers));
router.post("/bookings", (req, res, next) => handleImport(req, res, next, "bookings", importBookings));

export default router;
