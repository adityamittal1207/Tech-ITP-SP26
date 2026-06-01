import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_CANCEL_TYPES,
  buildSmsBody,
  ensureCancelLinkPlaceholder,
  shouldIncludeCancelLink,
} from "../services/smsBody.js";

describe("shouldIncludeCancelLink", () => {
  it("allows cancel links only for active booking SMS types", () => {
    assert.equal(shouldIncludeCancelLink("reminder", "booked"), true);
    assert.equal(shouldIncludeCancelLink("waitlistPromoted", "booked"), true);
    assert.equal(shouldIncludeCancelLink("waitlistJoined", "waitlisted"), true);
  });

  it("blocks cancel links for acknowledgement and outreach types", () => {
    assert.equal(shouldIncludeCancelLink("cancelAck", "booked"), false);
    assert.equal(shouldIncludeCancelLink("confirmAck", "booked"), false);
    assert.equal(shouldIncludeCancelLink("atRisk", "booked"), false);
  });

  it("blocks cancel links once a booking is already cancelled", () => {
    assert.equal(shouldIncludeCancelLink("reminder", "cancelled"), false);
  });
});

describe("smsBody", () => {
  it("adds cancelLink placeholder to legacy waitlist templates", () => {
    const legacy =
      "Hi {firstName}, a spot opened up! You're now signed up for {className} at {classTime}. Reply C to cancel.";
    const updated = ensureCancelLinkPlaceholder(legacy, "waitlistPromoted");
    assert.match(updated, /\{cancelLink\}/);
  });

  it("appends cancel link for booking reminders", () => {
    const body = buildSmsBody({
      template: "Hi {firstName}, you're in for {className} at {classTime}.",
      mergeData: {
        firstName: "Alex",
        className: "Morning Flow",
        classTime: "7:00 AM",
        cancelLink: "https://app.test/cancel/abc",
        _bookingStatus: "booked",
      },
      type: "waitlistPromoted",
    });
    assert.match(body, /https:\/\/app\.test\/cancel\/abc$/);
  });

  it("does not append cancel link to staff cancellation acknowledgements", () => {
    const body = buildSmsBody({
      template: "Your spot for {className} at {classTime} is cancelled.",
      mergeData: {
        className: "Morning Flow",
        classTime: "7:00 AM",
        cancelLink: "https://app.test/cancel/abc",
        _bookingStatus: "cancelled",
      },
      type: "cancelAck",
    });
    assert.doesNotMatch(body, /cancel\/abc/);
  });

  it("covers all booking cancel sms types", () => {
    assert.ok(BOOKING_CANCEL_TYPES.has("waitlistPromoted"));
    assert.ok(BOOKING_CANCEL_TYPES.has("waitlistJoined"));
    assert.ok(BOOKING_CANCEL_TYPES.has("reminder"));
  });
});
