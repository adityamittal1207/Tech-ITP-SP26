function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line, rowIdx) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    row._row = rowIdx + 2;
    return row;
  });
  return { headers, rows };
}

function requireFields(row, fields) {
  const missing = fields.filter((f) => !row[f]?.trim());
  if (missing.length) {
    throw new Error(`Row ${row._row}: missing ${missing.join(", ")}`);
  }
}

export async function importClasses(csvText, ownerUid) {
  const { rows } = parseCsv(csvText);
  const errors = [];
  let imported = 0;
  let updated = 0;

  const Class = (await import("../models/Class.js")).default;

  for (const row of rows) {
    try {
      requireFields(row, ["name", "instructor", "dayOfWeek", "time", "durationMinutes", "capacity", "category"]);
      const payload = {
        ownerUid,
        name: row.name.trim(),
        instructor: row.instructor.trim(),
        dayOfWeek: row.dayOfWeek.trim().toLowerCase(),
        time: row.time.trim(),
        durationMinutes: Number(row.durationMinutes),
        capacity: Number(row.capacity),
        category: row.category.trim().toLowerCase(),
      };
      const existing = await Class.findOne({
        ownerUid,
        name: payload.name,
        dayOfWeek: payload.dayOfWeek,
        time: payload.time,
      });
      if (existing) {
        await Class.findByIdAndUpdate(existing._id, payload);
        updated++;
      } else {
        await Class.create(payload);
        imported++;
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { imported, updated, errors };
}

export async function importMembers(csvText, ownerUid, defaultSource = "native") {
  const { rows } = parseCsv(csvText);
  const errors = [];
  let imported = 0;
  let updated = 0;

  const Member = (await import("../models/Member.js")).default;
  const { normalizePhone } = await import("./phone.js");

  for (const row of rows) {
    try {
      requireFields(row, ["name", "email", "phone", "membershipType"]);
      const email = row.email.trim().toLowerCase();
      let phone = row.phone.trim();
      try {
        phone = normalizePhone(phone);
      } catch {
        throw new Error(`Row ${row._row}: invalid phone ${row.phone}`);
      }

      const payload = {
        ownerUid,
        name: row.name.trim(),
        email,
        phone,
        membershipType: row.membershipType.trim().toLowerCase(),
        source: row.source?.trim().toLowerCase() || defaultSource,
        joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
        joinSource: row.joinSource?.trim() || "Walk-in",
        isActive: row.isActive !== "false",
        notes: row.notes?.trim() || "",
        tags: row.tags ? row.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
      };

      const existing = await Member.findOne({ ownerUid, email });
      if (existing) {
        await Member.findByIdAndUpdate(existing._id, payload, { runValidators: true });
        updated++;
      } else {
        await Member.create(payload);
        imported++;
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { imported, updated, errors };
}

export async function importBookings(csvText, ownerUid) {
  const { rows } = parseCsv(csvText);
  const errors = [];
  let imported = 0;
  let updated = 0;

  const Member = (await import("../models/Member.js")).default;
  const Class = (await import("../models/Class.js")).default;
  const Booking = (await import("../models/Booking.js")).default;

  for (const row of rows) {
    try {
      requireFields(row, ["memberEmail", "className", "bookedAt"]);
      const member = await Member.findOne({
        ownerUid,
        email: row.memberEmail.trim().toLowerCase(),
      });
      if (!member) throw new Error(`Row ${row._row}: member not found ${row.memberEmail}`);

      const cls = await Class.findOne({ ownerUid, name: row.className.trim() });
      if (!cls) throw new Error(`Row ${row._row}: class not found ${row.className}`);

      const bookedAt = new Date(row.bookedAt);
      if (Number.isNaN(bookedAt.getTime())) {
        throw new Error(`Row ${row._row}: invalid date ${row.bookedAt}`);
      }

      const attended = row.attended !== "false" && row.attended !== "0";
      const existing = await Booking.findOne({
        memberId: member._id,
        classId: cls._id,
        bookedAt,
      });

      if (existing) {
        existing.attended = attended;
        await existing.save();
        updated++;
      } else {
        await Booking.create({
          ownerUid,
          memberId: member._id,
          classId: cls._id,
          bookedAt,
          attended,
          status: "booked",
          source: "import",
          externalSource: "native",
        });
        imported++;
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { imported, updated, errors };
}

export const CSV_TEMPLATES = {
  classes: `name,instructor,dayOfWeek,time,durationMinutes,capacity,category
Sunrise Vinyasa,Sandra Lee,monday,06:30,60,20,yoga
Strength Foundations,Tom Briggs,monday,09:30,50,15,strength`,
  members: `name,email,phone,joinDate,membershipType,joinSource,tags,notes
Taylor Morgan,taylor.morgan@tidewatermembers.com,+16193491234,2025-01-15,premium,Referral,VIP|Local,Prefers morning classes`,
  bookings: `memberEmail,className,bookedAt,attended
taylor.morgan@tidewatermembers.com,Sunrise Vinyasa,2025-05-20,true
taylor.morgan@tidewatermembers.com,Strength Foundations,2025-05-15,true`,
};

export const IMPORT_SOURCES = ["native", "mindbody", "acuity"];

export const EXPORT_GUIDES = {
  mindbody: {
    name: "Mindbody",
    steps: [
      "In Mindbody, open Reports → Clients (or Client List) and export to CSV.",
      "For classes: Reports → Class Schedule or export your recurring schedule.",
      "For visits: Reports → Attendance / Visit History and export with client email and class name.",
      "Map columns to our templates (download below), then upload members → classes → bookings in that order.",
    ],
  },
  acuity: {
    name: "Acuity Scheduling",
    steps: [
      "In Acuity: Clients → export client list as CSV.",
      "Appointment Types: note names for the classes template (one row per type or recurring slot).",
      "Appointments: export appointments with client email, type name, date/time, and attended/canceled status.",
      "Upload members first, then classes, then bookings using the templates below.",
    ],
  },
};
