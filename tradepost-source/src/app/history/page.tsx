import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TradeList, tradeInclude } from "@/components/trade-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trade history" };

const PAGE = 50;

export default async function History({ searchParams }: { searchParams: Promise<{ game?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const games = await db.game.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } });
  const where: Prisma.TradeWhereInput = {
    status: "COMPLETED",
    ...(sp.game ? { item: { game: { slug: sp.game } } } : {}),
    ...(sp.q
      ? { OR: [
          { item: { name: { contains: sp.q, mode: "insensitive" } } },
          { buyer: { username: { contains: sp.q, mode: "insensitive" } } },
          { seller: { username: { contains: sp.q, mode: "insensitive" } } },
        ] }
      : {}),
  };
  const [trades, total] = await Promise.all([
    db.trade.findMany({ where, include: tradeInclude, orderBy: { completedAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE }),
    db.trade.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/history?${new URLSearchParams({ ...(sp.game ? { game: sp.game } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;

  return (
    <div>
      <p className="eyebrow">Public record</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Every completed trade</h1>
      <p className="text-ink-2 mt-2 text-sm"><span className="num">{total.toLocaleString("en-US")}</span> trades on record. Nothing is deleted.</p>

      <form className="flex flex-wrap gap-2 my-6">
        <select name="game" defaultValue={sp.game ?? ""} className="field w-auto">
          <option value="">All games</option>
          {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="Item or username" className="field w-64" />
        <button className="btn btn-ghost">Filter</button>
      </form>

      <TradeList trades={trades} showGame empty="No trades match." />

      {pages > 1 && (
        <div className="flex justify-between items-center mt-6 text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="btn btn-ghost btn-sm">← Newer</Link> : <span />}
          <span className="text-ink-3 num">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="btn btn-ghost btn-sm">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
