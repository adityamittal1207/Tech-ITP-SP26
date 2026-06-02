import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const ENV_KEYS = [
  "CLIENT_URL",
  "FRONTEND_URL",
  "PUBLIC_URL",
  "APP_URL",
  "VITE_APP_URL",
  "VITE_CLIENT_URL",
  "TWILIO_WEBHOOK_URL",
  "RAILWAY_STATIC_URL",
  "VERCEL_URL",
  "NODE_ENV",
];

describe("getClientUrl", () => {
  /** @type {Record<string, string | undefined>} */
  let saved;

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("prefers CLIENT_URL", async () => {
    process.env.CLIENT_URL = "https://app.example.com/";
    const { getClientUrl } = await import("../config/clientUrl.js?reload");
    assert.equal(getClientUrl(), "https://app.example.com");
  });

  it("adds https to host-only values", async () => {
    process.env.CLIENT_URL = "app.example.com";
    const { getClientUrl } = await import("../config/clientUrl.js?reload");
    assert.equal(getClientUrl(), "https://app.example.com");
  });

  it("derives origin from TWILIO_WEBHOOK_URL when CLIENT_URL is unset", async () => {
    process.env.TWILIO_WEBHOOK_URL =
      "https://api.example.com/api/webhooks/twilio/sms";
    const { getClientUrl } = await import("../config/clientUrl.js?reload");
    assert.equal(getClientUrl(), "https://api.example.com");
  });

  it("falls back to localhost in development", async () => {
    process.env.NODE_ENV = "development";
    const { getClientUrl } = await import("../config/clientUrl.js?reload");
    assert.equal(getClientUrl(), "http://localhost:5173");
  });
});
