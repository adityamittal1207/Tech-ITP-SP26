import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    uid: req.user.uid,
    email: req.user.email,
  });
});

export default router;
