import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { boardPosts, priceStats, reputation } from "@/lib/queries";
import { PostTable } from "@/components/post-table";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { PriceChart } from "@/components/price-chart";
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

  const [sell, buy, stats, trades] = await Promise.all([
    boardPosts({ gameId: game.id, side: "SELL", itemId: item.id, sort: "price_asc" }),
    boardPosts({ gameId: game.id, side: "BUY", itemId: item.id, sort: "price_desc" }),
    priceStats(item.id),
    db.trade.findMany({ where: { itemId: item.id, status: "COMPLETED" }, include: tradeInclude, orderBy: { completedAt: "desc" }, take: 25 }),
  ]);
  const all = [...sell.specials, ...sell.regular, ...buy.specials, ...buy.regular];
  const rep = await reputation([...new Set(all.map((p) => p.userId))]);

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow"><Link href={`/g/${slug}?view=items`} className="hover:text-ink">{game.name}</Link> · {item.category}{item.rarity ? ` · ${item.rarity}` : ""}</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{item.name}</h1>
          <div className="flex gap-2">
            <Link href={`/post/new?game=${slug}&item=${item.slug}&side=SELL`} className="btn btn-sell">Sell</Link>
            <Link href={`/post/new?game=${slug}&item=${item.slug}&side=BUY`} className="btn btn-buy">Buy order</Link>
          </div>
        </div>
      </div>

      <section className="grid lg:grid-cols-[1fr_260px] gap-6 border border-rule-strong bg-card rounded-sm p-5">
        <div>
          <h2 className="eyebrow mb-3">Price per {item.unit}, last 30 days</h2>
          <PriceChart points={stats?.points ?? []} symbol={symbol} />
        </div>
        <dl className="grid grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-3 content-start text-sm">
          <Fact label="Average (by volume)" value={stats ? money(stats.avg, symbol) : "–"} />
          <Fact label="Last trade" value={stats ? money(stats.last, symbol) : "–"} />
          <Fact label="Range" value={stats ? `${money(stats.low, symbol)} – ${money(stats.high, symbol)}` : "–"} />
          <Fact label="Volume" value={stats ? `${stats.volume.toLocaleString("en-US")} ${item.unit}s in ${stats.count} trades` : "No trades yet"} />
        </dl>
      </section>

      <section>
        <h2 className="eyebrow mb-3">For sale</h2>
        <PostTable specials={sell.specials} posts={sell.regular} rep={rep} empty="No one is selling this right now." />
      </section>
      <section>
        <h2 className="eyebrow mb-3">Buy orders</h2>
        <PostTable specials={buy.specials} posts={buy.regular} rep={rep} empty="No buy orders right now." />
      </section>
      <section>
        <h2 className="eyebrow mb-3">Trade history</h2>
        <TradeList trades={trades} />
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-3 text-xs">{label}</dt>
      <dd className="num mt-0.5">{value}</dd>
    </div>
  );
}
