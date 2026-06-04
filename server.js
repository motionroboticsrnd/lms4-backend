import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes       from "./routes/auth.js";
import superadminRoutes from "./routes/superadmin.js";
import adminRoutes      from "./routes/admin.js";
import teacherRoutes    from "./routes/teacher.js";
import studentRoutes    from "./routes/student.js";
import contentRoutes      from "./routes/content.js";
import examRoutes          from "./routes/exams.js";
import certificateRoutes   from "./routes/certificates.js";
import experimentRoutes    from "./routes/experiments.js";
import uploadRoutes        from "./routes/upload.js";
import noticeRoutes        from "./routes/notices.js";
import prisma from "./lib/prisma.js";

dotenv.config();

// Mask password from DATABASE_URL for safe logging: postgres://user:***@host/db
function safeDbUrl() {
  const raw = process.env.DATABASE_URL || "";
  return raw.replace(/:([^:@]+)@/, ":***@");
}

async function connectWithRetry(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      // SELECT 1 proves a real round-trip; $connect() alone doesn't hit the DB.
      // With connection_limit=1 this uses (and immediately releases) the single slot.
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✓ Database connected  →  ${safeDbUrl()}`);
      return;
    } catch (err) {
      console.warn(`DB not ready (attempt ${i}/${retries}): ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Graceful shutdown — release connection pool on exit
process.on("beforeExit", () => prisma.$disconnect());
process.on("SIGINT",  () => prisma.$disconnect().then(() => process.exit(0)));
process.on("SIGTERM", () => prisma.$disconnect().then(() => process.exit(0)));

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map(url => url.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

/* Routes */
app.use("/api/auth",       authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/teacher",    teacherRoutes);
app.use("/api/student",    studentRoutes);
app.use("/api/content",      contentRoutes);
app.use("/api/exams",        examRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/experiments",  experimentRoutes);
app.use("/api/upload",       uploadRoutes);
app.use("/api/notices",      noticeRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok", ts: new Date() }));

/* Global error handler */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
connectWithRetry()
  .then(() => app.listen(PORT, () => console.log(`✓ Server on port ${PORT}`)))
  .catch(err => { console.error("Fatal: DB unreachable after retries:", err.message); process.exit(1); });
