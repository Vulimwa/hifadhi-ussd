Hifadhi Link (USSD) — Setup Guide

Overview
- Node.js (Express) USSD backend for Africa’s Talking (AT) Sandbox.
- MongoDB models: Users, Incidents, Alerts, Contacts.
- English/Swahili localization; flows: Register, Report, Alerts, Tips, Contacts.
- Admin endpoints for seeding alerts/contacts and exporting incidents to CSV.

Quick Start (TL;DR)
- Install prerequisites (Node 18+, MongoDB).
- Copy env: `cp .env.sample .env` (Windows: `copy .env.sample .env`).
- Edit `.env` with your Mongo URI and AT sandbox values.
- Install deps: `npm install`.
- Seed: `npm run seed:alerts` and `npm run seed:contacts`.
- Run: `npm start` and open `http://localhost:3000/healthz`.
- Expose `/ussd` via ngrok and set the AT Sandbox callback URL to it.

Prerequisites
- Node.js 18 or newer. Check with `node -v`.
- NPM 9+ (bundled with Node 18). Check with `npm -v`.
- MongoDB: local instance or MongoDB Atlas connection string.
- Africa’s Talking Sandbox account (free) for USSD testing.
- Public tunnel (e.g., ngrok) to expose `http://localhost:3000/ussd`.

Project Structure
- `src/server.js` — Express app, middleware, routes mount.
- `src/services/db.js` — Mongo connection helper.
- `src/ussd/router.js` — USSD route and state machine.
- `src/ussd/i18n.js` — EN/SW copy and helpers.
- `src/models/*` — Mongoose models: User, Incident, Alert, Contact.
- `src/web/admin.js` — Admin seed and CSV export endpoints.
- `scripts/seedAlerts.js`, `scripts/seedContacts.js` — Seed helpers.
- `src/config/wards.js` — Ward list used in menus.

Environment Configuration
- Copy `.env.sample` to `.env` and set values:
  - `PORT` — Server port (default `3000`).
  - `MONGO_URI` — Mongo connection string (local or Atlas).
  - `AT_USERNAME` — AT sandbox username (usually `sandbox`).
  - `AT_API_KEY` — AT sandbox API key (used later for SMS integration).
  - `SHORT_CODE` — Your sandbox USSD short code (display only).
  - `ADMIN_TOKEN` — Token for admin endpoints (choose a strong value).
  - `AT_IP_WHITELIST` — Optional allowlist (comma-separated). Leave blank during local testing.
  - `DEFAULT_LANGUAGE` — `EN` or `SW` (default `EN`).

Install and Run Locally
- Install dependencies: `npm install`.
- Start MongoDB:
  - Local: ensure `mongod` is running; update `MONGO_URI` if needed.
  - Atlas: paste your connection string in `MONGO_URI`.
- Seed initial data:
  - Alerts per ward: `npm run seed:alerts`.
  - Contacts per ward: `npm run seed:contacts`.
- Start server: `npm start`.
- Health check: open `http://localhost:3000/healthz` (should return `{ ok: true }`).

Configure Africa’s Talking Sandbox
- Log in to Africa’s Talking → Sandbox.
- Create a USSD channel/service and note the short code (e.g., `*384*000#`).
- Expose your local server with ngrok:
  - `ngrok http 3000` → copy the HTTPS forwarding URL (e.g., `https://abcd.ngrok.io`).
- Set your USSD Callback URL to `https://<ngrok-host>/ussd` in the AT sandbox.
- Use the AT USSD simulator or dial (if supported) to test the flow.

Local Testing Without AT (curl/Postman)
- Endpoint expects `application/x-www-form-urlencoded` with fields: `sessionId`, `serviceCode`, `phoneNumber`, `text`.
- First screen (root menu):
  - `curl -X POST http://localhost:3000/ussd \`
  - `  -H "Content-Type: application/x-www-form-urlencoded" \`
  - `  --data "sessionId=abc123&serviceCode=*384*000#&phoneNumber=%2B254700000000&text="`
  - Response starts with `CON` and shows the main menu.
- Continue a flow by appending segments with `*` in `text`. Example: Registration
  - Step 1 (enter name after choosing `1`): `text=1*John Doe`
  - Step 2 (choose ward index, e.g., Sagalla=1): `text=1*John Doe*1`
  - Step 3 (village): `text=1*John Doe*1*Voi`
  - Step 4 (confirm Yes=1): `text=1*John Doe*1*Voi*1`
  - Final response starts with `END` and saves the user.
- Incident report example (Elephant, Now, Crop, Sagalla, village, skip note, submit):
  - `text=2*1*1*1*1*Voi*0*1`

USSD Flows (Summary)
- Root: `HIFADHI LINK` with menu 1–5 and `0` Language toggle.
- 1 Register: Name → Ward → Village → Confirm → END + save user.
- 2 Report Incident: Species → Urgency → Type → Ward? → Village (use/edit) → Note? → Confirm → END + incident saved.
- 3 Check Alerts: Ward? → Show risk/window/summary → 1 SMS | 0 Back.
- 4 Prevention Tips: Show bullets → 1 SMS → END.
- 5 Emergency Contacts: Ward? → Show KWS + Ward Admin → 1 SMS → END.
- 0 Language: Toggle EN ↔ SW; persisted to profile.

Admin Endpoints
- All admin endpoints require header: `x-admin-token: <ADMIN_TOKEN>`.
- Seed alerts (bulk upsert):
  - `POST /admin/alerts/seed` with JSON array, e.g.:
  - `[{"ward":"Sagalla","risk":"HIGH","window":"18:00–06:00","summaryEn":"High elephant movement tonight.","summarySw":"Harakati za ndovu usiku huu."}]`
- Seed contacts (bulk upsert):
  - `POST /admin/contacts/seed` with JSON array, e.g.:
  - `[{"ward":"Sagalla","kwsHotline":"+254726610098","wardAdmin":"+2547XXXXXXXX"}]`
- Export incidents CSV:
  - `GET /admin/export/incidents.csv` → downloads CSV with masked phone.

Wards & Content
- Change wards in `src/config/wards.js`.
- Update alerts via seed script or the admin seed endpoint.
- Edit EN/SW copy in `src/ussd/i18n.js`.

Data Models (MongoDB)
- `User`: phone (unique), name, ward, village, lang, registeredAt.
- `Incident`: caseId (UUID), phone, userRef, species, urgency, type, ward, village, note, status.
- `Alert`: ward (unique), risk, window, summaryEn, summarySw.
- `Contact`: ward (unique), kwsHotline, wardAdmin.

Security & Privacy
- Optional IP allowlist from AT (`AT_IP_WHITELIST`). Disable during local testing.
- Basic rate limiting via `express-rate-limit`.
- Input validation in flows (enums and lengths). Keep responses < 1 KB.
- Logs and CSV mask phone numbers.
- Do not commit `.env` or secrets.

Observability
- Health: `GET /healthz`.
- Logs: morgan `tiny`, plus JSON logs for SMS stubs.
- CSV export for demo/analysis: `/admin/export/incidents.csv`.

Troubleshooting
- Mongo connection error: verify `MONGO_URI` and that Mongo is reachable.
- 401 on admin endpoints: set header `x-admin-token` to your `ADMIN_TOKEN`.
- AT requests blocked: clear `AT_IP_WHITELIST` during local dev or add your ingress IPs.
- USSD timeouts: ensure each request returns within ~20s; keep screens short (< 140 chars).
- Ngrok mismatch: confirm AT callback uses the current ngrok HTTPS URL.
- Port in use: change `PORT` in `.env` and restart.

Optional: SMS Integration (Later)
- Currently SMS options log to console. To send real SMS via AT:
  - Install SDK (already in deps): `africastalking`.
  - Initialize in a service and call `sms.send` on the SMS branches.
  - Store minimal content; avoid PII in logs.

Acceptance Criteria (Demo)
- EN & SW flows function; language toggle persists.
- Register then report incident completes with caseId.
- Alerts reflect seeded ward bulletins.
- Contacts display and “SMS me” actions log (or send if integrated).
- CSV export includes all incidents with timestamps and ward.

Scripts & Commands
- Install deps: `npm install`
- Dev with autoreload: `npm run dev`
- Seed alerts: `npm run seed:alerts`
- Seed contacts: `npm run seed:contacts`
- Start server: `npm start`

