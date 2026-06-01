import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildActivityFeed } from "../services/studioViewService.js";

const NOW = new Date("2026-06-01T18:00:00Z").getTime();
const MEMBER = { _id: "m1", name: "Alex Park", joinDate: new Date("2026-05-31T10:00:00Z") };
const CLASS = { _id: "c1", name: "Morning Flow" };

describe("buildActivityFeed", () => {
  it("shows upcoming bookings as booked, not missed", () => {
    const feed = buildActivityFeed({
      bookings: [
        {
          _id: "b1",
          memberId: MEMBER,
          classId: CLASS,
          bookedAt: new Date("2026-06-01T19:00:00Z"),
          createdAt: new Date("2026-06-01T17:30:00Z"),
          status: "booked",
          attended: false,
        },
      ],
      members: [],
      messages: [],
      now: NOW,
    });
    assert.equal(feed.length, 1);
    assert.equal(feed[0].type, "booking");
    assert.match(feed[0].text, /booked Morning Flow/);
  });

  it("shows past unattended sessions as missed", () => {
    const feed = buildActivityFeed({
      bookings: [
        {
          _id: "b2",
          memberId: MEMBER,
          classId: CLASS,
          bookedAt: new Date("2026-06-01T07:00:00Z"),
          createdAt: new Date("2026-05-30T12:00:00Z"),
          status: "booked",
          attended: false,
        },
      ],
      members: [],
      messages: [],
      now: NOW,
    });
    assert.equal(feed.length, 1);
    assert.equal(feed[0].type, "cancel");
    assert.match(feed[0].text, /missed Morning Flow/);
  });

  it("sorts mixed events newest first", () => {
    const feed = buildActivityFeed({
      bookings: [
        {
          _id: "b3",
          memberId: MEMBER,
          classId: CLASS,
          bookedAt: new Date("2026-06-01T19:00:00Z"),
          createdAt: new Date("2026-06-01T17:00:00Z"),
          status: "booked",
          attended: false,
        },
      ],
      members: [MEMBER],
      messages: [
        {
          _id: "msg1",
          memberId: MEMBER,
          sentAt: new Date("2026-06-01T17:45:00Z"),
          direction: "inbound",
        },
      ],
      now: NOW,
    });
    assert.equal(feed[0].type, "reply");
    assert.equal(feed[1].type, "booking");
  });
});
