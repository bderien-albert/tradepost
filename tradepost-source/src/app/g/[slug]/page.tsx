import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { boardPosts, openWhere, reputation, type SortKey } from "@/lib/queries";
import { PostTable } from "@/components/post-table";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { compact } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; item?: string; sort?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await db.game.findUnique({ where: { slug: (await params).slug } });
  return { title: game ? `${game.name} market` : "Game" };
}

const VIEWS = [
  { key: "sell", label: "For sale" },
  { key: "buy", label: "Buy orders" },
  { key: "items", label: "Items & prices" },
  { key: "trades", label: "Recent trades" },
] as const;

export default async function GamePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = await db.game.findUnique({
    where: { slug },
    include: { items: { orderBy: [{ category: "desc" }, { name: "asc" }] }, currencies: true },
  });
  if (!game || !game.active) notFound();

  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "sell";
  const sort = (["new", "price_asc", "price_desc"].includes(sp.sort ?? "") ? sp.sort : view === "buy" ? "price_desc" : "price_asc") as SortKey;
  const item = sp.item ? game.items.find((i) => i.slug === sp.item) : undefined;
  const href = (o: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { view, item: item?.slug, sort: sp.sort, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/g/${slug}?${q.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Market · paid in {game.currencies.map((c) => `${c.name} (${c.symbol})`).join(", ")}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">{game.name}</h1>
          {game.blurb && <p className="text-ink-2 mt-2 max-w-2xl">{game.blurb}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/post/new?game=${slug}&side=SELL`} className="btn btn-sell">Sell something</Link>
          <Link href={`/post/new?game=${slug}&side=BUY`} className="btn btn-buy">Place a buy order</Link>
        </div>
      </div>

      <div className="flex gap-6 border-b border-rule-strong mb-5 overflow-x-auto">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={href({ view: v.key, sort: undefined })}
            className={`pb-2.5 -mb-px border-b-2 text-sm whitespace-nowrap ${view === v.key ? "border-ink font-medium" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {(view === "sell" || view === "buy") && (
        <Board gameId={game.id} side={view === "sell" ? "SELL" : "BUY"} itemId={item?.id} sort={sort} items={game.items} current={item?.slug} href={href} />
      )}
      {view === "items" && <Items gameId={game.id} slug={slug} items={game.items} symbol={game.currencies[0]?.symbol ?? ""} />}
      {view === "trades" && <Trades gameId={game.id} />}
    </div>
  );
}

async function Board({
  gameId, side, itemId, sort, items, current, href,
}: {
  gameId: string; side: "BUY" | "SELL"; itemId?: string; sort: SortKey;
  items: { slug: string; name: string }[]; current?: string; href: (o: Record<string, string | undefined>) => string;
}) {
  const { specials, regular } = await boardPosts({ gameId, side, itemId, sort });
  const rep = await reputation([...new Set([...specials, ...regular].map((p) => p.userId))]);
  const sorts: [SortKey, string][] = [["price_asc", "Lowest price"], ["price_desc", "Highest price"], ["new", "Newest"]];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ItemPicker items={items} current={current} href={href} />
        <div className="ml-auto flex gap-1 text-sm">
          {sorts.map(([k, label]) => (
            <Link key={k} href={href({ sort: k })} className={`px-2.5 py-1 rounded-sm ${sort === k ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <PostTable
        specials={specials}
        posts={regular}
        rep={rep}
        empty={side === "SELL" ? "No one is selling this right now. Place a buy order and sellers will come to you." : "No buy orders right now. Post one to tell sellers what you want."}
      />
    </>
  );
}

function ItemPicker({ items, current, href }: { items: { slug: string; name: string }[]; current?: string; href: (o: Record<string, string | undefined>) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={href({ item: undefined })} className={`text-sm px-2.5 py-1 border rounded-sm ${!current ? "border-ink bg-card" : "border-rule text-ink-2 hover:border-rule-strong"}`}>All items</Link>
      {items.map((i) => (
        <Link key={i.slug} href={href({ item: i.slug })} className={`text-sm px-2.5 py-1 border rounded-sm ${current === i.slug ? "border-ink bg-card" : "border-rule text-ink-2 hover:border-rule-strong"}`}>
          {i.name}
        </Link>
      ))}
    </div>
  );
}

async function Items({ gameId, slug, items, symbol }: { gameId: string; slug: string; items: { id: string; slug: string; name: string; category: string; rarity: string | null }[]; symbol: string }) {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [stats, sellOpen, buyOpen] = await Promise.all([
    db.trade.groupBy({ by: ["itemId"], where: { item: { gameId }, status: "COMPLETED", completedAt: { gte: since } }, _avg: { unitPrice: true }, _sum: { quantity: true } }),
    db.post.groupBy({ by: ["itemId"], where: { gameId, side: "SELL", ...openWhere() }, _min: { unitPrice: true } }),
    db.post.groupBy({ by: ["itemId"], where: { gameId, side: "BUY", ...openWhere() }, _max: { unitPrice: true } }),
  ]);
  const st = new Map(stats.map((s) => [s.itemId, s]));
  const ask = new Map(sellOpen.map((s) => [s.itemId, s._min.unitPrice]));
  const bid = new Map(buyOpen.map((s) => [s.itemId, s._max.unitPrice]));

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="ledger min-w-[680px]">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th className="r">Lowest ask</th>
            <th className="r">Highest bid</th>
            <th className="r">30-day avg</th>
            <th className="r">30-day volume</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const s = st.get(i.id);
            const a = ask.get(i.id);
            const b = bid.get(i.id);
            return (
              <tr key={i.id}>
                <td><Link href={`/g/${slug}/i/${i.slug}`} className="font-medium hover:underline underline-offset-4">{i.name}</Link></td>
                <td className="text-ink-2 text-sm">{i.category}{i.rarity ? ` · ${i.rarity}` : ""}</td>
                <td className="r num text-sell">{a != null ? compact(a, symbol) : <span className="text-ink-3">–</span>}</td>
                <td className="r num text-buy">{b != null ? compact(b, symbol) : <span className="text-ink-3">–</span>}</td>
                <td className="r num">{s?._avg.unitPrice != null ? compact(Math.round(s._avg.unitPrice), symbol) : <span className="text-ink-3">–</span>}</td>
                <td className="r num text-ink-2">{s?._sum.quantity?.toLocaleString("en-US") ?? "0"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Trades({ gameId }: { gameId: string }) {
  const trades = await db.trade.findMany({
    where: { status: "COMPLETED", item: { gameId } },
    include: tradeInclude,
    orderBy: { completedAt: "desc" },
    take: 50,
  });
  return <TradeList trades={trades} />;
}
