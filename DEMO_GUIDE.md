# Tether Demo Guide — Tidewater Yoga + Surf

**Account:** Firebase UID `CJKpE4LxDbS24OVIUIgD5SYpnyc2`  
**Studio:** Tidewater Yoga + Surf · Maya Calderón · Encinitas  
**Length:** ~4 minutes (stretch to 5 with Analytics)  
**Style:** Functionality speed run — no problem setup, show what works

---

## Before you start (10 minutes earlier)

### 1. Reseed demo data

```bash
cd server
npm run seed:firebase -- CJKpE4LxDbS24OVIUIgD5SYpnyc2
```

You should see roughly: **15 classes · 155 members · ~1,380 bookings · 40 messages · 10 at-risk**.

### 2. Start the app

```bash
# From project root
npm run dev
```

- Client: http://localhost:5173  
- API: http://localhost:5000  

### 3. Log in once

- Open the app and sign in with the Firebase account tied to `CJKpE4LxDbS24OVIUIgD5SYpnyc2`.
- Confirm the home page says **“Good morning, Maya”** and **Tidewater Yoga + Surf**.
- Leave the tab open — do not show the login screen on stage.

### 4. Browser setup

- Zoom **110–125%**
- Full screen or clean window (no bookmarks bar)
- Optional: pre-open tabs in order — **Home → Schedule → Clients → Communications → Analytics**

### 5. Twilio for SMS demo

- Put your **Twilio-verified phone** on Maya in `server/data/demoTenantConfig.js` → `ownerMember.phone` (default `+17187758267`).
- Reseed after changing the number.

### 6. Hard rules during the demo

| Do | Don’t |
|----|--------|
| **SMS Waitlist Lab** flow below (waitlist + promote + cancel) | **Remind** on roster (unless you intend to) |
| Promote waitlist, add booking, cancel waitlist | **Send** on at-risk outreach (unless you want a second SMS beat) |
| Open Outreach modal, edit text, then **Cancel** | CSV import, save settings, or logout |
| Scroll Communications message log after SMS steps | Public cancel link unless you tested it |

---

## Demo map (~5 minutes with SMS)

```
Home (40s) → Schedule + SMS Waitlist Lab (2m) → Communications (40s) → Clients (60s) → Analytics (40s) → Done
```

---

## Step 1 — Home · 45 seconds

**Nav:** Sidebar → **Home** (or `/`)

### What to show (top → bottom, don’t linger)

1. **Header** — “Good morning, Maya” + Tidewater subtitle  
2. **KPI strip** — point at **2** metrics only, e.g. visits trend + at-risk count (hover **?** tooltips if someone asks)  
3. **Visits chart** — “Last 30 days: bookings vs no-shows”  
4. **Today’s classes** — scroll the list:
   - One row with **Under-booked** badge (amber)
   - One row with **+N wait** (waitlist)
   - Fill bars on the right  
5. **Action items** (right column) — “These are today’s priorities, not another dashboard”  
6. **Live activity** — bookings, signups, SMS replies in the last few hours  

### Click

- Click any **under-booked** class row → jumps to **Schedule** with that class selected.

### One-liner

> “Morning command center — KPIs, today’s fill rates, prioritized action items, and live activity.”

---

## Step 2 — Schedule + SMS waitlist · ~2 minutes

**Nav:** Sidebar → **Schedule**

### Find the demo class

On **today’s** row, click **`SMS Waitlist Lab`** (6:00 PM · Mia Russo).

You should see:

- **Booked (6/6)** — full roster  
- **Waitlist (0)** — empty  

Maya Calderón is **not** on the roster yet (she’s you for the demo).

---

### SMS demo script (do in this order)

| Step | Action | SMS |
|------|--------|-----|
| **A** | Bottom dropdown: pick any member (e.g. **Jonah Reyes**) → book | **Waitlist joined** text to their number (may fail on trial if unverified — still logs in Communications) |
| **B** | Dropdown: **Maya Calderón** → book | **Waitlist joined** to **your** verified phone |
| **C** | Waitlist shows 2 people; **Add to roster** is disabled (class still full) | |
| **D** | In **Booked**, click **Cancel** on any member → confirm | Opens one spot |
| **E** | Waitlist → **Add to roster** on Jonah (or whoever you added first) | **Waitlist promoted** SMS |
| **F** | Waitlist → **Cancel** on **Maya Calderón** | Removes you from waitlist (no promote SMS) |

### Then show Communications (Step 4 below)

Open **Communications → Message log** — new rows for `Waitlist joined` and `Waitlist promoted` with full body + cancel link.

### One-liners

- After B: “Class is full — booking puts them on the waitlist and texts them immediately.”  
- After E: “When a spot opens, one click promotes them and sends the confirmation SMS.”  
- After F: “They can also leave the waitlist from the roster.”

### Avoid

- **Remind** on booked members (different template; optional extra)  
- Promoting while still **6/6 booked** — button stays disabled until step D

---

## Step 3 — Clients & Retention · 75 seconds

**Nav:** Sidebar → **Clients & Retention**

### What to show

1. **Retention status** — five chips with counts; click **At-Risk** to filter  
2. **At-risk table** (top section):
   - Sorted by **LTV**  
   - **Why at risk** column  
   - **Suggested template**  
3. Click the **first client name** (highest LTV) → **drawer** opens:
   - LTV, 90-day visits, last visit  
   - Attendance bars (12 months)  
   - Recent messages  
4. Click **Send outreach** (drawer or table):
   - Template dropdown  
   - Body with `{firstName}` filled in  
   - Edit a word if you want  
5. **Close the modal** — do not send  

### Optional (if time)

- **Client directory** — type in search, filter **Channel** (Instagram, Referral, etc.)  
- Collapse **Cohort retention** only if you have 30 seconds extra  

### One-liner

> “Scoring tells you who’s slipping and why; outreach is one click with an editable template.”

---

## Step 4 — Communications · 45 seconds

**Nav:** Sidebar → **Communications**

### What to show

1. **SMS summary banner** (top) — sent → rebooked → visits recovered  
2. Tab **Scheduled reminders**:
   - Active rules (24h, 2h, at-risk triggers)  
   - Example reminder body with cancel link  
3. Tab **Retention outreach**:
   - Send queue (at-risk / lapsed clients)  
4. Scroll to **Message log**:
   - Expand or read one row — full SMS body + status  

### Do not

- Edit and save templates (unless you intend to)  
- Send from the queue  

### One-liner

> “Every message is logged; reminders are automated; we track whether outreach drives rebookings.”

---

## Step 5 — Analytics · 45 seconds

**Nav:** Sidebar → **Class & Revenue**

### What to show (scroll, don’t read every number)

1. **Schedule heatmap** — which day/time slots fill vs sit empty  
2. **Instructor scorecard** — fill rate + return rate bars  
3. **Class performance** — change the **class dropdown** → fill %, no-show %, trend  
4. **Channel quality** or **Revenue mix** — one sentence: “which channels bring clients who stick”  
5. If you linked from Communications: **SMS conversion** section (`#sms-conversion`)

### One-liner

> “Class and revenue intelligence — not just a retention list.”

---

## Close · 10 seconds

Back to **Home** or leave on **Clients → At-risk table**.

> “Dashboard, schedule, retention outreach, communications, and analytics — one app for a boutique studio owner.”

---

## 5-minute version (add one beat)

After Analytics, open **Settings** → scroll to **Public booking link** (`/book/tidewater-encinitas`). Say:

> “Members book here; the same system powers reminders and cancel links.”

Do not run CSV import on stage.

---

## Cheat sheet — UI labels

| You say | On screen |
|---------|-----------|
| At-risk | Status chip / filter |
| LTV | Dollar column in clients table |
| Under-booked | Amber badge on Home class row |
| Waitlist | “+N wait” on class row; waitlist section on Schedule |
| SMS Waitlist Lab | Today’s fully booked class for live texting demo |
| Live activity | Home → bottom card |
| Send queue | Communications → Retention outreach tab |

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| Empty home / zeros | Re-run seed command above; hard refresh |
| “Good morning” wrong name | Reseed — settings use Maya Calderón |
| No classes today | Reseed on a day that matches seed (Mon–Sun all have weekly classes; today also gets **Midday Express**) |
| No waitlist visible | Click through today’s classes on Schedule until you see waitlist section |
| Outreach modal error | Skip send; show **recent messages** in client drawer |
| API errors | Check `npm run dev` and MongoDB running |

---

## Q&A — short answers

**How is status calculated?**  
Last booking: regular ≤14 days, at-risk 15–21, lapsed 22+. New if joined ≤30 days. Re-scored every hour.

**Does it replace Mindbody?**  
No — layers on top. CSV import + native schedule; retention brain + SMS.

**Are SMS real?**  
Yes via Twilio in production; don’t fire Send/Remind in the demo unless numbers are verified.

**Public booking URL?**  
`http://localhost:5173/book/tidewater-encinitas` (or your deployed domain + same path).

---

## Re-seed right before presenting

```bash
cd server && npm run seed:firebase -- CJKpE4LxDbS24OVIUIgD5SYpnyc2
```

Then refresh the browser while logged in as that Firebase user.
