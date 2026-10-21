import { db } from "./db";

export const WEEK_MS = 7 * 86400_000;
// Admin deals don't expire; they stay up until staff take them down.
export const NO_EXPIRY = new Date("2100-01-01T00:00:00Z");

let lastRun = 0;

// Closes anything past its one-week limit and deletes week-old chat.
// Runs daily from the Vercel cron, and opportunistically on page loads.
export async function runCleanup() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS);

  // Lapsed specials go back to being normal posts with a fresh one-week window.
  const lapsed = await db.post.findMany({ where: { isSpecial: true, specialUntil: { lt: now } }, select: { id: true } });
  for (const p of lapsed) {
    await db.post.update({ where: { id: p.id }, data: { isSpecial: false, specialUntil: null, expiresAt: new Date(now.getTime() + WEEK_MS) } });
  }

  const expired = await db.post.findMany({ where: { status: "OPEN", isSpecial: false, expiresAt: { lt: now } }, select: { id: true } });
  if (expired.length) {
    const ids = expired.map((p) => p.id);
    await db.$transaction([
      db.post.updateMany({ where: { id: { in: ids } }, data: { status: "EXPIRED" } }),
      db.offer.updateMany({ where: { postId: { in: ids }, status: "PENDING" }, data: { status: "DECLINED", decidedAt: now } }),
    ]);
  }

  // A trade left open for a week is finalized if anyone confirmed it, otherwise closed.
  const stale = await db.trade.findMany({ where: { status: "ACTIVE", createdAt: { lt: weekAgo } } });
  for (const t of stale) {
    if (t.buyerConfirmedAt || t.sellerConfirmedAt) {
      await db.trade.update({ where: { id: t.id }, data: { status: "COMPLETED", completedAt: now } });
    } else {
      await db.$transaction(async (tx) => {
        await tx.trade.update({ where: { id: t.id }, data: { status: "CANCELLED" } });
        const post = await tx.post.findUniqueOrThrow({ where: { id: t.postId } });
        await tx.post.update({ where: { id: post.id }, data: { filled: Math.max(0, post.filled - t.quantity) } });
      });
    }
    await db.auditLog.create({ data: { action: "trade.autoclose", target: `trade:${t.id}` } });
  }

  const [pm, tm] = await Promise.all([
    db.postMessage.deleteMany({ where: { createdAt: { lt: weekAgo } } }),
    db.message.deleteMany({ where: { createdAt: { lt: weekAgo } } }),
  ]);
  lastRun = Date.now();
  return { lapsedSpecials: lapsed.length, expiredPosts: expired.length, closedTrades: stale.length, deletedMessages: pm.count + tm.count };
}

export async function maybeCleanup() {
  if (Date.now() - lastRun < 5 * 60_000) return;
  lastRun = Date.now();
  try {
    await runCleanup();
  } catch (e) {
    console.error("cleanup failed", e);
  }
}
