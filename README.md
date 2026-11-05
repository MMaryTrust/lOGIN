# Mannin Suvai login

This small app contains only a sign-in screen and the home page shown after a successful sign-in. Authentication uses Supabase Auth; it does not create accounts or provide a demo bypass.

The email field uses browser email validation. Passwords are limited to 12 characters.

## Configure Supabase

1. Open `config.js`.
2. Set `SUPABASE_URL` to the Supabase project URL.
3. Set `SUPABASE_ANON_KEY` to the anon/public key from Project Settings → API.
4. Do not put a `service_role` key or database password in this client-side app.
5. In Supabase Auth, enable Email/Password sign-in and create or invite the accounts that should be able to sign in.

Until both values are configured, the sign-in form stays disabled and explains what is missing.

## Run locally

Serve this folder over HTTP rather than opening `index.html` directly. For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`. The Supabase JavaScript client is loaded from `esm.sh` when the app is configured, so the browser needs an internet connection.
