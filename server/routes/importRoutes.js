import { Router } from "express";
import SyncLog from "../models/SyncLog.js";
import { runRetentionScoring } from "../services/scoringJob.js";
import { getOwnerUid } from "../utils/tenant.js";
import {
  CSV_TEMPLATES,
  EXPORT_GUIDES,
  IMPORT_SOURCES,
  importBookings,
  importClasses,
  importMembers,
} from "../services/importService.js";

const router = Router();

function resolveSource(body) {
  const source = body?.source?.trim().toLowerCase();
  return IMPORT_SOURCES.includes(source) ? source : "native";
}

async function handleImport(req, res, next, kind, importer) {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== "string") {
      return res.status(400).json({ message: "csv field is required" });
    }
    const ownerUid = getOwnerUid(req);
    const source = resolveSource(req.body);
    const result =
      kind === "members"
        ? await importer(csv, ownerUid, source)
        : await importer(csv, ownerUid);
    await runRetentionScoring(ownerUid);
    await SyncLog.create({
      ownerUid,
      type: "csv_import",
      summary: { kind, source, ...result },
    });
    res.json({ ...result, source });
  } catch (error) {
    next(error);
  }
}

router.get("/guides", (_req, res) => {
  res.json({ guides: EXPORT_GUIDES, sources: IMPORT_SOURCES });
});

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
