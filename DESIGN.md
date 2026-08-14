# RAAS Builders Website — Design & Support Guide

> Marketing + property‑listing website with an admin panel for
> **RAAS Builders & Developers** (Bengaluru & Shivamogga). Bilingual
> (English + Kannada). This document is the single reference for developers and
> support staff to understand the design, diagnose bugs, and operate the site.

---

## 1. At a glance

| Item | Value |
|---|---|
| Product | RAAS Builders public website + admin panel |
| Type | Static front‑end (vanilla HTML/CSS/JS) + serverless API |
| Repo | `github.com/atrivextech/raas-website` |
| Front‑end stack | Plain HTML5 + CSS + vanilla JS (no framework, no build step) |
| Hosting (front) | Static host / CDN (Vercel; `vercel.json` config) |
| API | Serverless functions with a **portable adapter** (Vercel *and* AWS Lambda) |
| Storage | Key‑value: DynamoDB (AWS) → Upstash Redis (Vercel) → in‑memory (dev) |
| Languages shown | English + Kannada (client‑side toggle) |

**Design philosophy:** zero‑build, dependency‑light front‑end (fast, easy to
edit) with a **platform‑neutral** serverless back‑end — the same route handlers
run on Vercel or AWS Lambda via a thin adapter.

---

## 2. Architecture overview

```
┌───────────── Browser (static front‑end) ─────────────┐
│  index.html         → public site (listings, about, contact, chat widget)
│  admin.html         → admin panel (login, add/remove properties, uploads)
│  privacy-policy.html, 404.html
│  css/style.css, css/admin.css
│  js/app.js          → public site logic (render listings, i18n, filters)
│  js/admin.js        → admin panel logic (auth, CRUD calls)
│  js/chat-widget.js  → floating chat/enquiry widget
└───────────────────────────┬───────────────────────────┘
                             │ fetch() JSON over HTTPS
                             ▼
┌──────────── Serverless API (api/*.js) ────────────────┐
│  Pure handlers:  handle({method,headers,url,body}) → {statusCode,headers,body}
│  Wrapped for each platform by api/_lib/adapter.js:
│     vercelWrap(handle)  → Vercel serverless
│     lambdaWrap(handle)  → AWS Lambda + API Gateway v2   (see aws/lambda.js)
│                                                                            │
│  Routes:  login, change-password, properties, materials, brochures,        │
│           contact, upload, settings, health                                │
│                                                                            │
│  Shared libs (api/_lib/):                                                   │
│    auth.js        → HMAC‑signed session cookie (12h), admin gate            │
│    store.js       → KV storage: DynamoDB | Upstash | in‑memory             │
│    blob.js        → file/image upload storage                              │
│    credentials.js → admin credential handling                              │
│    email.js       → contact/enquiry email delivery                         │
│    adapter.js     → Vercel ↔ Lambda request/response normalization         │
└────────────────────────────────────────────────────────────────────────────┘
        │ (AWS deploy)                         │ (Vercel deploy)
        ▼                                      ▼
   aws/template.yaml (SAM), aws/lambda.js,  vercel.json (headers, routing,
   aws/deploy.sh, DynamoDB                  cleanUrls), Upstash/KV
```

---

## 3. Front‑end structure

| File | Purpose |
|---|---|
| `index.html` | Public site: hero, property listings, services, about, contact. Loads `js/app.js`, `js/chat-widget.js`, `css/style.css`. |
| `admin.html` | Admin panel UI. Loads `js/admin.js`, `css/admin.css`. |
| `privacy-policy.html` | Privacy policy. |
| `404.html` | Not‑found page. |
| `js/app.js` | Renders listings (from `/api/properties` or `sample-properties.json`), filtering, English/Kannada toggle. |
| `js/admin.js` | Admin login, session handling, add/remove properties, uploads. **Legacy fallback credentials live here** (`admin` / `raas2025`) for the no‑backend demo mode — change/remove before production. |
| `js/chat-widget.js` | Floating enquiry/chat widget → posts to `/api/contact`. |
| `sample-properties.json` | Static fallback data when the API backend isn't configured. |
| `robots.txt`, `sitemap.xml`, `favicon.svg` | SEO / crawler assets. |
| `images/` | Brand assets (logos, favicon, covers) and property photos. |

No bundler — edit files directly; changes are live on next deploy. i18n is a
client‑side toggle (English/Kannada strings in the JS/HTML).

---

## 4. API routes (`api/*.js`)

Each is a pure `handle()` wrapped by `vercelWrap`. All JSON. CORS/OPTIONS
handled per route.

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | none | Liveness / backend‑configured check |
| `/api/login` | POST | — | Admin login → sets HMAC session cookie |
| `/api/change-password` | POST | admin | Change admin password |
| `/api/properties` | GET / POST / DELETE | GET public, POST/DELETE admin | Listing CRUD (KV key `raas_properties`) |
| `/api/materials` | GET / POST / DELETE | mixed | Construction‑materials content |
| `/api/brochures` | GET / POST / DELETE | mixed | Brochure/PDF listings |
| `/api/contact` | POST | none | Contact/enquiry form → email |
| `/api/upload` | POST | admin | Image/file upload → blob storage |
| `/api/settings` | GET / POST | mixed | Site settings |

**Two operating modes** (auto‑detected by `backendReady()` in `auth.js`):
- **Backend mode** — when `SESSION_SECRET` + `ADMIN_PASSWORD` are set. Full CRUD,
  server‑persisted data.
- **Fallback mode** — env not configured → APIs return `503 {fallback:true}` and
  the front‑end uses `sample-properties.json` / demo behavior.

---

## 5. Auth & data

### 5.1 Admin auth (`api/_lib/auth.js`)
- **HMAC‑signed session cookie** `raas_session`, 12‑hour TTL, zero external deps.
  Verified with `crypto.timingSafeEqual`.
- Env: `SESSION_SECRET` (32+ random chars), `ADMIN_PASSWORD`, optional
  `ADMIN_USERNAME` (default `admin`).
- `backendReady()` gates everything — no secret ⇒ fallback mode.
- **Password storage (`api/_lib/credentials.js`):** once the admin changes their
  password from the panel, a **scrypt** hash + random salt is stored in the KV
  store under `raas_admin_auth`, and `/api/login` verifies against it in constant
  time. `ADMIN_PASSWORD` is only the **bootstrap** password used until that first
  change — a stored credential always takes precedence.
- ⚠️ **`js/admin.js` still contains legacy client‑side creds (`admin`/`raas2025`)**
  at the top of the file, for the no‑backend static demo. This is *not* real
  security — real auth is server‑side. Remove/disable for any production
  deployment that has the backend configured.

### 5.2 Storage (`api/_lib/store.js`) — first match wins
1. **DynamoDB** — when `DYNAMODB_TABLE` set (AWS prod).
2. **Upstash Redis** — when `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` set (Vercel).
3. **In‑memory** — dev fallback (resets on cold start).
- Public API: `get(key)`, `set(key,val)`, `del(key)`. Values stored as JSON.
- **Every key in use** (the complete dataset — useful when inspecting or
  exporting the store): `raas_properties`, `raas_materials`, `raas_brochures`,
  `raas_enquiries`, `raas_site_settings`, `raas_admin_auth`.
  Each holds a single JSON array or object; there is no per-record key.

### 5.4 Admin panel tabs (`admin.html` / `js/admin.js`)
`properties` · `materials` · `brochures` · `enquiries` · `pricing` · `content` ·
`settings`. Each tab reads and writes the matching KV key through the API — so
"a change in the panel didn't stick" almost always means the KV backend is in
in-memory fallback mode (see runbook).

### 5.3 Email (`api/_lib/email.js`)
Contact/enquiry submissions are delivered by email (provider via env). Verify
the sender/recipient env vars are set in the hosting platform.

---

## 6. Configuration (environment variables)

| Var | Purpose | Where |
|---|---|---|
| `SESSION_SECRET` | HMAC session signing (required for backend mode) | host env |
| `ADMIN_PASSWORD` | Admin login password | host env |
| `ADMIN_USERNAME` | Admin username (optional, default `admin`) | host env |
| `DYNAMODB_TABLE` | Selects DynamoDB storage (AWS) | AWS env |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` (or `KV_REST_API_*`) | Selects Upstash (Vercel) | Vercel env |
| Email provider vars | Contact form delivery | host env |

Secrets inventory: `secrets.md` (gitignored). `vercel.json` sets security
headers (X‑Content‑Type‑Options, X‑Frame‑Options SAMEORIGIN, Referrer‑Policy,
Permissions‑Policy) and no‑cache on `/api/*`.

---

## 7. Deploy

**Vercel:** push to `main` → auto‑deploy. `vercel.json` controls clean URLs,
routing, headers. Set env vars in the Vercel dashboard. Storage = Upstash/KV.

**AWS:** `aws/template.yaml` (SAM) + `aws/lambda.js` (uses `lambdaWrap`) +
`aws/deploy.sh`. Storage = DynamoDB. Same route handlers, different wrapper.

Front‑end is static — no build step; deploying = uploading the files.

---

## 8. Support runbook — common issues & fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Admin login fails / "Backend not configured" | `SESSION_SECRET` or `ADMIN_PASSWORD` not set | Set env vars in host; redeploy |
| Listings show but changes don't persist | Fallback/in‑memory mode (no KV configured) | Configure DynamoDB (AWS) or Upstash (Vercel) |
| API returns `503 {fallback:true}` | `backendReady()` false | Same as above — set required env vars |
| Contact form silently fails | Email provider env not set | Configure email vars; check `/api/contact` logs |
| Uploaded images don't appear | Blob storage not configured | Check `api/_lib/blob.js` env / bucket |
| Anyone can log in with `admin/raas2025` | Legacy client‑side creds in `js/admin.js` | Remove them; rely on server `/api/login` |
| Data lost after a while | In‑memory store resets on cold start | Must use DynamoDB/Upstash for persistence |
| Session drops after 12h | By design (TTL) | Re‑login; adjust `TTL_SECONDS` in `auth.js` if needed |
| Wrong language strings | i18n toggle / HTML copy | Edit strings in `js/app.js` / HTML |
| CORS / caching oddities | `vercel.json` headers | Adjust headers block |

**Health check:** `GET /api/health`. **Support email:** support@atrivextech.com

---

## 9. Known TODOs / hardening
- Remove the legacy `admin/raas2025` client‑side credentials from `js/admin.js`
  (top of file) — the only remaining hard‑coded credential.
- Change the admin password from the panel at least once so login stops relying on
  the plaintext `ADMIN_PASSWORD` bootstrap and uses the scrypt hash instead.
- Ensure a persistent KV backend (DynamoDB/Upstash) is configured in production —
  never ship on the in‑memory fallback.
- Rotate `SESSION_SECRET` if it has ever been exposed.
