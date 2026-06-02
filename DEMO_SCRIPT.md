# Tether — Full Presenter Script (~5 min)

**Studio:** Tidewater Yoga + Surf · **You are:** Maya Calderón  
**Login:** Firebase UID `CJKpE4LxDbS24OVIUIgD5SYpnyc2`  
**Tone:** Confident walkthrough — show what works, don’t re-pitch the problem.

---

## Pre-show (10 min before — not spoken)

```bash
cd server && npm run seed:firebase -- CJKpE4LxDbS24OVIUIgD5SYpnyc2
cd .. && npm run dev
```

- Logged in at [http://localhost:5173](http://localhost:5173) — see **“Good morning, Maya”**
- Maya’s phone = your **Twilio-verified number** in `server/data/demoTenantConfig.js`
- Browser zoom 110–125%, full screen, no login tab
- Phone on desk — you’ll get 2 texts during the demo

---

## OPEN · 5 sec

**[DO]** App already on **Home**. Smile. No login screen.

**[SAY]**  
“This is Tether — the command center Maya opens every morning before she teaches.”

---

## SCENE 1 — Home · 40 sec

**[DO]** Stay on **Home**. Scroll slowly top → bottom.

**[SAY]**  
“She lands here first. KPIs for the month — visits, revenue, who’s at risk.”

**[DO]** Point at **visits chart**.

**[SAY]**  
“Bookings versus no-shows over the last thirty days.”

**[DO]** Scroll to **Today’s classes**. Pause on one **Under-booked** row and one with **+N wait**.

**[SAY]**  
“Today’s schedule with fill rates — she can see what’s empty and what’s waitlisted without opening Mindbody.”

**[DO]** Point at **Action items** (right column).

**[SAY]**  
“These aren’t charts — they’re today’s to-dos: who needs outreach, what’s under-booked, waitlists to clear.”

**[DO]** Scroll to **Live activity**.

**[SAY]**  
“Everything recent — bookings, signups, SMS replies — in one feed.”

**[DO]** Sidebar → **Schedule** (do **not** click a class row from Home).

---

## SCENE 2 — Schedule + SMS · 2 min 15 sec

**[DO]** On **Schedule**, find **today’s** date. Click `**SMS Waitlist Lab`** · 6:00 PM · Mia Russo.

**[SAY]**  
“I set up a class that’s completely full — six of six booked, nobody on the waitlist yet.”

**[DO]** Point at **Booked (6/6)** and **Waitlist (0)**.

---

### Step A — Waitlist someone else

**[DO]** Bottom **Add member** dropdown → pick **Jonah Reyes** (or any name) → book.

**[SAY]**  
“Class is full, so Tether doesn’t reject them — it puts them on the waitlist and sends the waitlist SMS automatically.”

**[DO]** Point at waitlist count → **1**.

*(Optional: pull up phone — Jonah’s text may not arrive on Twilio trial unless that number is verified; that’s fine.)*

---

### Step B — Waitlist yourself

**[DO]** Dropdown → **Maya Calderón** → book.

**[SAY]**  
“Same thing for the owner — or any member. Instant text: you’re on the waitlist, here’s a cancel link if plans change.”

**[DO]** Check your phone for the **waitlist joined** text. Hold it up briefly if you have it.

**[DO]** Point at waitlist → **2 people**. Try **Add to roster** — it’s disabled.

**[SAY]**  
“Promote is blocked while the class is still full — that’s intentional.”

---

### Step C — Open a spot

**[DO]** In **Booked**, click **Cancel** on any member → confirm in the dialog.

**[SAY]**  
“Someone cancels — now there’s room.”

**[DO]** Show **Booked (5/6)** or similar.

---

### Step D — Promote off waitlist

**[DO]** Waitlist section → **Add to roster** on **Jonah** (whoever you added first).

**[SAY]**  
“One click moves them into the class and sends the promotion text — you’re in, class name, time, cancel link.”

**[DO]** Show phone for **waitlist promoted** text if it arrived.

---

### Step E — Remove yourself from waitlist

**[DO]** On waitlist row **Maya Calderón** → **Cancel** → confirm.

**[SAY]**  
“And if I was on the waitlist and changed my mind — staff can pull me off from the roster. No promotion, just removed.”

**[DO]** Show waitlist back to **1** (or **0** if you promoted everyone).

**[SAY]**  
“So: full class, automatic waitlist texts, promote when a spot opens, cancel from the desk — all tied to the schedule.”

**[DO]** Sidebar → **Communications**.

---

## SCENE 3 — Communications · 40 sec

**[DO]** Point at top **SMS summary** banner.

**[SAY]**  
“Every outbound message is tracked — how many we sent, who rebooked, visits we recovered.”

**[DO]** Tab **Scheduled reminders** — glance at rules + example body.

**[SAY]**  
“Reminders run on a schedule — twenty-four hours, two hours — with cancel links in the SMS.”

**[DO]** Tab **Retention outreach** — point at **send queue**.

**[SAY]**  
“At-risk and lapsed clients queue up here for one-click outreach.”

**[DO]** Scroll to **Message log**. Find the rows you just created — **Waitlist joined** / **Waitlist promoted**.

**[SAY]**  
“And here’s the audit trail — full body, status, template — including the texts we just triggered on Schedule.”

**[DO]** Sidebar → **Clients & Retention**.

---

## SCENE 4 — Clients & Retention · 60 sec

**[DO]** Point at **Retention status** chips.

**[SAY]**  
“Retention isn’t a spreadsheet in— it’s live scoring on every member.”

**[DO]** Click **At-Risk** chip.

**[SAY]**  
“Filter to who’s slipping. Table is sorted by lifetime value so Maya calls the right people first.”

**[DO]** Click the **top name** in the at-risk table → drawer opens.

**[SAY]**  
“Full profile — visits, last check-in, attendance trend, message history.”

**[DO]** Click **Send outreach**.

**[SAY]**  
“Template picks itself based on their signal. She can edit every word before it goes out.”

**[DO]** Change one word in the body, then **close the modal** — do **not** send.

**[SAY]**  
“I’ll skip sending live so we don’t spam the room — but that’s one click to Twilio.”

**[DO]** Sidebar → **Class & Revenue** (Analytics).

---

## SCENE 5 — Analytics · 40 sec

**[DO]** Scroll to **schedule heatmap**.

**[SAY]**  
“Where are dead slots versus packed ones — so she knows what to market.”

**[DO]** **Instructor scorecard** — point at fill + return bars.

**[SAY]**  
“Which instructors fill rooms and bring people back.”

**[DO]** Change **class dropdown** — point at fill % and no-show %.

**[SAY]**  
“Drill into any class type.”

**[DO]** Quick scroll **channel quality** or revenue chart.

**[SAY]**  
“And which acquisition channels actually retain — not just which ad got clicks.”

**[DO]** Sidebar → **Home** (or stay on Clients at-risk table).

---

## CLOSE · 10 sec

**[SAY]**  
“One app: morning dashboard, native schedule with waitlist SMS, retention scoring and outreach, full comms log, and class analytics — built for a boutique studio like Tidewater.”

**[STOP]** Take questions.

---

## Timing card


| Scene             | Target    |
| ----------------- | --------- |
| Open + Home       | 0:45      |
| Schedule + SMS    | 2:15      |
| Communications    | 0:40      |
| Clients           | 1:00      |
| Analytics + Close | 0:50      |
| **Total**         | **~5:30** |


**Tight 4 min?** Cut Analytics to heatmap + one sentence; cut Home activity feed.

---

## Emergency lines (if something breaks)


| What happened               | Say this                                                        | Do this                               |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Blank home                  | “Let me refresh — data syncs from last night’s seed.”           | Reseed + hard refresh                 |
| Can’t find SMS Waitlist Lab | “It’s on today’s schedule.”                                     | Reseed; click today’s row             |
| Add to roster disabled      | “Class is still full — I need to cancel one booked spot first.” | Cancel in **Booked**                  |
| No text on phone            | “Trial Twilio only hits verified numbers — it still logs here.” | Show **Communications** log           |
| Outreach modal errors       | “I’ll show message history in the drawer instead.”              | Close modal; point at drawer messages |


---

## Q&A crib sheet

- **How is at-risk calculated?** Last booking 15–21 days ago. Lapsed is 22+. New members first 30 days. Re-scored every hour.  
- **Replace Mindbody?** No — layers on top. Import CSV or use native booking.  
- **SMS provider?** Twilio. Templates in settings. Cancel links on booking texts.  
- **Public booking?** `yoursite.com/book/tidewater-encinitas` — same data as the dashboard.

---

## After the demo

```bash
cd server && npm run seed:firebase -- CJKpE4LxDbS24OVIUIgD5SYpnyc2
```

Resets **SMS Waitlist Lab** to 6/6 booked, empty waitlist, so you can run the script again.