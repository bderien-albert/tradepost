import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { boardPosts, priceStats, reputation, savedIdsFor } from "@/lib/queries";
import { PostGrid } from "@/components/post-card";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { PriceChart } from "@/components/price-chart";
import { ItemArt } from "@/components/item-art";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; item: string }> };

async function load(slug: string, itemSlug: string) {
  const game = await db.game.findUnique({ where: { slug }, include: { currencies: true } });
  if (!game) return null;
  const item = await db.item.findUnique({ where: { gameId_slug: { gameId: game.id, slug: itemSlug } } });
  return item ? { game, item } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, item } = await params;
  const r = await load(slug, item);
  return { title: r ? `${r.item.name} · ${r.game.name}` : "Item" };
}

export default async function ItemPage({ params }: Props) {
  const { slug, item: itemSlug } = await params;
  const r = await load(slug, itemSlug);
  if (!r) notFound();
  const { game, item } = r;
  const symbol = game.currencies[0]?.symbol ?? "";
  const user = await currentUser();

  const [sell, buy, stats, trades, savedIds] = await Promise.all([
    boardPosts({ gameId: game.id, side: "SELL", itemId: item.id, sort: "price_asc" }),
    boardPosts({ gameId: game.id, side: "BUY", itemId: item.id, sort: "price_desc" }),
    priceStats(item.id),
    db.trade.findMany({ where: { itemId: item.id, status: "COMPLETED" }, include: tradeInclude, orderBy: { completedAt: "desc" }, take: 25 }),
    savedIdsFor(user?.id),
  ]);
  const all = [...sell.specials, ...sell.regular, ...buy.specials, ...buy.regular];
  const rep = await reputation([...new Set(all.map((p) => p.userId))]);

  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-[320px_1fr] gap-6 items-stretch">
        <ItemArt item={item} size="lg" className="rounded-[32px] aspect-square" />
        <div className="panel p-6 sm:p-8 flex flex-col">
          <p className="eyebrow"><Link href={`/g/${slug}?view=items`} className="hover:text-ink">{game.name}</Link> · {item.category}{item.rarity ? ` · ${item.rarity}` : ""}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">{item.name}</h1>
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Average (30d)" value={stats ? money(stats.avg, symbol) : "–"} tone="bg-brand-tint" />
            <Stat label="Last trade" value={stats ? money(stats.last, symbol) : "–"} tone="bg-buy-tint" />
            <Stat label="Low – high" value={stats ? `${money(stats.low, symbol)} – ${money(stats.high, symbol)}` : "–"} tone="bg-special-tint" />
            <Stat label="Volume" value={stats ? `${stats.volume.toLocaleString("en-US")} ${item.unit}s` : "No trades yet"} tone="bg-paper-2" />
          </dl>
          <div className="mt-auto pt-6 flex flex-wrap gap-2">
            <Link href={`/post/new?game=${slug}&item=${item.slug}&side=SELL`} className="btn btn-sell btn-lg">Sell {item.name}</Link>
            <Link href={`/post/new?game=${slug}&item=${item.slug}&side=BUY`} className="btn btn-buy btn-lg">Place a buy order</Link>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-xl font-extrabold tracking-tight mb-3">Price per {item.unit}, last 30 days</h2>
        <PriceChart points={stats?.points ?? []} symbol={symbol} />
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold tracking-tight mb-4">For sale</h2>
        <PostGrid posts={[...sell.specials, ...sell.regular]} rep={rep} savedIds={savedIds} empty="No one is selling this right now." />
      </section>
      <section>
        <h2 className="font-display text-2xl font-extrabold tracking-tight mb-4">Buy orders</h2>
        <PostGrid posts={[...buy.specials, ...buy.regular]} rep={rep} savedIds={savedIds} empty="No buy orders right now." />
      </section>
      <section className="panel p-2 sm:p-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight px-3 pt-2 mb-2">Trade history</h2>
        <TradeList trades={trades} />
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${tone}`}>
      <dt className="text-xs font-bold text-ink-2">{label}</dt>
      <dd className="font-display text-lg font-extrabold num mt-0.5 leading-tight">{value}</dd>
    </div>
  );
}
