/**
 * Per-tenant demo profiles for Firebase Auth UIDs (MongoDB ownerUid).
 * Used by tenantSeedService when seeding presentation / demo accounts.
 */
export const DEMO_TENANT_PROFILES = {
  CJKpE4LxDbS24OVIUIgD5SYpnyc2: {
    studioName: "Tidewater Yoga + Surf",
    studioOwner: "Maya Calderón",
    replyToEmail: "hi@tidewateryoga.com",
    bookingSlug: "tidewater-encinitas",
    publicBookingEnabled: true,
    memberCount: 150,
    ownerMember: {
      name: "Maya Calderón",
      email: "maya@tidewateryoga.com",
      // Use your Twilio-verified number so waitlist SMS hits your phone during the demo.
      phone: "+17187758267",
      membershipType: "unlimited",
      joinDaysAgo: 800,
      joinSource: "Walk-in",
      tags: ["VIP", "Owner"],
      notes: "Studio owner — demo account.",
      bookingOffsets: [3, 8, 14, 21, 28, 35, 42],
    },
    /** Fully booked class for live waitlist + SMS demo on Schedule. */
    waitlistSmsDemo: {
      className: "SMS Waitlist Lab",
      instructor: "Mia Russo",
      time: "18:00",
      capacity: 6,
      category: "hiit",
    },
  },
};

export function getDemoTenantProfile(ownerUid) {
  return DEMO_TENANT_PROFILES[ownerUid] ?? null;
}
