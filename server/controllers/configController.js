import businessConfig from "../config/businessConfig.js";

export function getConfig(_req, res) {
  res.json({
    studio: {
      name: businessConfig.studioName,
      city: "Encinitas, CA",
      owner: "Studio Owner",
      smsSender: process.env.TWILIO_PHONE_NUMBER || "Not configured",
      replyToEmail: "hi@tether.studio",
    },
    retention: businessConfig.retention,
    membershipTiers: businessConfig.membershipTiers,
    classCategories: businessConfig.classCategories,
    smsTemplates: businessConfig.smsTemplates,
    reminderRules: [
      {
        id: "r1",
        name: "24-hour SMS reminder",
        trigger: "24h before class",
        enabled: true,
        replies: "Reply C to cancel · Y to confirm",
      },
      {
        id: "r2",
        name: "2-hour SMS reminder",
        trigger: "2h before class",
        enabled: true,
        replies: "Reply C to cancel",
      },
      {
        id: "r3",
        name: "At-risk outreach",
        trigger: `${businessConfig.retention.daysUntilAtRisk}+ days inactive`,
        enabled: true,
        replies: "Automated via retention scoring",
      },
      {
        id: "r4",
        name: "Win-back outreach",
        trigger: `${businessConfig.retention.daysUntilLapsed}+ days lapsed`,
        enabled: true,
        replies: "Manual or scheduled send",
      },
    ],
    integrations: [
      {
        id: "mongodb",
        name: "MongoDB",
        desc: "Members, classes, bookings, messages",
        connected: true,
        lastSync: "Live",
      },
      {
        id: "twilio",
        name: "Twilio SMS",
        desc: "Reminders and retention outreach",
        connected: Boolean(process.env.TWILIO_ACCOUNT_SID),
        lastSync: process.env.TWILIO_ACCOUNT_SID ? "Configured" : null,
      },
      {
        id: "express",
        name: "Express API",
        desc: "MERN backend on port 5001",
        connected: true,
        lastSync: "Live",
      },
    ],
  });
}
