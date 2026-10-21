import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { activeSpecialWhere, openWhere, postInclude, reputation, savedIdsFor } from "@/lib/queries";
import { maybeCleanup } from "@/lib/cleanup";
import { DealsCarousel, PostGrid } from "@/components/post-card";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { ItemArt } from "@/components/item-art";

export const dynamic = "force-dynamic";

const GAME_COLORS = ["#ff5a36", "#1b8bd6", "#7b5cff", "#0f9d6a", "#e8458b"];

export default async function Home() {
  await maybeCleanup();
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [user, games, specials, latest, recent, openCount, weekCount, showcase] = await Promise.all([
    currentUser(),
    db.game.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { items: true } }, currencies: true } }),
    db.post.findMany({ where: activeSpecialWhere(), include: postInclude, orderBy: { createdAt: "desc" }, take: 12 }),
    db.post.findMany({ where: { ...openWhere(), isSpecial: false }, include: postInclude, orderBy: { createdAt: "desc" }, take: 24 }),
    db.trade.findMany({ where: { status: "COMPLETED" }, include: tradeInclude, orderBy: { completedAt: "desc" }, take: 6 }),
    db.post.count({ where: openWhere() }),
    db.trade.count({ where: { status: "COMPLETED", completedAt: { gte: weekAgo } } }),
    db.item.findMany({ where: { slug: { in: ["phantom", "lava", "rukiryaxe", "frost"] } }, take: 4 }),
  ]);
  const openByGame = await db.post.groupBy({ by: ["gameId"], where: openWhere(), _count: true });
  const counts = new Map(openByGame.map((g) => [g.gameId, g._count]));
  const [rep, savedIds] = await Promise.all([reputation([...new Set([...specials, ...latest].map((p) => p.userId))]), savedIdsFor(user?.id)]);
  const first = games[0];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] bg-brand text-white px-6 py-10 sm:px-10 sm:py-14">
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">In-game currency only</p>
          <h1 className="mt-4 font-display text-4xl sm:text-6xl font-extrabold tracking-tight leading-[0.95]">
            Swap logs, axes &amp; loot with real players.
          </h1>
          <p className="mt-4 text-white/90 text-lg leading-relaxed max-w-md">
            Post what you&apos;ve got, chat, meet in-game and trade. Every finished deal goes on the record.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={user ? "/post/new" : "/signup"} className="btn btn-lg bg-white !text-ink">{user ? "Post a trade" : "Join free"}</Link>
            {first && <Link href={`/g/${first.slug}`} className="btn btn-lg bg-ink/25 hover:bg-ink/35">Browse {first.name}</Link>}
          </div>
          <div className="mt-8 flex gap-6 text-sm font-semibold">
            <span><span className="font-display text-2xl font-extrabold num">{openCount}</span> open posts</span>
            <span><span className="font-display text-2xl font-extrabold num">{weekCount}</span> trades this week</span>
          </div>
        </div>
        <div className="hidden md:grid absolute right-8 top-1/2 -translate-y-1/2 grid-cols-2 gap-4 w-[340px] rotate-[4deg]" aria-hidden="true">
          {showcase.map((it, i) => (
            <div key={it.id} className={`rounded-3xl overflow-hidden shadow-lift ${i % 2 ? "translate-y-6" : ""}`}>
              <ItemArt item={it} className="aspect-square" />
            </div>
          ))}
        </div>
      </section>

      <DealsCarousel posts={specials} rep={rep} savedIds={savedIds} title="Admin deals" href={first ? `/g/${first.slug}/deals` : undefined} showGame />

      <section>
        <h2 className="font-display text-2xl font-extrabold tracking-tight mb-4">Shop by game</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g, i) => (
            <Link key={g.id} href={`/g/${g.slug}`} className="group relative overflow-hidden rounded-3xl p-5 text-white transition-transform hover:-translate-y-0.5" style={{ background: GAME_COLORS[i % GAME_COLORS.length] }}>
              <p className="font-display text-2xl font-extrabold tracking-tight">{g.name}</p>
              <p className="mt-1 text-white/85 text-sm font-semibold">
                <span className="num">{counts.get(g.id) ?? 0}</span> open · <span className="num">{g._count.items}</span> items · paid in {g.currencies.map((c) => c.name).join(", ")}
              </p>
              <span className="mt-6 inline-flex btn btn-sm bg-white !text-ink">Open market →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Fresh listings</h2>
          {first && <Link href={`/g/${first.slug}`} className="text-sm font-bold text-brand hover:underline underline-offset-4">See more →</Link>}
        </div>
        <PostGrid posts={latest} rep={rep} savedIds={savedIds} showGame />
      </section>

      <section className="panel p-2 sm:p-4">
        <div className="flex items-end justify-between px-3 pt-2 mb-2">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Just traded</h2>
          <Link href="/history" className="text-sm font-bold text-brand hover:underline underline-offset-4">Full history →</Link>
        </div>
        <TradeList trades={recent} showGame />
      </section>
    </div>
  );
}
