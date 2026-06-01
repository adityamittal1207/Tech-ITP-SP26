import crypto from "crypto";

function secret() {
  return (
    process.env.CANCEL_LINK_SECRET ||
    process.env.TWILIO_AUTH_TOKEN ||
    "tether-cancel-link-dev"
  );
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Token valid until 2h after class start (or at least 48h from now). */
export function cancelTokenExpiresAt(bookedAt) {
  const classMs = new Date(bookedAt).getTime();
  const minExpiry = Date.now() + 48 * 3_600_000;
  return Math.max(classMs + 2 * 3_600_000, minExpiry);
}

export function createCancelToken(bookingId, ownerUid, bookedAt) {
  const expiresAt = cancelTokenExpiresAt(bookedAt);
  const payload = `${String(bookingId)}:${ownerUid}:${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyCancelToken(token) {
  if (!token || typeof token !== "string") {
    throw Object.assign(new Error("Invalid cancel link"), { status: 400 });
  }

  let decoded;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    throw Object.assign(new Error("Invalid cancel link"), { status: 400 });
  }

  const signature = decoded.slice(decoded.lastIndexOf(":") + 1);
  const payload = decoded.slice(0, decoded.lastIndexOf(":"));
  const parts = payload.split(":");
  if (parts.length < 3) {
    throw Object.assign(new Error("Invalid cancel link"), { status: 400 });
  }

  const expiresAt = Number(parts.pop());
  const ownerUid = parts.pop();
  const bookingId = parts.join(":");

  if (!bookingId || !ownerUid || !Number.isFinite(expiresAt)) {
    throw Object.assign(new Error("Invalid cancel link"), { status: 400 });
  }

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw Object.assign(new Error("Invalid cancel link"), { status: 400 });
  }

  if (Date.now() > expiresAt) {
    throw Object.assign(new Error("This cancel link has expired"), { status: 410 });
  }

  return { bookingId, ownerUid, expiresAt };
}

export function buildCancelUrl(bookingId, ownerUid, bookedAt) {
  const token = createCancelToken(bookingId, ownerUid, bookedAt);
  const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}/cancel/${token}`;
}
