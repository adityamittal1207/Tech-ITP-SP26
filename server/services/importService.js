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

export async function importClasses(csvText) {
  const { rows } = parseCsv(csvText);
  const errors = [];
  let imported = 0;
  let updated = 0;

  const Class = (await import("../models/Class.js")).default;

  for (const row of rows) {
    try {
      requireFields(row, ["name", "instructor", "dayOfWeek", "time", "durationMinutes", "capacity", "category"]);
      const payload = {
        name: row.name.trim(),
        instructor: row.instructor.trim(),
        dayOfWeek: row.dayOfWeek.trim().toLowerCase(),
        time: row.time.trim(),
        durationMinutes: Number(row.durationMinutes),
        capacity: Number(row.capacity),
        category: row.category.trim().toLowerCase(),
      };
      const existing = await Class.findOne({
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

export async function importMembers(csvText) {
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
        name: row.name.trim(),
        email,
        phone,
        membershipType: row.membershipType.trim().toLowerCase(),
        joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
        joinSource: row.joinSource?.trim() || "Walk-in",
        isActive: row.isActive !== "false",
        notes: row.notes?.trim() || "",
        tags: row.tags ? row.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
      };

      const existing = await Member.findOne({ email });
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

export async function importBookings(csvText) {
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
      const member = await Member.findOne({ email: row.memberEmail.trim().toLowerCase() });
      if (!member) throw new Error(`Row ${row._row}: member not found ${row.memberEmail}`);

      const cls = await Class.findOne({ name: row.className.trim() });
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
          memberId: member._id,
          classId: cls._id,
          bookedAt,
          attended,
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
Morning Flow,Sandra Lee,monday,07:00,60,20,yoga
Power Pilates,Tom Briggs,monday,09:30,50,15,pilates`,
  members: `name,email,phone,joinDate,membershipType,joinSource,tags,notes
Jane Doe,jane.doe@email.com,+16195551234,2025-01-15,premium,Referral,VIP,Loves morning classes`,
  bookings: `memberEmail,className,bookedAt,attended
jane.doe@email.com,Morning Flow,2025-05-20,true
jane.doe@email.com,Power Pilates,2025-05-15,true`,
};
