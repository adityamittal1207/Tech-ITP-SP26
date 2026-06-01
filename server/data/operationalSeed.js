const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

let seed = 42;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = [
  "Maya", "Jonah", "Priya", "Theo", "Anika", "Sam", "Ella", "Noah", "Ruby", "Liam",
  "Sofia", "Owen", "Harper", "Mason", "Isla", "Leo", "Nora", "Kai", "Mira", "Eli",
  "Zoe", "Asher", "Lila", "Finn", "June", "Wyatt", "Sage", "Cal", "Iris", "Reed",
  "Maren", "Tess", "Beau", "Hazel", "Otis", "Wren", "Jude", "Cleo", "Rhett", "Ines",
  "Quinn", "Avi", "Rae", "Tate", "Vera", "Milo", "Sasha", "Dax", "Pia", "Knox",
];
const LAST = [
  "Calderón", "Reyes", "Shah", "Lindgren", "Cole", "Okafor", "Park", "Mendes",
  "Nakamura", "Brennan", "Holloway", "Espinoza", "Castellano", "Whitaker", "Aaberg",
  "Quintero", "Saito", "Delgado", "Marsh", "Tate", "Bautista", "Forrest", "Linde",
  "Ivers", "Solis", "Crane", "Maddox", "Beauchamp", "Suzuki", "Aldridge",
];
const CHANNELS = ["Instagram", "Groupon", "Referral", "Walk-in"];
const JOIN_SOURCE_TO_SOURCE = {
  Instagram: "instagram",
  Groupon: "groupon",
  Referral: "referral",
  "Walk-in": "walk-in",
};
const ALL_TAGS = ["VIP", "Surfer", "Member", "Pregnant", "New mom", "Senior", "Tourist", "Local"];
const MEMBERSHIP_TYPES = ["basic", "premium", "unlimited"];
const NOTES = [
  "Prefers 6:30 AM classes before work.",
  "Recovering from shoulder strain; avoids overhead presses.",
  "Referred three coworkers this quarter.",
  "Usually books restorative classes midweek.",
  "Travels twice a month and books early when in town.",
  "",
];

export const CLASS_DATA = [
  { name: "Morning Flow", instructor: "Sandra Lee", dayOfWeek: "monday", time: "07:00", durationMinutes: 60, capacity: 20, category: "yoga" },
  { name: "Power Pilates", instructor: "Tom Briggs", dayOfWeek: "monday", time: "09:30", durationMinutes: 50, capacity: 15, category: "pilates" },
  { name: "HIIT Ignite", instructor: "Mia Russo", dayOfWeek: "tuesday", time: "06:30", durationMinutes: 45, capacity: 25, category: "hiit" },
  { name: "Spin Circuit", instructor: "Chris Yates", dayOfWeek: "tuesday", time: "18:00", durationMinutes: 50, capacity: 18, category: "spin" },
  { name: "Strength Foundations", instructor: "Tom Briggs", dayOfWeek: "wednesday", time: "07:30", durationMinutes: 60, capacity: 20, category: "strength" },
  { name: "Midday Yoga", instructor: "Sandra Lee", dayOfWeek: "wednesday", time: "12:00", durationMinutes: 45, capacity: 15, category: "yoga" },
  { name: "Evening Pilates", instructor: "Mia Russo", dayOfWeek: "thursday", time: "19:00", durationMinutes: 50, capacity: 15, category: "pilates" },
  { name: "HIIT Express", instructor: "Chris Yates", dayOfWeek: "thursday", time: "06:30", durationMinutes: 30, capacity: 25, category: "hiit" },
  { name: "Friday Spin", instructor: "Chris Yates", dayOfWeek: "friday", time: "07:00", durationMinutes: 50, capacity: 18, category: "spin" },
  { name: "Core & Strength", instructor: "Tom Briggs", dayOfWeek: "friday", time: "17:30", durationMinutes: 45, capacity: 20, category: "strength" },
  { name: "Weekend Warrior", instructor: "Mia Russo", dayOfWeek: "saturday", time: "09:00", durationMinutes: 60, capacity: 25, category: "hiit" },
  { name: "Restorative Yoga", instructor: "Sandra Lee", dayOfWeek: "saturday", time: "11:00", durationMinutes: 75, capacity: 12, category: "yoga" },
  { name: "Sunday Flow", instructor: "Sandra Lee", dayOfWeek: "sunday", time: "10:00", durationMinutes: 60, capacity: 20, category: "yoga" },
  { name: "Sunday Strength", instructor: "Tom Briggs", dayOfWeek: "sunday", time: "12:00", durationMinutes: 60, capacity: 18, category: "strength" },
];

function makeMemberProfile(i, targetStatus) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const slug = last.toLowerCase().replace(/[^a-z]/g, "");
  const email = `${first.toLowerCase()}.${slug}${i > 49 ? i : ""}@tidewatermembers.com`;
  const phone = `+1619349${String(1000 + i).slice(-4)}`;

  let joinDaysAgo;
  let lastBookingDaysAgo;
  let bookingOffsets;

  switch (targetStatus) {
    case "new":
      joinDaysAgo = Math.floor(rand() * 28) + 1;
      lastBookingDaysAgo = Math.floor(rand() * Math.min(joinDaysAgo, 14)) + 1;
      bookingOffsets = buildHistory(lastBookingDaysAgo, 2 + Math.floor(rand() * 4));
      break;
    case "regular":
      joinDaysAgo = Math.floor(rand() * 700) + 60;
      lastBookingDaysAgo = Math.floor(rand() * 13) + 1;
      bookingOffsets = buildHistory(lastBookingDaysAgo, 6 + Math.floor(rand() * 10));
      break;
    case "at-risk":
      joinDaysAgo = Math.floor(rand() * 500) + 90;
      lastBookingDaysAgo = 15 + Math.floor(rand() * 6);
      bookingOffsets = buildHistory(lastBookingDaysAgo, 4 + Math.floor(rand() * 8));
      break;
    case "lapsed":
      joinDaysAgo = Math.floor(rand() * 600) + 120;
      if (rand() < 0.15) {
        bookingOffsets = [];
        lastBookingDaysAgo = 120;
      } else {
        lastBookingDaysAgo = 25 + Math.floor(rand() * 120);
        bookingOffsets = buildHistory(lastBookingDaysAgo, 2 + Math.floor(rand() * 6));
      }
      break;
    default:
      joinDaysAgo = 180;
      lastBookingDaysAgo = 5;
      bookingOffsets = buildHistory(5, 8);
  }

  const tagsCount = Math.floor(rand() * 3);
  const tags = [...new Set(Array.from({ length: tagsCount }, () => pick(ALL_TAGS)))];

  return {
    name: `${first} ${last}`,
    email,
    phone,
    membershipType: pick(MEMBERSHIP_TYPES),
    joinDaysAgo,
    joinSource: pick(CHANNELS),
    tags,
    notes: pick(NOTES),
    bookingOffsets,
  };
}

function buildHistory(lastDaysAgo, count) {
  const offsets = [lastDaysAgo];
  let cursor = lastDaysAgo;
  for (let j = 1; j < count; j++) {
    cursor += 5 + Math.floor(rand() * 12);
    if (cursor <= 90) offsets.push(cursor);
  }
  return offsets.sort((a, b) => a - b);
}

/** Fixed owner profile — always seeded first for SMS testing */
export const OWNER_PROFILE = {
  name: "Aditya Mittal",
  email: "aditya.mittal@tether.studio",
  phone: "+17187758267",
  membershipType: "unlimited",
  joinDaysAgo: 365,
  joinSource: "Referral",
  tags: ["VIP", "Owner"],
  notes: "Studio owner profile — use for SMS outreach testing.",
  bookingOffsets: buildHistory(17, 10),
};

export function generateOperationalSeed(memberCount = 150) {
  seed = 42;

  const statusBuckets = [
    ...Array(Math.round(memberCount * 0.12)).fill("new"),
    ...Array(Math.round(memberCount * 0.50)).fill("regular"),
    ...Array(Math.round(memberCount * 0.16)).fill("at-risk"),
    ...Array(Math.round(memberCount * 0.22)).fill("lapsed"),
  ];
  while (statusBuckets.length < memberCount) statusBuckets.push("regular");
  while (statusBuckets.length > memberCount) statusBuckets.pop();

  const memberProfiles = [
    OWNER_PROFILE,
    ...statusBuckets.map((status, i) => makeMemberProfile(i, status)),
  ];

  const memberDocs = memberProfiles.map(({ bookingOffsets: _o, joinDaysAgo, joinSource, ...fields }) => ({
    ...fields,
    joinSource,
    source: JOIN_SOURCE_TO_SOURCE[joinSource] ?? "walk-in",
    joinDate: daysAgo(joinDaysAgo),
    isActive: true,
  }));

  return { memberProfiles, memberDocs, classData: CLASS_DATA };
}

function classIndexFor(memberIdx, bookingIdx, classes) {
  return (memberIdx * 7 + bookingIdx * 11) % classes.length;
}

export function buildBookings(memberProfiles, classes) {
  const bookings = [];
  memberProfiles.forEach((profile, memberIdx) => {
    profile.bookingOffsets.forEach((offset, bookingIdx) => {
      bookings.push({
        memberIdx,
        classIdx: classIndexFor(memberIdx, bookingIdx, classes),
        bookedAt: daysAgo(offset),
        attended: rand() > 0.2,
      });
    });
  });
  return bookings;
}

/** Extra bookings in the prior 30-day window so KPI period deltas are non-zero. */
export function buildSupplementalBookings(memberProfiles, classes) {
  const bookings = [];
  memberProfiles.forEach((profile, memberIdx) => {
    const extraCount = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < extraCount; i++) {
      const offset = 31 + Math.floor(rand() * 24);
      bookings.push({
        memberIdx,
        classIdx: classIndexFor(memberIdx, 20 + i, classes),
        bookedAt: daysAgo(offset),
        attended: rand() > 0.15,
      });
    }
  });
  return bookings;
}

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/** Bookings dated today for classes on today's weekday — powers dashboard fill. */
export function buildTodayBookings(memberProfiles, classes) {
  const today = new Date();
  const todayDow = DAY_NAMES[today.getDay()];
  const todayClasses = classes.filter((c) => c.dayOfWeek === todayDow);
  const bookings = [];
  let memberIdx = 0;

  for (const cls of todayClasses) {
    const targetBooked = Math.max(1, Math.floor(cls.capacity * (0.45 + rand() * 0.4)));
    for (let i = 0; i < targetBooked; i++) {
      const [hStr, mStr] = cls.time.split(":");
      const bookedAt = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        Number(hStr),
        Number(mStr),
        0,
        0
      );
      bookings.push({
        memberIdx: memberIdx++ % memberProfiles.length,
        classIdx: classes.indexOf(cls),
        bookedAt,
        attended: false,
      });
    }
  }
  return bookings;
}
