# Mannin Suvai login

This app provides only an email/password login and a home page. It uses Fastify and bcrypt, with PostgreSQL for persistent users and sessions when `DATABASE_URL` is set.

## Quick local login test (no database required)

Requires Node.js 20+. In the project folder run:

```powershell
npm install
npm start
```

Open **http://localhost:3000** and sign in with:

- Email: `admin@sample.com`
- Password: `sample123`

This test login is in-memory and restricted to localhost; it is for checking the login page and home-page transition only. Users and sessions reset when the server restarts. Do not deploy test mode or use these credentials on a public server.

## Enable PostgreSQL

1. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
2. Set `DATABASE_URL` to your PostgreSQL connection string. Set `DATABASE_SSL=true` if your provider requires TLS.
3. Set an `ADMIN_PASSWORD` with 8–12 characters, then run `npm run create-admin -- admin@sample.com "Mannin Admin"`.
4. Start with `npm start`. The server creates the user and session tables automatically.
5. Remove `ADMIN_PASSWORD` from `.env` after creating the account.

## Deployment notes

- A `DATABASE_URL` is required in production. Startup refuses to use local demo mode when `NODE_ENV=production`.
- Set `NODE_ENV=production` so the session cookie is Secure; serve the app over HTTPS.
- Set `APP_ORIGIN` to the exact public origin and `TRUST_PROXY=true` when behind a trusted reverse proxy.
- Keep `DATABASE_URL` and all passwords out of source control. The app uses a random, HttpOnly, SameSite=Strict cookie and stores only a hash of each session token in PostgreSQL.
