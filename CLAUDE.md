# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What We're Building

A boutique fitness studio retention dashboard. Sits on top of existing booking systems and adds retention analytics, at-risk member tracking, and automated SMS communications. Studios keep their existing tools — we add the brain and the mouth on top.

Target user: Independent owner-operated boutique studios (yoga, pilates, HIIT, spin, strength) with 100-500 active monthly clients.

## Commands

```
npm run install:all   # Install all dependencies once after cloning
npm run dev           # Run both server and client
npm run dev:server    # Run server only
npm run dev:client    # Run client only
npm run lint --prefix client  # Lint React client
npm run build         # Build client for production
node server/seed.js   # Reseed database
```

No automated tests in this project.

## Environment Setup

Copy `server/.env.example` to `server/.env` before running. Requires MongoDB on port 27017 (default: `mongodb://127.0.0.1:27017/lumnus`).

Required variables in `server/.env` — `MONGODB_URI`, `PORT`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

## Architecture

MERN stack monorepo. Root `package.json` uses concurrently to run both workspaces. `server/` is the Express API, `client/` is React + Vite.

**Server** — ES modules, Express 5, Mongoose 8. Entry point is `server/index.js`. Each resource follows `routes/` → `controllers/` → `models/`. Business logic lives in `services/`. `errorHandler` middleware must be the last `app.use` call. New routes registered in `server/index.js`.

**Client** — React 19, no routing library. Page state is managed in `App.jsx` via a `PAGES` map (`dashboard`, `schedule`, `members`). API calls centralized in `client/src/api/client.js` which exports a single `apiRequest` wrapper. Resource-specific helpers in `api/members.js`, `api/classes.js`, `api/bookings.js`, `api/analytics.js` follow the same pattern. Base URL defaults to `/api` but can be overridden with `VITE_API_URL`.

**Proxy** — Vite proxies all `/api` requests to `localhost:5000` during development. Never hardcode `localhost:5000` in frontend code — always use relative `/api/...` paths.

## Current State vs. Planned

**Implemented:**
- Member CRUD (`/api/members`)
- Class CRUD (`/api/classes`)
- Booking CRUD with attendance tracking (`/api/bookings`)
- Analytics routes: `GET /api/analytics/dashboard`, `/api/analytics/retention`, `/api/analytics/classes`
- SMS routes: `POST /api/sms/reminder`, `POST /api/sms/outreach`
- Message model and `GET /api/messages`
- `server/services/retentionService.js` — `computeStatus()` computes new/regular/at-risk/lapsed from member and booking data
- `server/services/scoringJob.js` — bulk-writes retention status to all members on server startup and every hour via node-cron
- `server/services/twilioService.js` — thin Twilio SDK wrapper (`sendSMS(to, body)`)
- `server/services/messageService.js` — logs sent messages to the Message collection
- `server/config/businessConfig.js` — studio config, retention thresholds, and SMS templates
- Dashboard page — fetches at-risk members from `GET /api/analytics/dashboard`; computes trend and stats client-side from raw member/booking/class data
- Schedule page — weekly grid view filtered by category
- Members page — table with add/delete and search/filter

**Legacy scaffolding to remove:**
- `server/models/Item.js`, `server/controllers/itemController.js`, `server/routes/itemRoutes.js` — placeholder from initial setup, not part of the fitness domain

## Data Models

**Member** — `name`, `email`, `phone`, `joinDate`, `membershipType` (basic/premium/unlimited), `isActive`, `status` (new/regular/at-risk/lapsed), `notes`

**Class** — `name`, `instructor`, `dayOfWeek`, `time`, `durationMinutes`, `capacity`, `category` (yoga/pilates/hiit/spin/strength)

**Booking** — `memberId` (ref: Member), `classId` (ref: Class), `bookedAt`, `attended` (boolean), `reminderSent` (boolean)

**Message** — `memberId` (ref: Member), `type` (reminder/atRisk/winback/welcome), `templateUsed`, `body`, `sentAt`, `status` (sent/failed/delivered)

## Retention Scoring

Computed by `server/services/retentionService.js`. Thresholds configured in `businessConfig.js`.

- **New** — joined within last 30 days
- **Regular** — last booking within 14 days
- **At-Risk** — no booking in 14–21 days
- **Lapsed** — no booking in 21+ days

`scoringJob.js` runs this against all members on startup and every hour, bulk-writing the `status` field via `Member.bulkWrite`. The analytics dashboard controller re-computes status on-the-fly (without persisting) to derive the at-risk list returned to the client.

## SMS via Twilio

Outbound only via `server/services/twilioService.js`. Triggers: 24hr class reminder, at-risk outreach. Templates stored in `businessConfig.js` with merge tags (`{firstName}`, `{className}`, `{classTime}`). Every send is logged to the Message collection regardless of outcome.

Trial account hard limits: verified numbers only, "Sent from a Twilio trial account" prefix, 50 messages/day, 30-day expiry. Verify all demo phone numbers in Twilio console beforehand.

## Conventions

- ES modules throughout (`import`/`export`, never `require`)
- Async/await for all async operations, errors forwarded via `next(error)`
- Controllers separate from routes; services handle all business logic
- All API routes prefixed with `/api`
- Errors handled in middleware, not inline
- React components in PascalCase, kept small and focused
