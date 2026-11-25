# UnityHome

React + TypeScript + Vite client, and Node.js + Express + MongoDB server.

This project reuses the last published real estate frontend and five original generated images. It does not contain the unfinished Cloudflare D1 migration. This folder is a separate local project; the existing hosted demo is unchanged.

## Start development

From the UnityHome folder:

```powershell
npm run dev
```

- Client: http://127.0.0.1:5174
- Server health: http://127.0.0.1:5050/api/health
- Database readiness: http://127.0.0.1:5050/api/ready

The client proxies `/api` to the Express server. Ports are different from the earlier demo to avoid replacing another local website.

Dependencies are installed separately in the root, client and server. This avoids Windows workspace symlink restrictions. If you need a clean install later:

```powershell
npm ci
npm --prefix client ci
npm --prefix server ci
```

## MongoDB configuration

`server/.env` is private and ignored by Git. A random session secret was generated locally; do not replace it with a public example or expose it in the client.

Set `MONGODB_URI` to the Atlas connection string with the intended database name `unityhome`. Use your database user, not the Atlas website login. Ensure Atlas network access allows the machine running this server. Do not share the URI or password in chat.

The server starts even without a database URI, so health checks can explain configuration status. Readiness stays HTTP 503 until MongoDB connects. Database operations are blocked while disconnected; they do not silently succeed in memory.

## First account

Open `/login`, select **Create account**, then **Agency owner**. The server creates an agency and owner account together. Buyer/tenant accounts are separate. Passwords are hashed; sessions use HTTP-only cookies. Registration and login are rate limited.

The server has Mongoose models for agencies, users, properties, leads, saved searches/favorites and automation event drafts. It provides APIs matching the migrated frontend for inquiries, visit confirmation, lead stages, follow-up notes, saved items, property management and brand settings. Operational reads/writes check the signed-in account and agency.

## Commands

```powershell
npm run dev:client
npm run dev:server
npm run build
npm test
npm start
```

`npm start` serves the API and the built client from Express. Development binds to loopback. For Vercel Services hosting, follow DEPLOYMENT.md. Database backup policy, password recovery/email verification, team invitation management and asset uploads remain separate operational/feature steps.

## Automation and assistant

Your three UnityHome WhatsApp templates remain independent of this setup. Leads with communication consent generate draft automation events. **No WhatsApp or email messages are sent by this project yet.** The n8n adapter, template approval check, scheduled dispatcher, retries and delivery callbacks still need integration.

The assistant currently answers from inventory. A server-only `ASSISTANT_WEBHOOK_URL` can be configured for an AI endpoint; no OpenAI key belongs in the client. The local `.env` defaults to `AUTOMATION_ENABLED=false`.

## Validation scope

`npm run build` checks TypeScript and creates the client build. `npm test` checks API availability, database readiness, unauthenticated access, CORS write protection and malformed requests without connecting to Atlas. Those checks do not prove that live MongoDB credentials or n8n delivery work; verify `/api/health` and `/api/ready` separately.

Atlas DNS troubleshooting: optional `DNS_SERVERS=1.1.1.1,8.8.8.8` in `server/.env` changes DNS resolution only for the UnityHome server process. Leave it empty where the system resolver works.

## Vercel deployment

The root `vercel.json` deploys the client and Express API as two services on one Vercel project and domain. See [DEPLOYMENT.md](DEPLOYMENT.md) for environment variables, Atlas access, push commands and post-deployment checks. This configuration has not itself deployed the website.
