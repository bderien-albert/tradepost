import Link from "next/link";
import { db } from "@/lib/db";
import { activeSpecialWhere, openWhere, postInclude, reputation } from "@/lib/queries";
import { PostTable } from "@/components/post-table";
import { TradeList, tradeInclude } from "@/components/trade-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [games, specials, latest, recent, openCount, weekCount] = await Promise.all([
    db.game.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { items: true } }, currencies: true },
    }),
    db.post.findMany({ where: activeSpecialWhere(), include: postInclude, orderBy: { createdAt: "desc" }, take: 3 }),
    db.post.findMany({ where: openWhere(), include: postInclude, orderBy: { createdAt: "desc" }, take: 12 }),
    db.trade.findMany({ where: { status: "COMPLETED" }, include: tradeInclude, orderBy: { completedAt: "desc" }, take: 8 }),
    db.post.count({ where: openWhere() }),
    db.trade.count({ where: { status: "COMPLETED", completedAt: { gte: weekAgo } } }),
  ]);
  const openByGame = await db.post.groupBy({ by: ["gameId"], where: openWhere(), _count: true });
  const counts = new Map(openByGame.map((g) => [g.gameId, g._count]));
  const specialIds = new Set(specials.map((s) => s.id));
  const rep = await reputation([...new Set([...specials, ...latest].map((p) => p.userId))]);

  return (
    <div className="space-y-12">
      <section className="grid md:grid-cols-[1.4fr_1fr] gap-8 items-end border-b border-rule pb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            Post it. Meet in-game. <span className="italic font-medium text-ink-2">Swap.</span>
          </h1>
          <p className="mt-4 text-ink-2 max-w-lg leading-relaxed">
            A board for buying and selling Roblox game items for that game&apos;s own currency. Every finished trade stays on the record,
            so prices and reputations are real.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-rule border border-rule rounded-sm overflow-hidden">
          <Stat label="Open posts" value={openCount} />
          <Stat label="Trades this week" value={weekCount} />
        </dl>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Games</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {games.map((g) => (
            <Link key={g.id} href={`/g/${g.slug}`} className="group border border-rule-strong bg-card rounded-sm p-4 hover:border-ink transition-colors">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{g.name}</span>
                <span className="text-ink-3 group-hover:text-ink transition-colors">→</span>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-ink-2">
                <span><span className="num text-ink">{counts.get(g.id) ?? 0}</span> open</span>
                <span><span className="num text-ink">{g._count.items}</span> items</span>
                <span>Paid in {g.currencies.map((c) => c.name).join(", ")}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow">Latest posts</h2>
          <Link href="/post/new" className="text-sm text-ink-2 hover:text-ink">Post a trade →</Link>
        </div>
        <PostTable specials={specials} posts={latest.filter((p) => !specialIds.has(p.id))} rep={rep} showGame showSide />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow">Just completed</h2>
          <Link href="/history" className="text-sm text-ink-2 hover:text-ink">Full history →</Link>
        </div>
        <TradeList trades={recent} showGame />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-4 py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="num text-3xl mt-1">{value.toLocaleString("en-US")}</dd>
    </div>
  );
}
