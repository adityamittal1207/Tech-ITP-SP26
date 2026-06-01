import businessConfig from "../config/businessConfig.js";
import StudioSettings from "../models/StudioSettings.js";
import { runRetentionScoring } from "./scoringJob.js";

export const DEFAULT_REMINDER_TIMING = [
  { id: "rt1", name: "Morning classes", firstReminder: "12h before", secondReminder: "1h before", note: "Early classes need earlier nudges" },
  { id: "rt2", name: "Evening classes", firstReminder: "24h before", secondReminder: "2h before", note: "" },
  { id: "rt3", name: "Weekend classes", firstReminder: "24h before", secondReminder: "2h before", note: "" },
];

const SMS_TEMPLATE_KEYS = ["reminder", "atRisk", "winback", "milestone", "welcome", "confirmAck", "cancelAck"];

export function buildDefaultSettings(ownerUid) {
  return {
    ownerUid,
    key: "main",
    studioName: businessConfig.studioName,
    studioOwner: businessConfig.studioOwner,
    city: "Encinitas, CA",
    replyToEmail: "hi@tether.studio",
    bookingSlug: "tether-encinitas",
    publicBookingEnabled: true,
    retention: { ...businessConfig.retention },
    reminderTiming: DEFAULT_REMINDER_TIMING.map((r) => ({ ...r })),
    smsTemplates: { ...businessConfig.smsTemplates },
  };
}

function mergeSmsTemplates(stored) {
  const defaults = businessConfig.smsTemplates;
  const merged = { ...defaults };
  if (!stored || typeof stored !== "object") return merged;
  for (const key of SMS_TEMPLATE_KEYS) {
    if (typeof stored[key] === "string" && stored[key].trim()) {
      merged[key] = stored[key].trim();
    }
  }
  return merged;
}

function validateSmsTemplates(templates) {
  if (!templates || typeof templates !== "object") return;
  for (const [key, val] of Object.entries(templates)) {
    if (!SMS_TEMPLATE_KEYS.includes(key)) {
      throw Object.assign(new Error(`Unknown template key: ${key}`), { status: 400 });
    }
    if (typeof val !== "string" || !val.trim()) {
      throw Object.assign(new Error(`${key} template cannot be empty`), { status: 400 });
    }
    if (val.length > 500) {
      throw Object.assign(new Error(`${key} template must be 500 characters or less`), { status: 400 });
    }
  }
}

export async function getEffectiveConfig(ownerUid) {
  const doc = await StudioSettings.findOne({ ownerUid, key: "main" });
  const defaults = buildDefaultSettings(ownerUid);

  if (!doc) {
    return {
      studioName: defaults.studioName,
      studioOwner: defaults.studioOwner,
      city: defaults.city,
      replyToEmail: defaults.replyToEmail,
      retention: defaults.retention,
      reminderTiming: defaults.reminderTiming,
      smsTemplates: mergeSmsTemplates(null),
      bookingSlug: defaults.bookingSlug,
      publicBookingEnabled: defaults.publicBookingEnabled,
      membershipTiers: businessConfig.membershipTiers,
      classCategories: businessConfig.classCategories,
    };
  }

  return {
    studioName: doc.studioName ?? defaults.studioName,
    studioOwner: doc.studioOwner ?? defaults.studioOwner,
    city: doc.city ?? defaults.city,
    replyToEmail: doc.replyToEmail ?? defaults.replyToEmail,
    retention: {
      newMemberDays: doc.retention?.newMemberDays ?? defaults.retention.newMemberDays,
      daysUntilAtRisk: doc.retention?.daysUntilAtRisk ?? defaults.retention.daysUntilAtRisk,
      daysUntilLapsed: doc.retention?.daysUntilLapsed ?? defaults.retention.daysUntilLapsed,
    },
    reminderTiming: doc.reminderTiming?.length ? doc.reminderTiming : defaults.reminderTiming,
    smsTemplates: mergeSmsTemplates(doc.smsTemplates),
    bookingSlug: doc.bookingSlug ?? defaults.bookingSlug,
    publicBookingEnabled: doc.publicBookingEnabled ?? defaults.publicBookingEnabled,
    membershipTiers: businessConfig.membershipTiers,
    classCategories: businessConfig.classCategories,
  };
}

function validateRetention(retention) {
  const { newMemberDays, daysUntilAtRisk, daysUntilLapsed } = retention;
  for (const [key, val] of Object.entries({ newMemberDays, daysUntilAtRisk, daysUntilLapsed })) {
    if (val != null && (typeof val !== "number" || val < 1 || val > 90)) {
      throw Object.assign(new Error(`${key} must be between 1 and 90`), { status: 400 });
    }
  }
  if (
    daysUntilAtRisk != null &&
    daysUntilLapsed != null &&
    daysUntilAtRisk >= daysUntilLapsed
  ) {
    throw Object.assign(new Error("daysUntilAtRisk must be less than daysUntilLapsed"), { status: 400 });
  }
}

export async function updateSettings(ownerUid, patch) {
  const existing = await StudioSettings.findOne({ ownerUid, key: "main" });
  const base = existing?.toObject() ?? buildDefaultSettings(ownerUid);
  base.smsTemplates = mergeSmsTemplates(base.smsTemplates);

  if (patch.studioName != null) base.studioName = String(patch.studioName).trim();
  if (patch.studioOwner != null) base.studioOwner = String(patch.studioOwner).trim();
  if (patch.city != null) base.city = String(patch.city).trim();
  if (patch.replyToEmail != null) base.replyToEmail = String(patch.replyToEmail).trim();

  if (patch.retention) {
    validateRetention(patch.retention);
    base.retention = { ...base.retention, ...patch.retention };
  }

  if (patch.reminderTiming) {
    base.reminderTiming = patch.reminderTiming;
  }

  if (patch.smsTemplates) {
    validateSmsTemplates(patch.smsTemplates);
    base.smsTemplates = mergeSmsTemplates({ ...base.smsTemplates, ...patch.smsTemplates });
  }

  if (patch.bookingSlug != null) {
    const slug = String(patch.bookingSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (slug) {
      const taken = await StudioSettings.findOne({
        bookingSlug: slug,
        ownerUid: { $ne: ownerUid },
      });
      if (taken) {
        throw Object.assign(new Error("Booking slug already in use"), { status: 409 });
      }
      base.bookingSlug = slug;
    } else {
      base.bookingSlug = "";
    }
  }

  if (patch.publicBookingEnabled != null) {
    base.publicBookingEnabled = Boolean(patch.publicBookingEnabled);
  }

  const doc = await StudioSettings.findOneAndUpdate(
    { ownerUid, key: "main" },
    {
      ownerUid,
      key: "main",
      studioName: base.studioName,
      studioOwner: base.studioOwner,
      city: base.city,
      replyToEmail: base.replyToEmail,
      retention: base.retention,
      reminderTiming: base.reminderTiming,
      smsTemplates: base.smsTemplates,
      bookingSlug: base.bookingSlug,
      publicBookingEnabled: base.publicBookingEnabled,
    },
    { upsert: true, new: true }
  );

  await runRetentionScoring(ownerUid);
  return getEffectiveConfig(ownerUid);
}

export async function seedDefaultSettings(ownerUid) {
  const existing = await StudioSettings.findOne({ ownerUid, key: "main" });
  if (existing) return existing;
  return StudioSettings.create(buildDefaultSettings(ownerUid));
}
