import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSmsReply } from "../services/inboundSmsService.js";

describe("parseSmsReply", () => {
  it("accepts single-letter cancel replies", () => {
    assert.equal(parseSmsReply("C"), "cancel");
    assert.equal(parseSmsReply("c"), "cancel");
  });

  it("accepts cancel keywords with trailing words or punctuation", () => {
    assert.equal(parseSmsReply("C."), "cancel");
    assert.equal(parseSmsReply("cancel please"), "cancel");
    assert.equal(parseSmsReply("NO"), "cancel");
  });

  it("ignores unrelated replies", () => {
    assert.equal(parseSmsReply("thanks"), "unknown");
    assert.equal(parseSmsReply(""), "unknown");
  });
});
