# Motion Robotics LMS

A full-stack Learning Management System built for robotics education. Supports four roles — Super Admin, School Admin, Teacher, and Student — each with their own dashboard, permissions, and features.

**Live URLs**
- Frontend: https://lms4-frontend.vercel.app
- Backend API: set via `VITE_API_URL` on Vercel

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (Bearer token, localStorage) |
| File Uploads | Cloudinary |
| Email / OTP | Gmail SMTP (nodemailer) |
| Frontend Host | Vercel |
| Backend Host | Railway or Render |

---

## Roles & What They Can Do

### Super Admin
- Manage all **Institutes** (create, edit, set active levels and expiry)
- Manage all **Users** across institutes (bulk CSV import supported)
- Upload **Content** (books, videos, worksheets) per robotics level
- Create **Experiments** with steps, diagrams, and components
- Create and manage **Exams** (MCQ, timed, per robotics level)
- View all **Certificates** issued across the platform
- Post **Notices** (global or per institute)
- View platform-wide **Reports**
- Platform **Settings**

### School Admin
- Manage **Classes** (create, assign robotics level)
- Manage **Teachers** and **Students** for their institute
- Browse **Courses** (content available to their levels)
- Manage **Exams** (unlock exams for classes)
- Post **Notices** for their institute
- View institute **Reports**

### Teacher
- View **Classes** they are assigned to
- Browse **Content** for their robotics levels
- Guide **Experiments** — unlock for classes, review student submissions
- View **Exam** attempts and results for their classes
- Post **Notices** to their classes
- View class **Reports**

### Student
- View enrolled **Classes**
- Access **Content** (books, videos, worksheets) for their level
- Complete **Experiments** and submit work
- Take **Exams** (timed MCQ, auto-scored)
- View **Results** and download **Certificates** on passing
- Read **Notices**
- Manage **Settings** (profile, change password)

---

## Project Structure

```
lms4/
├── client/                    # React frontend (Vercel)
│   ├── src/
│   │   ├── api/axios.js       # axios instance with JWT interceptor
│   │   ├── components/        # shared UI components
│   │   ├── hooks/useAuth.jsx  # ProtectedRoute & GuestRoute
│   │   ├── pages/
│   │   │   ├── auth/          # LoginPage
│   │   │   ├── landing/
│   │   │   ├── superadmin/
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   └── student/
│   │   └── store/authStore.js # Zustand auth store
│   └── .env                   # VITE_API_URL (not committed)
│
└── server/                    # Express backend (Railway / Render)
    ├── controllers/           # business logic per feature
    ├── routes/                # Express routers
    ├── middleware/auth.js     # JWT protect middleware
    ├── lib/prisma.js          # Prisma client singleton
    ├── prisma/schema.prisma   # full database schema
    ├── utils/
    │   ├── seed.js            # seed demo accounts
    │   └── mailer.js          # nodemailer helper
    └── .env                   # secrets (not committed)
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase free tier works)

### 1 — Clone and install

```bash
git clone https://github.com/Code-Sumba/lms4.git
cd lms4

cd server && npm install
cd ../client && npm install
```

### 2 — Create server/.env

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true&connect_timeout=15
DIRECT_URL=postgresql://USER:PASS@HOST:5432/postgres
JWT_SECRET=any-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="Motion Robotics LMS <your@gmail.com>"
```

### 3 — Run migrations and seed

```bash
cd server
npx prisma migrate deploy    # creates all database tables
node utils/seed.js           # creates the 4 demo accounts
```

### 4 — Start both servers

```bash
# Terminal 1
cd server && npm run dev      # runs on http://localhost:5000

# Terminal 2
cd client && npm run dev      # runs on http://localhost:5173
```

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@motionrobotics.in | super123 |
| School Admin | admin@motionrobotics.in | admin123 |
| Teacher | teacher@motionrobotics.in | teacher123 |
| Student | student@motionrobotics.in | student123 |

---

## Deployment

See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for full deployment walkthrough, environment variable reference, and troubleshooting guide.

---

## Pushing to Separate Repos

This monorepo is split into two deployment repos using `git subtree`:

```bash
# Backend only
git push backend $(git subtree split --prefix=server HEAD):refs/heads/main --force

# Frontend only
git push frontend $(git subtree split --prefix=client HEAD):refs/heads/main --force
```

| Remote | URL |
|--------|-----|
| `origin` | https://github.com/Code-Sumba/lms4 (monorepo) |
| `backend` | https://github.com/Code-Sumba/lms4-backend |
| `frontend` | https://github.com/Code-Sumba/lms4-frontend |
