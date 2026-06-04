# Deployment Guide -- Motion Robotics LMS

## Stack

| Layer | Service |
|-------|---------|
| Frontend | Vercel |
| Backend | Railway (or Render) |
| Database | Supabase (PostgreSQL) |
| File Uploads | Cloudinary |
| Email / OTP | Gmail SMTP |

---

## Step 1 -- Supabase (Database)

1. Go to [supabase.com](https://supabase.com) -> New project
2. Once created, go to **Settings -> Database -> Connection string**
3. Copy two URLs:
   - **Transaction mode** (port 6543) -> this is your `DATABASE_URL`
   - **Session mode** (port 5432) -> this is your `DIRECT_URL`

---

## Step 2 -- Cloudinary (File Uploads)

1. Go to [cloudinary.com](https://cloudinary.com) -> free account
2. Dashboard shows **Cloud Name**, **API Key**, **API Secret**
3. Save these -- needed for backend env vars

---

## Step 3 -- Gmail App Password (Email / OTP)

1. Enable 2-Step Verification on your Google account
2. Go to: Google Account -> Security -> App passwords
3. Generate a password for "Mail"
4. Save the 16-character password as `SMTP_PASS`

---

## Step 4 -- Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app) -> New Project -> Deploy from GitHub
2. Select repo: `Code-Sumba/lms4-backend`
3. Railway auto-detects Node.js -- start command is `node server.js`
4. Go to **Variables** tab and add all keys from the table below
5. Go to **Settings -> Networking** -> Generate Domain
6. Copy the URL (e.g. `https://lms4-backend.up.railway.app`) -- needed for Step 6

### Backend Environment Variables

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true&connect_timeout=15&pool_timeout=30&connection_limit=1` |
| `DIRECT_URL` | `postgresql://USER:PASS@HOST:5432/postgres` |
| `JWT_SECRET` | any long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://lms4-frontend.vercel.app` (set after Step 5) |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `SMTP_FROM` | `Motion Robotics LMS <you@gmail.com>` |

---

## Step 5 -- Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) -> New Project -> Import `Code-Sumba/lms4-frontend`
2. Framework preset: **Vite** (auto-detected)
3. Go to **Settings -> Environment Variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL/api` |

4. Click **Redeploy**

---

## Step 6 -- Run Migrations + Seed (once)

Open the Shell tab on your Railway service and run:

```bash
npx prisma migrate deploy
node utils/seed.js
```

`prisma migrate deploy` creates all tables in Supabase.
`seed.js` creates the four demo accounts.

### Demo accounts created by seed

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@motionrobotics.in | super123 |
| School Admin | admin@motionrobotics.in | admin123 |
| Teacher | teacher@motionrobotics.in | teacher123 |
| Student | student@motionrobotics.in | student123 |

---

## Updating After Changes

```bash
# In the monorepo root
git add .
git commit -m "describe your change"
git push origin main

# Push to deployment repos
git push backend $(git subtree split --prefix=server HEAD):refs/heads/main --force
git push frontend $(git subtree split --prefix=client HEAD):refs/heads/main --force
```

Vercel and Railway auto-redeploy when their respective repos update.

---

## Local Development

```bash
# Terminal 1 -- Backend
cd server
# create .env with your Supabase + Cloudinary + SMTP values
npm run dev            # http://localhost:5000

# Terminal 2 -- Frontend
cd client
# create .env with VITE_API_URL=http://localhost:5000/api
npm run dev            # http://localhost:5173
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login failed on live site | Check `CLIENT_URL` on backend = exact Vercel URL; check `VITE_API_URL` on Vercel = backend URL + `/api` |
| Backend crashes on start | Check all env vars are set in Railway; check Supabase project is active |
| Tables don't exist | Run `npx prisma migrate deploy` from Railway shell |
| No users / can't login | Run `node utils/seed.js` from Railway shell |
| File upload fails | Verify Cloudinary credentials in backend env vars |
| OTP email not sent | Use Gmail App Password (not regular password); 2FA must be on |
| Render free tier slow | First request after 15 min idle takes ~30 s; upgrade plan or switch to Railway |

See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for detailed architecture and extended troubleshooting.
