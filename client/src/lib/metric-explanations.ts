/** Hover explanations for stats — what they mean and how they're computed. */
export const METRIC_EXPLANATIONS: Record<string, string> = {
  // Dashboard KPIs
  "Active Clients":
    "Members marked active in your database. Count updates from imports and retention scoring.",
  MRR:
    "Monthly recurring revenue from active non-lapsed members: each member's tier price (4-pack, 8-pack, unlimited) summed. Based on membership tier on file.",
  "Fill Rate":
    "Share of all bookings where the client attended (attended ÷ total bookings), from your booking records.",
  "Churn Rate":
    "Share of members in lapsed status — no visit within your lapsed threshold (after the new-member window). Uses the same rules as retention scoring on your booking history.",
  "4-Visit Conversion":
    "Share of members with at least four attended bookings on record.",

  // KPI period-over-period deltas (last 30 days vs prior 30 days)
  "vs prior 30d":
    "Percent change between the last 30 days and the 30 days before that, computed from your booking and member data.",
  "Active Clients change":
    "Change in unique members with at least one attended visit: last 30 days compared to the prior 30 days.",
  "MRR change":
    "Change in summed tier revenue for members who attended at least once in each 30-day window.",
  "Fill Rate change":
    "Change in attendance rate (attended ÷ total bookings) between the two 30-day windows.",
  "Churn Rate change":
    "Change in lapsed share vs the same metric computed 30 days ago, using your retention thresholds at each point in time.",
  "4-Visit Conversion change":
    "Change in the share of members who joined in each window and reached four attended visits.",

  // Visits & attendance
  Visits:
    "Attended bookings per day over the last 30 days — only after the class start time has passed (today’s later classes are excluded until they run).",
  "No-shows":
    "Bookings where the client did not attend, counted only after the class was scheduled to start — upcoming classes today are not counted as no-shows.",

  // Retention statuses
  New: "Joined within the last 30 days (configurable in Settings). Status is written hourly from join date and booking activity.",
  Regular: "Last booking within 14 days. Computed hourly by comparing each member's most recent booking to today.",
  "At-Risk": "No booking in 15–21 days (based on your at-risk threshold). Flagged automatically from booking history.",
  Lapsed: "No booking in 21+ days. Status persists until the member books again and scoring runs.",
  "Win-back": "Recently re-engaged after a lapse — derived from gaps in booking history.",

  // Client metrics
  LTV: "Lifetime value estimate: attended visits × revenue per visit for the member's membership tier.",
  "90-day visits": "Count of attended bookings in the last 90 days for this member.",
  "Last visit":
    "Days since the member's most recent class — uses their latest attended visit, or the latest past booking if attendance hasn't been marked yet. Future bookings are excluded.",
  "Why at risk": "From retention scoring — typically days since last visit crossed your at-risk threshold.",

  // Cohort
  "Cohort retention":
    "Groups members by when they joined (30-day buckets). Each column is the share who had at least one attended visit within that many days after joining.",
  "30d": "Share of the cohort with at least one attended visit within 30 days of join date (shown once every member in the bucket has been around at least 30 days).",
  "90d": "Share with at least one attended visit within 90 days of join date (shown when the cohort is old enough).",
  "180d": "Share with at least one attended visit within 180 days of join date.",
  "365d": "Share with at least one attended visit within 365 days of join date.",

  // Settings
  "Retention thresholds":
    "Day counts used by the hourly scoring job: it reads each member's last booking and writes new/regular/at-risk/lapsed.",

  // Analytics — schedule & per-class
  "Schedule fill rate":
    "Bookings ÷ class capacity for each day-of-week and time slot, using the last 30 days of booking data.",
  "Avg fill":
    "How full this class type runs on average: attended visits ÷ total seat capacity over the last 12 weeks.",
  "No-show":
    "Share of bookings for this class type where the client did not attend, over the last 12 weeks.",

  // Analytics — revenue
  "Revenue mix":
    "Breakdown by revenue source: unlimited, 8-pack, and 4-pack from active member tiers, plus drop-ins from recent booking volume.",
  RevPASH:
    "Revenue per available seat-hour: attended-visit revenue divided by total weekly seat-hours across your schedule.",
  "vs prior week":
    "Percent change in RevPASH between the last complete calendar week and the week before it.",

  // Today's classes
  "Under-booked":
    "Classes today with fewer than half their seats booked, from today's booking records.",

  // SMS conversion (shared with communications summary)
  "Messages sent":
    "SMS messages Tether sent in the last 30 days, recorded at send time.",
  "Clients rebooked":
    "Outreach SMS (at-risk, win-back, welcome) where the client attended a class within 7 days after send — matched by member and booking dates.",
  "Visits recovered":
    "Attended visits in the 7-day window after an outreach message. One client attending twice counts as two.",
  "Conversion rate":
    "Outreach messages that led to at least one attended visit within 7 days, divided by messages sent.",
  "Reminder impact":
    "Compares no-show rates for bookings with reminderSent vs without, over the last 30 days.",
};

/** KPI label → delta explanation key */
export const KPI_DELTA_METRIC: Record<string, string> = {
  "Active Clients": "Active Clients change",
  MRR: "MRR change",
  "Fill Rate": "Fill Rate change",
  "Churn Rate": "Churn Rate change",
  "4-Visit Conversion": "4-Visit Conversion change",
};
