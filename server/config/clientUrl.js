const DEV_FALLBACK = "http://localhost:5173";

const ENV_KEYS = [
  "CLIENT_URL",
  "FRONTEND_URL",
  "PUBLIC_URL",
  "APP_URL",
  "VITE_APP_URL",
  "VITE_CLIENT_URL",
];

function normalizeUrl(url) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function fromEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) return null;
  return normalizeUrl(value);
}

/** Same-origin deploys: TWILIO_WEBHOOK_URL often ends with /api/webhooks/... */
function fromTwilioWebhookUrl() {
  const webhook = process.env.TWILIO_WEBHOOK_URL?.trim();
  if (!webhook) return null;
  const match = webhook.match(/^(https?:\/\/[^/]+)/i);
  return match ? normalizeUrl(match[1]) : null;
}

function fromPlatformUrl() {
  return fromEnv("RAILWAY_STATIC_URL") || fromEnv("VERCEL_URL");
}

let warnedMissing = false;

function isProduction() {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.VERCEL)
  );
}

export function getClientUrl() {
  for (const key of ENV_KEYS) {
    const url = fromEnv(key);
    if (url) return url;
  }

  const platform = fromPlatformUrl();
  if (platform) return platform;

  const webhookOrigin = fromTwilioWebhookUrl();
  if (webhookOrigin) return webhookOrigin;

  if (isProduction()) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.error(
        "[clientUrl] CLIENT_URL is not set — cancel/booking links cannot be generated. " +
          "Add CLIENT_URL on the server to your deployed client origin.",
      );
    }
    throw new Error(
      "CLIENT_URL is required in production (set it to your deployed client URL)",
    );
  }

  return DEV_FALLBACK;
}

/** For startup logs — does not throw when unset in production. */
export function describeClientUrl() {
  try {
    return getClientUrl();
  } catch {
    return "(unset — set CLIENT_URL on the server)";
  }
}
