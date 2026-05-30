import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeStatus } from "../services/retentionService.js";

// Interior tests use the wall clock via daysAgo — safe for mid-bucket values well away
// from any threshold. Do NOT use daysAgo for boundary values: Date.now() advances between
// the helper call and computeStatus runtime, so daysAgo(14) gives daysSince ≈ 14.000001,
// which flips regular→at-risk at the exact 14-day threshold.
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const booking = (daysAgoN) => ({ bookedAt: daysAgo(daysAgoN) });

// Boundary tests use a fixed reference time so integer-day offsets are exact.
// Expected values derived from the documented convention in businessConfig.js:
//   regular ≤14d, at-risk >14 & ≤21d, lapsed >21d; new = joined ≤30d (overrides all).
const NOW = new Date("2026-01-15T12:00:00Z").getTime();
const at = (days) => new Date(NOW - days * 86_400_000);

describe("computeStatus", () => {
  // ── Interior cases ─────────────────────────────────────────────────────────

  it("returns 'new' for a member joined within 30 days regardless of bookings", () => {
    assert.equal(computeStatus({ joinDate: daysAgo(5) }, []), "new");
  });

  it("returns 'regular' when last booking was within 14 days", () => {
    assert.equal(computeStatus({ joinDate: daysAgo(60) }, [booking(7)]), "regular");
  });

  it("returns 'at-risk' when last booking was between 14 and 21 days ago", () => {
    assert.equal(computeStatus({ joinDate: daysAgo(60) }, [booking(17)]), "at-risk");
  });

  it("returns 'lapsed' when last booking was more than 21 days ago", () => {
    assert.equal(computeStatus({ joinDate: daysAgo(60) }, [booking(25)]), "lapsed");
  });

  it("returns 'lapsed' for a non-new member with zero bookings", () => {
    assert.equal(computeStatus({ joinDate: daysAgo(60) }, []), "lapsed");
  });

  // ── Boundary cases — fixed clock, exact integer-day offsets ────────────────
  // Each expected value comes from the operators in retentionService.js, confirmed
  // against the convention comment in businessConfig.js. Not derived by running the function.

  // daysSinceJoin <= 30: ≤ includes 30.0 → 30 days exactly is "new"
  it("returns 'new' for joinDate exactly 30 days ago (≤ operator — boundary is 'new')", () => {
    assert.equal(computeStatus({ joinDate: at(30) }, [], NOW), "new");
  });

  // daysSinceLastBooking > 14: strict > excludes 14.0 → 14 days exactly stays "regular"
  it("returns 'regular' for last booking exactly 14 days ago (> operator — boundary stays 'regular')", () => {
    assert.equal(computeStatus({ joinDate: at(60) }, [{ bookedAt: at(14) }], NOW), "regular");
  });

  // daysSinceLastBooking > 21: strict > excludes 21.0 → 21 days exactly stays "at-risk"
  it("returns 'at-risk' for last booking exactly 21 days ago (> operator — boundary stays 'at-risk')", () => {
    assert.equal(computeStatus({ joinDate: at(60) }, [{ bookedAt: at(21) }], NOW), "at-risk");
  });

  // 22 days pins the far side of the 21-day boundary — confirms the transition to "lapsed"
  it("returns 'lapsed' for last booking exactly 22 days ago (past the lapsed threshold)", () => {
    assert.equal(computeStatus({ joinDate: at(60) }, [{ bookedAt: at(22) }], NOW), "lapsed");
  });
});
