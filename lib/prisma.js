import { PrismaClient } from "@prisma/client";

// One client per process — no globalThis caching (this is Express/nodemon, not Next.js).
// The globalThis pattern keeps stale clients across nodemon restarts, making issues harder to debug.
const prisma = new PrismaClient({
  log: [{ level: "error", emit: "event" }],
});

// Print Prisma errors to stderr but don't crash the process.
prisma.$on("error", (e) => {
  console.error("prisma client error:", e.message);
});

export default prisma;

// ── Connection-reset detection ───────────────────────────────────

function isConnResetError(err) {
  if (!err) return false;
  const code = err.code;
  if (code === "P1017" || code === "P1001" || code === "P1002") return true;
  // Raw TCP reset: message contains "ConnectionReset" or "forcibly closed"
  const msg = err.message || "";
  return msg.includes("ConnectionReset") || msg.includes("forcibly closed") || msg.includes("10054");
}


export async function dbQuery(fn) {
  try {
    return await fn();
  } catch (err) {
    if (isConnResetError(err)) {
      try { await prisma.$connect(); } catch { /* ignore reconnect error; let the retry throw */ }
      return fn(); // single retry — if this throws, the caller gets the real error
    }
    throw err;
  }
}
