# How It Works — Motion Robotics LMS

This document explains the architecture, data flow, deployment steps, and what to do when something breaks.

---

## Architecture Overview

```
Browser (Vercel)
     │
     │  HTTPS  (VITE_API_URL)
     ▼
Express API  (Railway / Render)
     │
     │  Prisma ORM
     ▼
PostgreSQL  (Supabase)

     +── Cloudinary  (image / file uploads)
     +── Gmail SMTP  (OTP emails)
```

The frontend is a React SPA (single-page app). Every page load hits Vercel. All data calls go to the Express API. The API validates the JWT, runs the query through Prisma, and returns JSON.

---

## Authentication Flow

1. User enters email + password on `/login`, selects their role.
2. Frontend sends `POST /api/auth/login` with `{ email, password, role }`.
3. Backend finds the user in Postgres, compares the bcrypt hash, and returns a signed JWT + user object.
4. Frontend stores both in `localStorage` (`token`, `user`).
5. Every subsequent API call includes `Authorization: Bearer <token>` via the axios interceptor (`client/src/api/axios.js`).
6. The `protect` middleware on the backend (`server/middleware/auth.js`) verifies the token on every protected route.
7. On 401 response, the axios interceptor clears `localStorage` and redirects to `/login`.

**Route protection (frontend)**
- `ProtectedRoute` — redirects to `/login` if no valid token.
- `GuestRoute` — redirects logged-in users away from `/login` to their dashboard.
- Role mismatch → redirected to `/`.

---

## Database Schema (Prisma)

Key models and their relationships:

```
Institute
  └── User[]              (admin, teacher, student belong to an institute)
  └── Class[]
  └── StudentEnrollment[]
  └── Notice[]

User
  └── ClassTeacher[]      (many-to-many with Class via join table)
  └── StudentEnrollment[]
  └── ExamAttempt[]
  └── Certificate[]
  └── ExperimentSubmission[]
  └── Notice[]

Class
  └── ClassTeacher[]
  └── StudentEnrollment[]
  └── ClassExamUnlock[]
  └── ExperimentUnlock[]
  └── Notice[]

Exam
  └── ExamQuestion[]
  └── ClassExamUnlock[]   (admin unlocks exam for a class)
  └── ExamAttempt[]
  └── Certificate[]

Experiment
  └── ExperimentUnlock[]  (teacher unlocks experiment for a class)
  └── ExperimentSubmission[]

Content                   (standalone — not linked to classes)
Otp                       (short-lived email OTP codes)
```

---

## API Routes Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | public | Login, returns JWT |
| GET | /api/auth/me | any | Get current user |
| POST | /api/auth/change-password | any | Change own password |
| POST | /api/auth/otp/send | public | Send OTP to email |
| POST | /api/auth/otp/verify | public | Verify OTP |
| GET/POST/PUT/DELETE | /api/superadmin/* | superadmin | All platform management |
| GET/POST/PUT/DELETE | /api/admin/* | admin | Institute management |
| GET/POST/PUT/DELETE | /api/teacher/* | teacher | Class/content management |
| GET/POST/PUT/DELETE | /api/student/* | student | Learning & submissions |
| GET/POST/PUT/DELETE | /api/content/* | superadmin/admin/teacher | Content CRUD |
| GET/POST/PUT/DELETE | /api/exams/* | varies | Exam management |
| GET/POST/PUT/DELETE | /api/experiments/* | varies | Experiment management |
| GET/POST | /api/certificates/* | varies | Certificate management |
| GET/POST | /api/notices/* | varies | Notice management |
| POST | /api/upload | any | Cloudinary upload |

---

## Deployment — Step by Step

### Backend (Railway or Render)

**Railway:**
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `Code-Sumba/lms4-backend`
3. Railway auto-detects Node.js and uses `node server.js` as start command
4. Go to **Variables** tab and add every key from the table below
5. Go to **Settings → Domains** → generate a public URL (e.g. `https://lms4-api.up.railway.app`)

**Render:**
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect `Code-Sumba/lms4-backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables from the table below

### Backend Environment Variables

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true&connect_timeout=15&pool_timeout=30&connection_limit=1` | Supabase pooled (port 6543) |
| `DIRECT_URL` | `postgresql://...` (port 5432) | Supabase session mode — used by Prisma migrate |
| `JWT_SECRET` | any long random string | keep secret |
| `JWT_EXPIRES_IN` | `7d` | |
| `CLIENT_URL` | `https://lms4-frontend.vercel.app` | must match your Vercel URL exactly |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard | |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard | |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard | |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `465` | |
| `SMTP_USER` | your Gmail address | needs 2FA enabled |
| `SMTP_PASS` | Gmail App Password | from Google Account → Security → App passwords |
| `SMTP_FROM` | `"Motion Robotics LMS <you@gmail.com>"` | |

### Run Database Migration (once after first deploy)

Open a shell on your backend service (Railway: click **Shell** tab; Render: click **Shell**) and run:

```bash
npx prisma migrate deploy
node utils/seed.js
```

`prisma migrate deploy` creates all tables. `seed.js` creates the four demo users.

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project → Import `Code-Sumba/lms4-frontend`
2. Framework preset: **Vite**
3. Go to **Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL/api` |

4. Click **Redeploy** after saving the variable.

> Vercel auto-redeploys every time you push to the `main` branch of `lms4-frontend`.

---

## How Each Feature Works

### Content
- Superadmin uploads files (PDF, video URL, worksheet) tagged with a robotics level (1–6).
- Students and teachers see only content matching their enrolled class level.

### Experiments
- Superadmin creates experiments (steps, diagrams, components, video).
- Teacher unlocks an experiment for a class → students can then see and submit.
- Student submits their work (text notes). Teacher reviews and marks it.

### Exams
- Superadmin creates exam with MCQ questions, duration, pass marks.
- Admin unlocks the exam for a class → students can take it.
- Exam is timed. On submit, the backend auto-scores and stores the attempt.
- If the student passes, a Certificate record is created automatically.

### Certificates
- Auto-generated when a student passes an exam.
- Student can view and download from their dashboard.

### Notices
- Three scopes: `global` (superadmin only), `institute`, `class`.
- Each role sees notices relevant to their scope.

### OTP / Password Reset
- `POST /api/auth/otp/send` emails a 6-digit code (expires in 10 minutes).
- `POST /api/auth/otp/verify` validates the code.

---

## Troubleshooting

### Login fails with "Login failed"

**Check 1 — Is the backend reachable?**
Open your browser and visit `https://YOUR-BACKEND-URL/api/health`.
You should see: `{"status":"ok","ts":"..."}`.
If you get a browser error (can't connect), the backend is down or not deployed.

**Check 2 — CORS error in browser console?**
Open browser DevTools → Network tab → click the failed request → look at the response.
If you see `CORS policy` in the error, the `CLIENT_URL` env var on the backend does not match your Vercel URL. Fix it in Railway/Render dashboard and redeploy.

**Check 3 — VITE_API_URL is wrong**
If the network request in DevTools goes to `localhost:5000`, the frontend was built without `VITE_API_URL` set. Add it in Vercel → Settings → Environment Variables, then redeploy.

**Check 4 — Database tables don't exist**
If the backend logs say `relation "User" does not exist` or similar, run:
```bash
npx prisma migrate deploy
```
from the backend shell.

**Check 5 — No users in database**
If tables exist but login still fails, no accounts have been created. Run:
```bash
node utils/seed.js
```

---

### Backend crashes on startup

**Symptom:** Railway/Render shows the service restarting or failing health check.

**Check logs.** The most common causes:

| Log message | Fix |
|-------------|-----|
| `DATABASE_URL is not set` | Add `DATABASE_URL` in platform env vars |
| `DB not ready (attempt 5/5)` | Wrong `DATABASE_URL` or Supabase is paused — check Supabase dashboard |
| `Cannot find module 'prisma/client'` | Run `npm install` — Prisma client not generated |
| `PrismaClientInitializationError` | Run `npx prisma generate` then redeploy |

---

### "Network Error" or no response from API

1. Check the browser DevTools → Console for the exact URL being called.
2. Verify `VITE_API_URL` in Vercel env vars ends with `/api` (no trailing slash).
3. Check the backend is deployed and `/api/health` returns 200.
4. On Render free tier: the server sleeps after 15 minutes idle. First request after sleep takes ~30 seconds. Upgrade to a paid plan or use Railway to avoid this.

---

### File upload not working (Cloudinary)

1. Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set correctly in backend env vars.
2. Go to [cloudinary.com](https://cloudinary.com) → Dashboard → confirm the credentials match.
3. Check backend logs for `CloudinaryError` messages.

---

### Email / OTP not sending

1. `SMTP_PASS` must be a **Gmail App Password**, not your regular Gmail password.
   - Enable 2FA on your Google account first.
   - Go to: Google Account → Security → 2-Step Verification → App passwords → generate one.
2. Check `SMTP_USER` is the correct Gmail address.
3. Test by hitting `POST /api/auth/otp/send` with `{"email":"your@email.com"}` via Postman.

---

### Pushing code updates

```bash
# In the monorepo root (d:/lms4)

# 1. Make your changes, then commit
git add .
git commit -m "describe your change"

# 2. Push monorepo
git push origin main

# 3. Push backend (if you changed server/)
git push backend $(git subtree split --prefix=server HEAD):refs/heads/main --force

# 4. Push frontend (if you changed client/)
git push frontend $(git subtree split --prefix=client HEAD):refs/heads/main --force
```

Vercel auto-redeploys when `lms4-frontend` main branch updates.
Railway/Render auto-redeploys when `lms4-backend` main branch updates.

---

### Reset the database (wipe and re-seed)

```bash
# From the backend shell on Railway/Render, or locally with server/.env set:
node utils/seed.js
```

> Warning: `seed.js` deletes all users, classes, and enrollments before re-creating demo data.

---

## Environment Checklist Before Going Live

- [ ] `CLIENT_URL` on backend = exact Vercel URL (no trailing slash)
- [ ] `VITE_API_URL` on Vercel = exact backend URL + `/api` (no trailing slash)
- [ ] `JWT_SECRET` is a strong random string (not the default)
- [ ] `DATABASE_URL` uses the **pooled** Supabase URL (port 6543)
- [ ] `DIRECT_URL` uses the **session** Supabase URL (port 5432)
- [ ] Prisma migrations have been run (`npx prisma migrate deploy`)
- [ ] Database has been seeded or real users have been created
- [ ] Cloudinary credentials are correct
- [ ] Gmail App Password is set (not regular password)
