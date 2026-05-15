# GuardTrack AI — Self-Host Guide

This guide walks you through running and deploying GuardTrack AI **outside of v0**, using your own Supabase project, your own Resend account, and Vercel for hosting.

Total time: ~20 minutes if you have accounts already.

---

## 1. What you need before you start

- A GitHub account
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Resend](https://resend.com) account (free tier is fine)
- A [Vercel](https://vercel.com) account (free Hobby plan is fine)
- Node.js 20+ and pnpm installed locally (only needed if you want to run it on your machine first)

---

## 2. Get the code

### Option A — Download from v0
In the v0 chat, click the three dots in the top right of the Block view → **Download ZIP** → unzip locally.

### Option B — Push to GitHub
In the v0 chat settings (top right gear icon), connect a GitHub repo. v0 will push everything for you. Then `git clone` it locally.

```bash
git clone https://github.com/YOUR_USER/guardtrack-ai.git
cd guardtrack-ai
pnpm install
```

---

## 3. Create your own Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Pick a name (e.g. `guardtrack`), a strong database password, and the region closest to your users
3. Wait ~2 minutes for the project to provision

### 3a. Run the database migrations

Open **SQL Editor** in your Supabase dashboard. Run each of the following files **in order**, copy-pasting the contents from the repo:

| Order | File in repo                                        | What it does                                                  |
| ----- | --------------------------------------------------- | ------------------------------------------------------------- |
| 1     | `scripts/001_create_schema.sql`                     | Creates `profiles`, `sites`, `guards`, `attendance` + RLS     |
| 2     | (Run inline, see below)                             | Adds `latitude`, `longitude`, `accuracy_m` to attendance      |

For the location columns, paste this into the SQL editor and run:

```sql
alter table public.attendance
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists accuracy_m double precision;
```

### 3b. Turn off email confirmation

This avoids the "email rate limit exceeded" error on free Supabase.

**Authentication → Providers → Email** → uncheck **Confirm email** → Save.

### 3c. Grab your Supabase credentials

**Project Settings → API**, copy:

- **Project URL** → this becomes `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → this becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key (keep secret!) → this becomes `SUPABASE_SERVICE_ROLE_KEY`

### 3d. Create your first admin

In the Supabase **SQL Editor**, run (replace email + password with yours):

```sql
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'you@example.com',
  crypt('YourStrongPassword123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin","full_name":"Your Name"}',
  now(), now(), '', '', '', ''
);
```

The signup trigger automatically creates the matching `profiles` row.

---

## 4. Set up Resend (email notifications)

1. Sign up at [resend.com](https://resend.com)
2. **API Keys → Create API Key** → copy the key. This becomes `RESEND_API_KEY`.
3. Pick a sender address:
   - **Quick test:** use `onboarding@resend.dev`. Resend will only deliver to the address that owns your Resend account.
   - **Production:** **Domains → Add Domain**, follow the DNS instructions to verify your domain, then use something like `alerts@yourdomain.com`.
4. Whatever you chose becomes `NOTIFY_FROM_EMAIL`.

---

## 5. Run it locally (optional but recommended)

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
NOTIFY_FROM_EMAIL=onboarding@resend.dev
```

Then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), log in with the admin you created in step 3d, and verify everything works.

---

## 6. Deploy to Vercel

### 6a. Push to GitHub
If you haven't already:

```bash
git init
git add .
git commit -m "GuardTrack AI initial deploy"
git remote add origin https://github.com/YOUR_USER/guardtrack-ai.git
git push -u origin main
```

### 6b. Import the repo on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → select your repo
3. Framework preset is auto-detected as **Next.js** — leave it
4. Don't deploy yet — first add environment variables

### 6c. Add environment variables

In the import screen, expand **Environment Variables** and add all of these:

| Key                              | Value                              |
| -------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | from Supabase Settings → API       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | from Supabase Settings → API       |
| `SUPABASE_SERVICE_ROLE_KEY`      | from Supabase Settings → API       |
| `RESEND_API_KEY`                 | from Resend → API Keys             |
| `NOTIFY_FROM_EMAIL`              | e.g. `onboarding@resend.dev`       |

Click **Deploy**. First build takes ~2 minutes.

### 6d. Update Supabase redirect URLs

Once Vercel gives you a production URL (like `https://guardtrack-ai.vercel.app`):

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://guardtrack-ai.vercel.app`
- **Redirect URLs (add):** `https://guardtrack-ai.vercel.app/auth/callback`

Save.

---

## 7. First-run setup inside the app

1. Open your Vercel URL → **Sign in** with the admin you created in step 3d
2. Go to **Admin → Sites** → add a site (this generates a QR token)
3. Click the **QR** button on a site → **Print poster** to print and stick it at the location
4. Have your guards sign up at `/auth/sign-up` (they always sign up as guards — admin sign-up from this page is locked by design)
5. Go to **Admin → Guards** → assign each guard to a site and set their base salary
6. Done. Guards can scan the printed poster with any phone camera and attendance is recorded with GPS

---

## 8. Production hardening checklist

Before rolling out to a real security agency, consider:

- [ ] **Verify a real domain in Resend** so notifications come from `alerts@yourdomain.com` instead of `onboarding@resend.dev`
- [ ] **Re-enable email confirmation** in Supabase once you upgrade past the free tier (or set up a custom SMTP provider in Supabase Auth → SMTP)
- [ ] **Add a custom domain** to your Vercel project (e.g. `guardtrack.yourdomain.com`)
- [ ] **Rotate the `service_role` key** in Supabase if it was ever shown on screen during setup
- [ ] **Enable point-in-time recovery / scheduled backups** in Supabase (paid plans)
- [ ] **Add GPS distance enforcement** — currently location is recorded but not validated against the site's coordinates. Add `lat`, `lng`, and `radius_m` columns to `sites` and reject scans outside the radius
- [ ] **Add shift time windows** to prevent off-hour scans
- [ ] **Rotating QR codes** — a printed QR can be photographed. For high-security sites, replace the printed poster with a small tablet that regenerates the QR every 30 seconds

---

## 9. Common issues

**"Email rate limit exceeded" on signup**
Email confirmation is on. Disable it in Supabase Auth → Providers → Email.

**"Invalid login credentials" right after signup**
Email confirmation is on and the user hasn't clicked the link. Either disable confirmation or click the link in the inbox.

**Admin notifications never arrive**
Check three things: (1) `RESEND_API_KEY` is set in Vercel env vars, (2) `NOTIFY_FROM_EMAIL` either is `onboarding@resend.dev` *and* you're checking the inbox of the email that owns the Resend account, OR you've verified your domain, (3) at least one user in `auth.users` has `raw_user_meta_data->>'role' = 'admin'`.

**Camera permission keeps prompting / scanner won't start**
HTTPS is required for `getUserMedia`. Vercel gives you HTTPS by default, but on `localhost` Chrome treats it as secure. Avoid testing on plain HTTP IPs like `192.168.1.x`.

**"Location not shared" on every scan**
The guard denied location permission, or the device has GPS off, or the page is being served over HTTP. Geolocation needs HTTPS. Tell the guard to allow location for the site URL.

---

## 10. What's where in the code

| Path                                  | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `app/auth/*`                          | Login, signup (guard-only public), callback, sign-out  |
| `app/guard/*`                         | Guard dashboard, QR scan, attendance, salary           |
| `app/admin/*`                         | Admin overview, sites, guards, attendance log, team    |
| `lib/supabase/{client,server,admin}.ts` | Supabase clients (browser, RSC, service-role)        |
| `lib/notifications.ts`                | Resend email helpers                                   |
| `lib/salary.ts`                       | Salary calculation logic (Base/26, EPF/ESI 25% each)   |
| `lib/geo.ts`                          | Browser geolocation helper                             |
| `scripts/001_create_schema.sql`       | Database schema + RLS + signup trigger                 |

---

That's it. You now own the entire stack — code on GitHub, database on Supabase, email on Resend, hosting on Vercel. No v0 dependency.
