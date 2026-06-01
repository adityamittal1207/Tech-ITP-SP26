import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCancelUrl,
  createCancelToken,
  verifyCancelToken,
} from "../services/cancelLinkService.js";

describe("cancelLinkService", () => {
  const bookingId = "507f1f77bcf86cd799439011";
  const ownerUid = "owner-abc";
  const bookedAt = new Date("2026-06-15T18:00:00Z");

  it("round-trips a valid token", () => {
    const token = createCancelToken(bookingId, ownerUid, bookedAt);
    const parsed = verifyCancelToken(token);
    assert.equal(parsed.bookingId, bookingId);
    assert.equal(parsed.ownerUid, ownerUid);
  });

  it("builds a client cancel URL", () => {
    const url = buildCancelUrl(bookingId, ownerUid, bookedAt);
    assert.match(url, /\/cancel\/[A-Za-z0-9_-]+$/);
  });

  it("rejects tampered tokens", () => {
    const token = createCancelToken(bookingId, ownerUid, bookedAt);
    assert.throws(() => verifyCancelToken(`${token}x`), { message: /Invalid cancel link/ });
  });
});
