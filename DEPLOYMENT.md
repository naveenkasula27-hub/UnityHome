# Deploy UnityHome on Vercel

This repository uses Vercel Services (Beta) for one project and one domain.
The Vite client handles the website, and Express handles `/api` and `/api/*`.
MongoDB remains hosted on Atlas. The n8n engine remains a separate integration.

## 1. Push the prepared changes

Run in the UnityHome folder:

```powershell
git add .
git diff --cached --stat
git commit -m "Prepare client and server for Vercel Services"
git push
```

Confirm that no private `.env` file is staged. `.env.example` is a public placeholder file.

## 2. Import the whole repository

- Import `naveenkasula27-hub/UnityHome` from GitHub.
- Keep Root Directory `./` and Application Preset **Services**.
- Keep both client and server in the same project.
- The root `vercel.json` owns the install, build and route settings. Do not import only one service.
- Use Node.js 24.x for this project.

Each service installs with `npm ci` from its own committed lockfile.
The client builds with `npm run build` into `dist`.
The server entry is `server/index.js`; it exports Express without a local port listener.

## 3. Add environment variables

Enter values privately in Vercel, with Production and Preview selected if both should use this database:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string, with the database user's credentials |
| `MONGODB_DB_NAME` | `unityhome` |
| `JWT_SECRET` | A private random secret of at least 32 characters; the local value can be used for this demo |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | Your actual final website origin, such as `https://your-assigned-domain.vercel.app` (no trailing slash) |
| `AUTOMATION_ENABLED` | `false` |

No secrets belong in `VITE_` variables. Leave `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, and `ASSISTANT_WEBHOOK_URL` unset until integration is ready.
Leave `DNS_SERVERS` unset on Vercel unless the hosting logs establish a DNS problem; the local resolver override is not needed by default in hosting.
Do not copy the local `PORT` setting to Vercel.

The API also permits the exact deployment and project production origins supplied by Vercel's system variables (`VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`). It does not permit arbitrary `*.vercel.app` origins.
Set `CLIENT_ORIGIN` to a custom domain when one is added. Changing environment variables requires a new deployment.

## 4. Allow Atlas connectivity

In Atlas, confirm that the database user has read/write access to `unityhome` and that Network Access permits the hosting environment's outbound connections. The laptop's IP entry alone will not cover Vercel. Choose a network rule appropriate to the hosting plan; static egress requires the corresponding hosting feature. Do not remove database authentication.

## 5. Deploy and verify

After the push and environment configuration, deploy the project. On the assigned domain:

1. `/` should load the site and its images/styles.
2. `/api/health` should return the UnityHome API response.
3. `/api/ready` should return HTTP 200 and `{"ready":true}`. A 503 means the database is not ready; check Vercel runtime logs, Atlas access and the private environment values.
4. Sign up as an agency owner, sign out and sign in again. Check that the session persists after refresh.
5. Create/update a property and submit an inquiry. Verify it appears only in the correct agency dashboard.
6. Refresh `/login`, `/account`, a property page and `/dashboard` directly. The client routing fallback should load the application.
7. Test from a mobile browser, then repeat login and inquiry submission.

No deployment has been verified merely by passing the local build. Record the actual deployment URL and the results of these checks after deploying.

## Runtime behavior and remaining integration

The API waits for MongoDB on data requests, shares simultaneous cold-start connection attempts and reuses warm connections. A failed attempt can be retried by a later request. Health remains available independently of database connectivity.

Session cookies are HTTP-only and Secure in production, with SameSite=Lax. The frontend and API share an origin. Express trusts one hosting proxy hop for request IP handling; the in-memory rate limiter is per instance, not a distributed abuse-control service.

The server does not run a persistent scheduler. Follow-up timing, WhatsApp/email sending, delivery receipts and retries still need the existing n8n engine integration. Keep automation disabled until that flow is tested. Password recovery, email verification, team invitation flow and property image uploads remain separate product work.

References: https://vercel.com/kb/guide/vercel-services and https://vercel.com/docs/frameworks/backend/express

## Preparation checks — 25 November 2026

- Client TypeScript check and production build passed.
- All 11 automated server tests passed, including connection caching/recovery, request initialization, authentication boundaries, exact production/preview origins and secure production cookie options.
- Root deployment configuration passed the current Vercel JSON schema with zero validation errors.
- Git whitespace checks passed; the private server `.env` remains untracked and ignored.
- The live server-entry smoke check stopped at `/api/ready` with HTTP 503 because Atlas connectivity timed out. DNS resolution succeeded in a separate diagnostic. No temporary accounts, properties or inquiries were created: registration was after the readiness assertion. Database authentication and the full workflow therefore remain unverified in this run.
- These checks prepare the source for review; they do not establish a successful Vercel build or live deployment. Changes have not been pushed or deployed by this preparation task.

The longer direct Atlas diagnostic resolved the hosts but failed TLS negotiation on all three nodes with `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`. The cause is not yet established; review Atlas network access, cluster availability and any local network interception. TLS verification has not been disabled. Recheck `/api/ready` from Vercel after configuring hosting access.

## First live deployment routing correction

The live deployment returned 404 for `/`, while `/index.html`, `/login`, `/dashboard`, CSS and the logo returned 200. An explicit top-level `/` route now selects the client service’s `/index.html`; all other service routes remain unchanged. This correction needs to be pushed and deployed before live verification. The API health endpoint returned 200, but database readiness returned 503, so Atlas connectivity remains pending.
