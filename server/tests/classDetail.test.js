import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeClassDetail } from "../services/metricsService.js";

const NOW = new Date("2026-06-01T18:00:00Z").getTime();
const CLASS = {
  _id: "c1",
  name: "Morning Flow",
  capacity: 20,
  dayOfWeek: "monday",
  time: "07:00",
  durationMinutes: 60,
};

describe("computeClassDetail", () => {
  it("does not count upcoming sessions in the current chart week as no-shows", () => {
    const { trend } = computeClassDetail(
      "Morning Flow",
      [
        {
          _id: "b2",
          classId: CLASS,
          memberId: "m2",
          bookedAt: new Date("2026-06-01T19:00:00Z"),
          status: "booked",
          attended: false,
        },
      ],
      [CLASS],
      [{ _id: "m2", name: "Sam" }],
      NOW
    );

    const w12 = trend[trend.length - 1];
    assert.equal(w12.noShow, 0);
    assert.equal(w12.attended, 0);
  });

  it("counts past unattended sessions as no-shows", () => {
    const { trend, noShowRatePct } = computeClassDetail(
      "Morning Flow",
      [
        {
          _id: "b1",
          classId: CLASS,
          memberId: "m1",
          bookedAt: new Date("2026-06-01T07:00:00Z"),
          status: "booked",
          attended: false,
        },
      ],
      [CLASS],
      [{ _id: "m1", name: "Alex" }],
      NOW
    );

    const totalNoShows = trend.reduce((s, w) => s + w.noShow, 0);
    assert.equal(totalNoShows, 1);
    assert.equal(noShowRatePct, 100);
  });

  it("counts attended past sessions in the trend", () => {
    const { trend } = computeClassDetail(
      "Morning Flow",
      [
        {
          _id: "b3",
          classId: CLASS,
          memberId: "m1",
          bookedAt: new Date("2026-05-26T07:00:00Z"),
          status: "booked",
          attended: true,
        },
      ],
      [CLASS],
      [{ _id: "m1", name: "Alex" }],
      NOW
    );

    const withAttendance = trend.filter((w) => w.attended > 0);
    assert.ok(withAttendance.length >= 1);
  });
});
