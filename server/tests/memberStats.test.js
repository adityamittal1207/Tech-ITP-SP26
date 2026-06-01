import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBookingToVisitTrend,
  bookingMemberId,
  classifyBookingForVisitTrend,
  enrichMember,
  getLastVisitMs,
  groupBookingsByMember,
} from "../services/memberStats.js";
import { dateKeysForPastDays } from "../utils/studioTimezone.js";

const MEMBER_ID = "507f1f77bcf86cd799439011";
const NOW = new Date("2026-06-01T18:00:00Z").getTime();

describe("bookingMemberId", () => {
  it("handles populated memberId", () => {
    assert.equal(
      bookingMemberId({ memberId: { _id: MEMBER_ID, name: "Alex" } }),
      MEMBER_ID
    );
  });

  it("handles raw ObjectId string", () => {
    assert.equal(bookingMemberId({ memberId: MEMBER_ID }), MEMBER_ID);
  });
});

describe("groupBookingsByMember", () => {
  it("groups populated bookings under the member _id", () => {
    const bookings = [
      {
        memberId: { _id: MEMBER_ID, name: "Alex" },
        bookedAt: new Date("2026-05-28T09:00:00Z"),
        attended: true,
        status: "confirmed",
      },
    ];
    const map = groupBookingsByMember(bookings);
    assert.equal(map[MEMBER_ID]?.length, 1);
    assert.equal(map["[object Object]"], undefined);
  });
});

describe("getLastVisitMs", () => {
  it("uses attended bookings even before class start time", () => {
    const ms = getLastVisitMs(
      [
        {
          memberId: MEMBER_ID,
          bookedAt: new Date("2026-06-01T20:00:00Z"),
          attended: true,
          status: "confirmed",
        },
      ],
      NOW
    );
    assert.equal(ms, new Date("2026-06-01T20:00:00Z").getTime());
  });
});

describe("classifyBookingForVisitTrend", () => {
  it("skips future sessions on the same day", () => {
    assert.equal(
      classifyBookingForVisitTrend(
        {
          bookedAt: new Date("2026-06-01T20:00:00Z"),
          attended: false,
          status: "confirmed",
        },
        NOW
      ),
      null
    );
  });

  it("counts past unmarked sessions as no-shows", () => {
    assert.equal(
      classifyBookingForVisitTrend(
        {
          bookedAt: new Date("2026-06-01T09:00:00Z"),
          attended: false,
          status: "confirmed",
        },
        NOW
      ),
      "noShow"
    );
  });

  it("skips cancelled bookings", () => {
    assert.equal(
      classifyBookingForVisitTrend(
        {
          bookedAt: new Date("2026-06-01T09:00:00Z"),
          attended: false,
          status: "cancelled",
        },
        NOW
      ),
      null
    );
  });
});

describe("applyBookingToVisitTrend", () => {
  it("does not add today future classes to the trend", () => {
    const dateMap = Object.fromEntries(
      dateKeysForPastDays(30, new Date(NOW)).map((key) => [key, { visits: 0, noShows: 0 }])
    );
    applyBookingToVisitTrend(
      dateMap,
      {
        bookedAt: new Date("2026-06-01T20:00:00Z"),
        attended: false,
        status: "confirmed",
      },
      NOW
    );
    const todayKey = dateKeysForPastDays(30, new Date(NOW)).at(-1);
    assert.equal(dateMap[todayKey].noShows, 0);
  });
});

describe("enrichMember", () => {
  it("computes daysSinceLast from member bookings", () => {
    const member = { joinDate: new Date("2025-01-01"), membershipType: "basic", status: "regular" };
    const enriched = enrichMember(
      member,
      [
        {
          memberId: MEMBER_ID,
          bookedAt: new Date("2026-05-30T09:00:00Z"),
          attended: true,
          status: "confirmed",
        },
      ],
      NOW
    );
    assert.equal(enriched.daysSinceLast, 2);
    assert.equal(enriched.visits90, 1);
  });
});
