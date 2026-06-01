import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeChurnRatePct } from "../services/metricsService.js";

const NOW = new Date("2026-06-01T12:00:00Z").getTime();
const at = (days) => new Date(NOW - days * 86_400_000);

describe("computeChurnRatePct", () => {
  it("counts only lapsed members in the cohort", () => {
    const members = [
      { _id: "a", joinDate: at(90) },
      { _id: "b", joinDate: at(90) },
      { _id: "c", joinDate: at(90) },
    ];
    const byMember = {
      a: [{ bookedAt: at(5), attended: true }],
      b: [{ bookedAt: at(25), attended: true }],
      c: [],
    };
    assert.equal(computeChurnRatePct(members, byMember, NOW), 66.7);
  });

  it("excludes new members from the lapsed numerator", () => {
    const members = [
      { _id: "a", joinDate: at(10) },
      { _id: "b", joinDate: at(90) },
    ];
    const byMember = { b: [{ bookedAt: at(25), attended: true }] };
    assert.equal(computeChurnRatePct(members, byMember, NOW), 50);
  });

  it("uses members who existed at the as-of date for historical snapshots", () => {
    const members = [
      { _id: "old", joinDate: at(120) },
      { _id: "new", joinDate: at(10) },
    ];
    const byMember = {
      old: [{ bookedAt: at(55), attended: true }],
      new: [],
    };
    const thirtyDaysAgo = NOW - 30 * 86_400_000;
    assert.equal(computeChurnRatePct(members, byMember, thirtyDaysAgo), 100);
    assert.equal(computeChurnRatePct(members, byMember, NOW), 50);
  });

  it("treats recent past bookings as visits, not only attended", () => {
    const members = [{ _id: "a", joinDate: at(90) }];
    const byMember = {
      a: [{ bookedAt: at(5), attended: false, status: "confirmed" }],
    };
    assert.equal(computeChurnRatePct(members, byMember, NOW), 0);
  });
});
