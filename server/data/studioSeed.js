// Legacy fixture data (unused — operational models are source of truth).

let seed = 42;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);

export const STUDIO = {
  name: "Tidewater Yoga + Surf",
  city: "",
  owner: "Maya Calderón",
};

export const STATUSES = ["New", "Regular", "At-Risk", "Lapsed", "Win-back"];

export const INSTRUCTORS = [
  { id: "i1", name: "Maya Calderón", specialty: "Vinyasa, Surf-flow", fillRate: 0.86, retention: 0.78, classes30d: 42 },
  { id: "i2", name: "Jonah Reyes", specialty: "Surf coaching", fillRate: 0.91, retention: 0.82, classes30d: 28 },
  { id: "i3", name: "Priya Shah", specialty: "Yin, Restorative", fillRate: 0.74, retention: 0.71, classes30d: 36 },
  { id: "i4", name: "Theo Lindgren", specialty: "Power Vinyasa", fillRate: 0.81, retention: 0.69, classes30d: 32 },
  { id: "i5", name: "Anika Cole", specialty: "Pilates fusion", fillRate: 0.68, retention: 0.64, classes30d: 24 },
  { id: "i6", name: "Sam Okafor", specialty: "Sunrise flow", fillRate: 0.79, retention: 0.75, classes30d: 30 },
];

export const CLASS_TYPES = [
  { name: "Sunrise Flow", color: "var(--chart-1)" },
  { name: "Surf-Strength", color: "var(--chart-3)" },
  { name: "Yin & Restore", color: "var(--chart-4)" },
  { name: "Power Vinyasa", color: "var(--chart-2)" },
  { name: "Pilates Fusion", color: "var(--chart-5)" },
  { name: "Beach Yoga", color: "var(--chart-1)" },
];

const FIRST = ["Maya","Jonah","Priya","Theo","Anika","Sam","Ella","Noah","Ruby","Liam","Sofia","Owen","Harper","Mason","Isla","Leo","Nora","Kai","Mira","Eli","Zoe","Asher","Lila","Finn","June","Wyatt","Sage","Cal","Iris","Reed","Maren","Tess","Beau","Hazel","Otis","Wren","Jude","Cleo","Rhett","Ines","Quinn","Avi","Rae","Tate","Vera","Milo","Sasha","Dax","Pia","Knox"];
const LAST = ["Calderón","Reyes","Shah","Lindgren","Cole","Okafor","Park","Mendes","Nakamura","Brennan","Holloway","Espinoza","Castellano","Whitaker","Aaberg","Quintero","Saito","Delgado","Marsh","Tate","Bautista","Forrest","Linde","Ivers","Solis","Crane","Maddox","Beauchamp","Suzuki","Aldridge"];
const CHANNELS = ["Instagram", "Groupon", "Referral", "Walk-in"];
const ALL_TAGS = ["VIP", "Surfer", "Member", "Pregnant", "New mom", "Senior", "Tourist", "Local"];

function makeClient(i) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const name = `${first} ${last}`;
  const r = rand();
  let status;
  if (r < 0.12) status = "New";
  else if (r < 0.62) status = "Regular";
  else if (r < 0.78) status = "At-Risk";
  else if (r < 0.92) status = "Lapsed";
  else status = "Win-back";

  const joinMonthsAgo = Math.floor(rand() * 24);
  const join = new Date();
  join.setMonth(join.getMonth() - joinMonthsAgo);

  const membership =
    status === "Lapsed" ? "Lapsed" :
    rand() < 0.45 ? "Unlimited" :
    rand() < 0.6 ? "8-pack" :
    rand() < 0.7 ? "4-pack" : "Drop-in";

  const baseLtv =
    membership === "Unlimited" ? 180 + rand() * 60 :
    membership === "8-pack" ? 140 :
    membership === "4-pack" ? 80 : 32;
  const ltv = Math.round(baseLtv * Math.max(1, joinMonthsAgo * 0.85));

  const visits90 =
    status === "Lapsed" ? 0 :
    status === "At-Risk" ? Math.floor(rand() * 4) + 1 :
    status === "New" ? Math.floor(rand() * 5) + 1 :
    status === "Win-back" ? Math.floor(rand() * 3) :
    Math.floor(rand() * 18) + 8;

  const daysSinceLast =
    status === "Lapsed" ? 60 + Math.floor(rand() * 90) :
    status === "At-Risk" ? 14 + Math.floor(rand() * 20) :
    status === "Win-back" ? 40 + Math.floor(rand() * 30) :
    Math.floor(rand() * 8);

  const reason =
    status === "At-Risk"
      ? pick([
          `Frequency down ${50 + Math.floor(rand() * 30)}% from 90-day baseline`,
          `${daysSinceLast} days since last visit (avg gap 4d)`,
          "Membership auto-renew failed last cycle",
          "No-showed last 2 booked classes",
        ])
      : undefined;

  const tagsCount = Math.floor(rand() * 3);
  const tags = [...new Set(range(tagsCount).map(() => pick(ALL_TAGS)))];

  return {
    id: `c${i + 1}`,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@tidewatermembers.com`,
    status,
    joinDate: join.toISOString().slice(0, 10),
    joinSource: pick(CHANNELS),
    membership,
    ltv,
    visits90,
    daysSinceLast,
    favoriteInstructor: pick(INSTRUCTORS).name,
    reason,
    tags,
    notes: pick([
      "Usually takes the 6 AM flow before work.",
      "Recovering from shoulder strain — avoids overhead work.",
      "Referred three friends this season. VIP member.",
      "Prefers Priya's restorative sessions and quieter playlists.",
      "Travels frequently and books classes a week in advance.",
      "",
    ]),
  };
}

const fmtTime = (h, m = 0) =>
  `${((h + 11) % 12) + 1}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

const MONTHS = ["Jun '25","Jul '25","Aug '25","Sep '25","Oct '25","Nov '25","Dec '25","Jan '26","Feb '26","Mar '26","Apr '26","May '26"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["6a", "7a", "8a", "9a", "10a", "12p", "4p", "5p", "6p", "7p", "8p"];

export function generateStudioData() {
  seed = 42;

  const clients = range(280).map(makeClient);
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = clients.filter((c) => c.status === s).length;
    return acc;
  }, {});

  const kpis = [
    { label: "Active Clients", value: 284, delta: 4.2, unit: "" },
    { label: "MRR", value: 38420, delta: 6.8, unit: "$" },
    { label: "Fill Rate", value: 78, delta: 3.1, unit: "%" },
    { label: "Churn Rate", value: 4.6, delta: -0.9, unit: "%", invert: true },
    { label: "4-Visit Conversion", value: 62, delta: 5.4, unit: "%" },
  ];

  const todayClasses = [
    { id: "t1", name: "Sunrise Flow", time: fmtTime(6), instructor: "Sam Okafor", booked: 18, capacity: 20, waitlist: 3 },
    { id: "t2", name: "Surf-Strength", time: fmtTime(8), instructor: "Jonah Reyes", booked: 14, capacity: 16, waitlist: 1 },
    { id: "t3", name: "Pilates Fusion", time: fmtTime(10), instructor: "Anika Cole", booked: 6, capacity: 18, waitlist: 0 },
    { id: "t4", name: "Yin & Restore", time: fmtTime(12), instructor: "Priya Shah", booked: 9, capacity: 20, waitlist: 0 },
    { id: "t5", name: "Power Vinyasa", time: fmtTime(17, 30), instructor: "Theo Lindgren", booked: 22, capacity: 24, waitlist: 4 },
    { id: "t6", name: "Beach Yoga", time: fmtTime(19), instructor: "Maya Calderón", booked: 11, capacity: 22, waitlist: 0 },
  ];

  const actionItems = [
    { id: "a1", title: "12 at-risk clients need outreach this week", subtitle: "Avg LTV $1,840 — biggest is Ella Park ($3.2k)", cta: "Open at-risk list", route: "/clients" },
    { id: "a2", title: "3 classes under 40% full tomorrow", subtitle: "10 AM Pilates, 12 PM Yin, 2 PM Beach Yoga", cta: "View schedule", route: "/analytics" },
    { id: "a3", title: "8 new clients hit their 4th visit milestone", subtitle: "Auto-queued for the conversion offer", cta: "Review queue", route: "/communications" },
    { id: "a4", title: "Mindbody sync lagged 18 min this morning", subtitle: "Auto-resolved at 7:12 AM", cta: "Open integrations", route: "/settings" },
  ];

  const activityFeed = [
    { id: "f1", type: "booking", text: "Ruby Mendes booked Sunrise Flow tomorrow", time: "2 min ago" },
    { id: "f2", type: "reply", text: "Liam Holloway replied “Y” to confirm 5:30 PM Power Vinyasa", time: "6 min ago" },
    { id: "f3", type: "signup", text: "New signup: Wren Saito — Instagram", time: "14 min ago" },
    { id: "f4", type: "cancel", text: "Tess Brennan cancelled 12 PM Yin (24h+)", time: "22 min ago" },
    { id: "f5", type: "booking", text: "Otis Park joined Surf-Strength waitlist", time: "38 min ago" },
    { id: "f6", type: "reply", text: "Cleo Marsh replied to win-back offer", time: "1 hr ago" },
    { id: "f7", type: "signup", text: "New signup: Reed Aaberg — Referral (Maya C.)", time: "1 hr ago" },
    { id: "f8", type: "cancel", text: "Beau Forrest no-showed 6 AM Sunrise Flow", time: "2 hr ago" },
    { id: "f9", type: "booking", text: "Iris Quintero booked unlimited renewal", time: "3 hr ago" },
  ];

  const visitsTrend = range(30).map((i) => ({
    d: `D${i + 1}`,
    visits: Math.round(80 + Math.sin(i / 3) * 18 + rand() * 20),
    noShows: Math.round(2 + rand() * 6),
  }));

  const scheduleHeatmap = DAYS.map((d) => ({
    day: d,
    cells: SLOTS.map((s) => {
      const isMorning = s.endsWith("a");
      const isEvening = ["5p", "6p", "7p"].includes(s);
      const isWeekend = d === "Sat" || d === "Sun";
      let base = 0.55 + rand() * 0.2;
      if (isMorning) base += 0.15;
      if (isEvening) base += 0.2;
      if (isWeekend && isMorning) base += 0.1;
      if (s === "10a" || s === "4p") base -= 0.25;
      return { slot: s, fill: Math.max(0.18, Math.min(0.99, base)) };
    }),
  }));

  const cohorts = MONTHS.map((m, idx) => ({
    month: m,
    size: 18 + Math.floor(rand() * 16),
    m1: Math.round(70 + rand() * 22),
    m3: idx <= 9 ? Math.round(48 + rand() * 22) : null,
    m6: idx <= 6 ? Math.round(34 + rand() * 20) : null,
    m12: idx === 0 ? Math.round(22 + rand() * 16) : null,
  }));

  const classTrend = range(12).map((i) => ({
    wk: `W${i + 1}`,
    attended: Math.round(14 + Math.sin(i / 2) * 3 + rand() * 4),
    capacity: 20,
    noShow: Math.round(1 + rand() * 3),
  }));

  const revenueMix = [
    { name: "Memberships", value: 22400 },
    { name: "Class Packs", value: 9800 },
    { name: "Drop-ins", value: 3600 },
    { name: "Retail", value: 2620 },
  ];

  const revpashTrend = range(12).map((i) => ({
    wk: `W${i + 1}`,
    revpash: +(11 + Math.sin(i / 2.5) * 1.8 + rand() * 1.2).toFixed(2),
  }));

  const channelLtv = [
    { channel: "Referral", cac: 0, ltv: 1840, count: 62 },
    { channel: "Instagram", cac: 38, ltv: 1240, count: 118 },
    { channel: "Walk-in", cac: 12, ltv: 980, count: 44 },
    { channel: "Groupon", cac: 22, ltv: 310, count: 56 },
  ];

  const reminderRules = [
    { id: "r1", name: "24-hour SMS reminder", trigger: "24h before class", enabled: true, replies: "Cancel link in SMS" },
    { id: "r2", name: "2-hour SMS reminder", trigger: "2h before class", enabled: true, replies: "Cancel link in SMS" },
    { id: "r3", name: "Waitlist promotion", trigger: "Seat opens", enabled: true, replies: "Auto-books on Y" },
    { id: "r4", name: "No-show follow-up", trigger: "1h after missed class", enabled: true, replies: "Reply R to rebook this week" },
  ];

  const reminderExamples = [
    { id: "ex1", body: "Hey Ruby — your Sunrise Flow with Sam is tomorrow at 6 AM. Reply Y to confirm or C to cancel. See you there 🌊 — Tidewater" },
    { id: "ex2", body: "Liam — a spot just opened in 5:30 Power Vinyasa tonight w/ Theo. Reply Y in the next 10 min and it's yours. — Tidewater" },
    { id: "ex3", body: "Hi Tess — we missed you at 12 PM Yin today. Want us to rebook you for Priya's 12 PM on Thursday? Reply R. — Tidewater" },
  ];

  const templates = [
    { id: "tpl1", name: "Welcome series — Day 1", category: "Lifecycle", replyRate: 0.42, bookingRate: 0.34, revenue: 1280, body: "Welcome to Tidewater, {first_name}! Your first week is on us. Sam teaches Sunrise Flow Mon/Wed/Fri — want us to save you a spot?" },
    { id: "tpl2", name: "4-visit milestone offer", category: "Conversion", replyRate: 0.51, bookingRate: 0.46, revenue: 4620, body: "{first_name}, you've made 4 visits — you're officially part of the crew. Unlimited is 30% off this week if you want to keep the momentum." },
    { id: "tpl3", name: "At-risk check-in", category: "Retention", replyRate: 0.38, bookingRate: 0.27, revenue: 2140, body: "Hey {first_name} — haven't seen you since {last_class_date}. Everything ok? {favorite_instructor} is teaching Thursday if you want a soft re-entry." },
    { id: "tpl4", name: "Lapsed win-back (60d)", category: "Win-back", replyRate: 0.22, bookingRate: 0.14, revenue: 1860, body: "We miss you, {first_name}. Here's a free class on us — no strings. Pick any class this month: tidewater.studio/comeback" },
    { id: "tpl5", name: "Birthday", category: "Lifecycle", replyRate: 0.61, bookingRate: 0.33, revenue: 720, body: "Happy birthday, {first_name}! Bring a friend free this week — our gift. 🎉" },
    { id: "tpl6", name: "Referral thank-you", category: "Lifecycle", replyRate: 0.48, bookingRate: 0.29, revenue: 940, body: "Thanks for sending {friend_name} our way, {first_name} — 1 free class added to your account." },
  ];

  const sendQueue = clients
    .filter((c) => c.status === "At-Risk" || c.status === "Win-back")
    .slice(0, 8)
    .map((c, i) => ({
      id: `q${i}`,
      client: c,
      template:
        c.status === "At-Risk" ? templates[2] :
        c.status === "Win-back" ? templates[3] : templates[0],
    }));

  const messageLog = [
    { id: "m1", client: "Ruby Mendes", template: "Welcome — Day 1", sent: "Today 7:02 AM", reply: "Y — Sunrise Flow tomorrow", booked: "Sunrise Flow, Tue 6 AM", revenue: 0 },
    { id: "m2", client: "Cleo Marsh", template: "Lapsed win-back", sent: "Today 7:05 AM", reply: "What's the catch 😅", booked: "Yin & Restore, Wed 12 PM", revenue: 28 },
    { id: "m3", client: "Liam Holloway", template: "2h reminder", sent: "Today 3:30 PM", reply: "Y", booked: "Power Vinyasa, Today 5:30 PM", revenue: 0 },
    { id: "m4", client: "Tess Brennan", template: "No-show follow-up", sent: "Today 1:10 PM", reply: "R", booked: "Yin & Restore, Thu 12 PM", revenue: 0 },
    { id: "m5", client: "Ella Park", template: "At-risk check-in", sent: "Yesterday", reply: "Thx — booking now", booked: "Surf-Strength, Sat 8 AM", revenue: 32 },
    { id: "m6", client: "Otis Park", template: "4-visit milestone", sent: "Yesterday", reply: "Sold. Sign me up", booked: "Unlimited membership", revenue: 189 },
    { id: "m7", client: "Iris Quintero", template: "Birthday", sent: "Mon", reply: "🎉", booked: "Beach Yoga, Sun 9 AM (+1 friend)", revenue: 28 },
  ];

  const integrations = [
    { id: "mindbody", name: "Mindbody", desc: "Booking + payments source of truth", connected: true, lastSync: "2 min ago" },
    { id: "acuity", name: "Acuity Scheduling", desc: "Private session bookings", connected: true, lastSync: "11 min ago" },
    { id: "square", name: "Square Appointments", desc: "Retail + appointment add-ons", connected: false, lastSync: null },
    { id: "vagaro", name: "Vagaro", desc: "Alternative booking system", connected: false, lastSync: null },
  ];

  return {
    key: "main",
    studio: STUDIO,
    clients,
    counts,
    kpis,
    todayClasses,
    actionItems,
    activityFeed,
    visitsTrend,
    instructors: INSTRUCTORS,
    classTypes: CLASS_TYPES,
    days: DAYS,
    slots: SLOTS,
    scheduleHeatmap,
    cohorts,
    classTrend,
    revenueMix,
    revpashTrend,
    channelLtv,
    reminderRules,
    reminderExamples,
    templates,
    sendQueue,
    messageLog,
    integrations,
  };
}
