import { admin, isFirebaseAuthEnabled } from "../config/firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  if (!isFirebaseAuthEnabled) {
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = header.slice(7);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}
