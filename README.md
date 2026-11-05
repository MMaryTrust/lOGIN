# Mannin Suvai login

This app provides only an email/password login and a home page. The API uses Fastify, stores users and sessions in PostgreSQL, and hashes passwords with bcrypt. There is no public registration or demo login.

## Run locally

Requires Node.js 20+ and PostgreSQL.

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
3. Set `DATABASE_URL` to your PostgreSQL connection string. Set `DATABASE_SSL=true` when your database provider requires TLS.
4. Start the app: `npm start`
5. Open `http://localhost:3000`.

The server creates the `app_users` and `app_sessions` tables on startup.

## Create the first admin

Set a temporary `ADMIN_PASSWORD` in your local, git-ignored `.env` file. Use a password of 8 to 12 characters. Then run:

```powershell
npm run create-admin -- admin@sample.com "Mannin Admin"
```

The command stores only a bcrypt password hash and will not overwrite an existing account. Remove `ADMIN_PASSWORD` from `.env` after account creation. Do not commit `.env`; choose a unique password before using the account on a public deployment.

## Deployment notes

- Set `NODE_ENV=production` so the session cookie is Secure; serve the app over HTTPS.
- Set `APP_ORIGIN` to the exact public origin and `TRUST_PROXY=true` when behind a trusted reverse proxy.
- Keep `DATABASE_URL` and all passwords out of source control. The app uses a random, HttpOnly, SameSite=Strict cookie and stores only a hash of each session token in PostgreSQL.
