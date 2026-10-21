import { Prisma, Side } from "@prisma/client";
import { db } from "./db";

export const postInclude = {
  user: true,
  item: true,
  currency: true,
  game: true,
} satisfies Prisma.PostInclude;

export type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export function openWhere(): Prisma.PostWhereInput {
  return { status: "OPEN", expiresAt: { gt: new Date() } };
}

export function activeSpecialWhere(): Prisma.PostWhereInput {
  return {
    ...openWhere(),
    isSpecial: true,
    OR: [{ specialUntil: null }, { specialUntil: { gt: new Date() } }],
  };
}

export type SortKey = "new" | "price_asc" | "price_desc";

export async function boardPosts(opts: { gameId: string; side: Side; itemId?: string; sort: SortKey }) {
  const base: Prisma.PostWhereInput = { gameId: opts.gameId, side: opts.side, ...(opts.itemId ? { itemId: opts.itemId } : {}) };
  const orderBy: Prisma.PostOrderByWithRelationInput =
    opts.sort === "price_asc" ? { unitPrice: "asc" } : opts.sort === "price_desc" ? { unitPrice: "desc" } : { createdAt: "desc" };

  const [specials, regular] = await Promise.all([
    db.post.findMany({ where: { ...base, ...activeSpecialWhere() }, include: postInclude, orderBy: { createdAt: "desc" }, take: 3 }),
    db.post.findMany({ where: { ...base, ...openWhere() }, include: postInclude, orderBy, take: 100 }),
  ]);
  const specialIds = new Set(specials.map((p) => p.id));
  return { specials, regular: regular.filter((p) => !specialIds.has(p.id)) };
}

export async function reputation(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { stars: number | null; trades: number }>();
  const [ratings, buys, sells] = await Promise.all([
    db.rating.groupBy({ by: ["toId"], where: { toId: { in: userIds } }, _avg: { stars: true }, _count: true }),
    db.trade.groupBy({ by: ["buyerId"], where: { buyerId: { in: userIds }, status: "COMPLETED" }, _count: true }),
    db.trade.groupBy({ by: ["sellerId"], where: { sellerId: { in: userIds }, status: "COMPLETED" }, _count: true }),
  ]);
  const out = new Map<string, { stars: number | null; trades: number }>();
  for (const id of userIds) out.set(id, { stars: null, trades: 0 });
  for (const r of ratings) out.get(r.toId)!.stars = r._avg.stars;
  for (const b of buys) out.get(b.buyerId)!.trades += b._count;
  for (const s of sells) out.get(s.sellerId)!.trades += s._count;
  return out;
}

export async function priceStats(itemId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const trades = await db.trade.findMany({
    where: { itemId, status: "COMPLETED", completedAt: { gte: since } },
    select: { unitPrice: true, quantity: true, completedAt: true },
    orderBy: { completedAt: "asc" },
  });
  if (trades.length === 0) return null;
  const prices = trades.map((t) => t.unitPrice);
  const volume = trades.reduce((a, t) => a + t.quantity, 0);
  const weighted = Math.round(trades.reduce((a, t) => a + t.unitPrice * t.quantity, 0) / volume);
  return {
    avg: weighted,
    low: Math.min(...prices),
    high: Math.max(...prices),
    last: prices[prices.length - 1],
    volume,
    count: trades.length,
    points: trades.map((t) => ({ t: t.completedAt!.getTime(), p: t.unitPrice })),
  };
}
