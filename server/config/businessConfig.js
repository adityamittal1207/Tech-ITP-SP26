export default {
  studioName: "Tether",
  studioOwner: "Aditya Mittal",
  primaryColor: "#C8F135",
  classCategories: ["yoga", "pilates", "hiit", "spin", "strength"],
  membershipTiers: ["basic", "premium", "unlimited"],
  sourceChannels: ["instagram", "referral", "walk-in", "groupon", "google", "event", "website", "mindbody", "acuity", "native"],
  milestoneVisits: 4,
  retention: {
    // Boundaries are upper-inclusive: regular ≤14d, at-risk >14 & ≤21d, lapsed >21d. new = joined ≤30d (overrides).
    newMemberDays: 30,
    daysUntilAtRisk: 14,
    daysUntilLapsed: 21,
  },
  smsReplyKeywords: {
    confirm: ["Y", "YES"],
    cancel: ["C", "CANCEL", "N", "NO"],
  },
  reminderLeadTimes: {
    firstHours: 24,
    secondHours: 2,
  },
  smsTemplates: {
    reminder: "Hi {firstName}, reminder: {className} is {classTime}. Reply Y to confirm, C to cancel.",
    confirmAck: "You're confirmed for {className} at {classTime}. See you there!",
    cancelAck: "Your spot for {className} at {classTime} is cancelled. Reply anytime to rebook.",
    atRisk:   "Hi {firstName}, we've missed you! It's been a while since your last class. Come back and join us.",
    winback:  "Hi {firstName}, we haven't seen you in a while. We'd love to have you back — check the latest schedule and book your spot.",
    milestone: "Congrats, {firstName}! You've hit {visitCount} visits at Lumnus Studio. We love having you here.",
    welcome:  "Welcome to Tether, {firstName}! We're excited to have you. Book your first class and let's get started.",
  },
};
