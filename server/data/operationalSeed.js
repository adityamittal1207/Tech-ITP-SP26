import { resolveOccurrenceDateTime, localDateKey } from "../services/bookingService.js";
import {
  addDaysToDateKey,
  studioDateTimeUtc,
  studioDayName,
  studioDayNameFromDateKey,
} from "../utils/studioTimezone.js";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

/** Align booking datetime to the class's scheduled day/time on the calendar date of `offset` days ago. */
function bookedAtForClass(cls, offsetDays) {
  const ref = daysAgo(offsetDays);
  return resolveOccurrenceDateTime(cls, localDateKey(ref));
}

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
  name: "Studio Owner",
  email: "owner@tether.studio",
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

  const todayDow = studioDayName();
  const classData = [
    ...CLASS_DATA,
    {
      name: "Midday Express",
      instructor: "Chris Yates",
      dayOfWeek: todayDow,
      time: "12:30",
      durationMinutes: 45,
      capacity: 16,
      category: "hiit",
    },
  ];

  return { memberProfiles, memberDocs, classData };
}

function classIndexFor(memberIdx, bookingIdx, classes) {
  return (memberIdx * 7 + bookingIdx * 11) % classes.length;
}

export function buildBookings(memberProfiles, classes) {
  const bookings = [];
  memberProfiles.forEach((profile, memberIdx) => {
    profile.bookingOffsets.forEach((offset, bookingIdx) => {
      const classIdx = classIndexFor(memberIdx, bookingIdx, classes);
      bookings.push({
        memberIdx,
        classIdx,
        bookedAt: bookedAtForClass(classes[classIdx], offset),
        attended: rand() > 0.2,
        status: "booked",
        source: "import",
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
      const classIdx = classIndexFor(memberIdx, 20 + i, classes);
      bookings.push({
        memberIdx,
        classIdx,
        bookedAt: bookedAtForClass(classes[classIdx], offset),
        attended: rand() > 0.15,
        status: "booked",
        source: "import",
      });
    }
  });
  return bookings;
}


const TODAY_FILL_SCENARIOS = ["full_waitlist", "perfect", "under"];

function allocateTodayMember(memberProfiles, startIdx, classIdx, usedSlots) {
  let memberIdx = startIdx;
  for (let attempt = 0; attempt < memberProfiles.length; attempt++) {
    const mIdx = memberIdx % memberProfiles.length;
    const slotKey = `${mIdx}:${classIdx}`;
    if (!usedSlots.has(slotKey)) {
      usedSlots.add(slotKey);
      return { memberIdx: mIdx, nextIdx: memberIdx + 1 };
    }
    memberIdx++;
  }
  return { memberIdx: startIdx % memberProfiles.length, nextIdx: startIdx + 1 };
}

/** Bookings dated today — full+waitlist, at-capacity, and under-booked demos. */
export function buildTodayBookings(memberProfiles, classes) {
  const todayKey = localDateKey();
  const todayDow = studioDayName();
  const todayClasses = classes
    .filter((c) => c.dayOfWeek === todayDow)
    .sort((a, b) => a.time.localeCompare(b.time));
  const bookings = [];
  let memberIdx = 1;
  const usedSlots = new Set();

  todayClasses.forEach((cls, scenarioIdx) => {
    const classIdx = classes.indexOf(cls);
    const scenario = TODAY_FILL_SCENARIOS[scenarioIdx % TODAY_FILL_SCENARIOS.length];
    const [hStr, mStr] = cls.time.split(":");
    const bookedAt = studioDateTimeUtc(todayKey, Number(hStr), Number(mStr));

    let targetBooked;
    let targetWaitlist;
    switch (scenario) {
      case "full_waitlist":
        targetBooked = cls.capacity;
        targetWaitlist = 5;
        break;
      case "perfect":
        targetBooked = cls.capacity;
        targetWaitlist = 0;
        break;
      case "under":
      default:
        targetBooked = Math.max(1, Math.floor(cls.capacity * 0.35));
        targetWaitlist = 0;
        break;
    }

    for (let i = 0; i < targetBooked; i++) {
      const slot = allocateTodayMember(memberProfiles, memberIdx, classIdx, usedSlots);
      memberIdx = slot.nextIdx;
      const classStarted = bookedAt.getTime() <= Date.now();
      bookings.push({
        memberIdx: slot.memberIdx,
        classIdx,
        bookedAt,
        attended: classStarted ? rand() > 0.18 : false,
        status: "booked",
        source: i % 3 === 0 ? "public" : "staff",
        reminderSent: i < 3,
      });
    }

    for (let w = 0; w < targetWaitlist; w++) {
      const slot = allocateTodayMember(memberProfiles, memberIdx, classIdx, usedSlots);
      memberIdx = slot.nextIdx;
      bookings.push({
        memberIdx: slot.memberIdx,
        classIdx,
        bookedAt,
        attended: false,
        status: "waitlisted",
        source: "public",
      });
    }
  });

  return bookings;
}

/** Tomorrow's classes — powers reminder / SMS reply demo on home activity feed. */
export function buildTomorrowBookings(memberProfiles, classes) {
  const dateKey = addDaysToDateKey(localDateKey(), 1);
  const tomorrowDow = studioDayNameFromDateKey(dateKey);
  const tomorrowClasses = classes.filter((c) => c.dayOfWeek === tomorrowDow);
  const bookings = [];
  let memberIdx = 0;

  for (const cls of tomorrowClasses.slice(0, 4)) {
    const occurrence = resolveOccurrenceDateTime(cls, dateKey);
    const count = Math.min(3, Math.floor(cls.capacity * 0.35));
    for (let i = 0; i < count; i++) {
      bookings.push({
        memberIdx: memberIdx++ % memberProfiles.length,
        classIdx: classes.indexOf(cls),
        bookedAt: occurrence,
        attended: false,
        status: "booked",
        source: i === 1 ? "public" : "staff",
        reminderSent: true,
      });
    }
  }
  return bookings;
}
