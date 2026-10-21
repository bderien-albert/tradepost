import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { WoodSize } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { activeSpecialWhere, boardPosts, openWhere, postInclude, reputation, savedIdsFor, type SortKey } from "@/lib/queries";
import { DealsCarousel, PostGrid } from "@/components/post-card";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { ItemArt } from "@/components/item-art";
import { compact } from "@/lib/format";
import { maybeCleanup } from "@/lib/cleanup";
import { WOOD_SIZES, isWood } from "@/lib/sizes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; item?: string; sort?: string; size?: string }> };

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

type Href = (o: Record<string, string | undefined>) => string;

export default async function GamePage({ params, searchParams }: Props) {
  await maybeCleanup();
  const { slug } = await params;
  const sp = await searchParams;
  const game = await db.game.findUnique({
    where: { slug },
    include: { items: { orderBy: [{ category: "desc" }, { name: "asc" }] }, currencies: true },
  });
  if (!game || !game.active) notFound();

  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "sell";
  const sort = (["new", "price_asc", "price_desc"].includes(sp.sort ?? "") ? sp.sort : view === "buy" ? "price_desc" : "new") as SortKey;
  const item = sp.item ? game.items.find((i) => i.slug === sp.item) : undefined;
  const size = WOOD_SIZES.some((s) => s.key === sp.size) ? (sp.size as WoodSize) : undefined;
  const href: Href = (o) => {
    const q = new URLSearchParams();
    const merged = { view, item: item?.slug, sort: sp.sort, size, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/g/${slug}?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] bg-sky text-white px-6 py-8 sm:px-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">Market · paid in {game.currencies.map((c) => `${c.name} (${c.symbol})`).join(", ")}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">{game.name}</h1>
          {game.blurb && <p className="text-white/90 mt-2 max-w-xl">{game.blurb}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/post/new?game=${slug}&side=SELL`} className="btn btn-lg bg-white !text-ink">Sell something</Link>
          <Link href={`/post/new?game=${slug}&side=BUY`} className="btn btn-lg bg-ink/25 hover:bg-ink/35">Place a buy order</Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {VIEWS.map((v) => (
          <Link key={v.key} href={href({ view: v.key, sort: undefined })} className={`chip h-10 px-5 text-[0.95rem] ${view === v.key ? "chip-on" : ""}`}>
            {v.label}
          </Link>
        ))}
      </div>

      {(view === "sell" || view === "buy") && (
        <Board gameId={game.id} side={view === "sell" ? "SELL" : "BUY"} item={item} size={size} sort={sort} items={game.items} href={href} slug={slug} />
      )}
      {view === "items" && <Items gameId={game.id} slug={slug} items={game.items} symbol={game.currencies[0]?.symbol ?? ""} />}
      {view === "trades" && <Trades gameId={game.id} />}

      <AdminDealsLink gameId={game.id} slug={slug} />
    </div>
  );
}

async function Board({ gameId, side, item, size, sort, items, href, slug }: {
  gameId: string; side: "BUY" | "SELL"; item?: { id: string; slug: string; category: string }; size?: WoodSize; sort: SortKey;
  items: { slug: string; name: string; category: string }[]; href: Href; slug: string;
}) {
  const user = await currentUser();
  const [{ specials, regular }, savedIds, deals] = await Promise.all([
    boardPosts({ gameId, side, itemId: item?.id, size, sort }),
    savedIdsFor(user?.id),
    db.post.findMany({ where: { gameId, ...activeSpecialWhere() }, include: postInclude, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const rep = await reputation([...new Set([...specials, ...regular, ...deals].map((p) => p.userId))]);
  const sorts: [SortKey, string][] = [["new", "Newest"], ["price_asc", "Lowest price"], ["price_desc", "Highest price"]];
  const showSizes = !item || isWood(item.category);

  return (
    <div className="space-y-5">
      {!item && !size && <DealsCarousel posts={deals} rep={rep} savedIds={savedIds} title="Admin deals" href={`/g/${slug}/deals`} />}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <Link href={href({ item: undefined, size: undefined })} className={`chip ${!item ? "chip-on" : ""}`}>All items</Link>
        {items.map((i) => (
          <Link key={i.slug} href={href({ item: i.slug, size: isWood(i.category) ? size : undefined })} className={`chip pl-1.5 ${item?.slug === i.slug ? "chip-on" : ""}`}>
            <ItemArt item={i} size="sm" className="w-6 h-6 rounded-full" />
            {i.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showSizes && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-ink-3 uppercase tracking-wider mr-1">Wood size</span>
            <Link href={href({ size: undefined })} className={`chip h-8 ${!size ? "chip-on" : ""}`}>Any</Link>
            {WOOD_SIZES.map((s) => (
              <Link key={s.key} href={href({ size: s.key })} className={`chip h-8 ${size === s.key ? "chip-on" : ""}`}>{s.label}</Link>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-1.5">
          {sorts.map(([k, label]) => (
            <Link key={k} href={href({ sort: k })} className={`chip h-8 ${sort === k ? "chip-on" : ""}`}>{label}</Link>
          ))}
        </div>
      </div>

      <PostGrid
        posts={[...(item || size ? specials : []), ...regular]}
        rep={rep}
        savedIds={savedIds}
        empty={side === "SELL" ? "No one is selling this right now. Place a buy order and sellers will come to you." : "No buy orders right now. Post one to tell sellers what you want."}
      />
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
  const cats = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-8">
      {cats.map((cat) => (
        <section key={cat}>
          <h2 className="font-display text-xl font-extrabold tracking-tight mb-3">{cat}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.filter((i) => i.category === cat).map((i) => {
              const s = st.get(i.id);
              return (
                <Link key={i.id} href={`/g/${slug}/i/${i.slug}`} className="panel overflow-hidden group transition-transform hover:-translate-y-0.5 hover:shadow-lift">
                  <ItemArt item={i} className="aspect-[4/3]" />
                  <div className="p-3.5">
                    <p className="font-bold group-hover:underline underline-offset-4">{i.name}</p>
                    {i.rarity && <p className="text-xs text-ink-3">{i.rarity}</p>}
                    <dl className="mt-2 grid grid-cols-3 gap-1 text-xs">
                      <div><dt className="text-ink-3">Ask</dt><dd className="font-bold text-sell num">{ask.get(i.id) != null ? compact(ask.get(i.id)!, symbol) : "–"}</dd></div>
                      <div><dt className="text-ink-3">Bid</dt><dd className="font-bold text-buy num">{bid.get(i.id) != null ? compact(bid.get(i.id)!, symbol) : "–"}</dd></div>
                      <div><dt className="text-ink-3">Avg</dt><dd className="font-bold num">{s?._avg.unitPrice != null ? compact(Math.round(s._avg.unitPrice), symbol) : "–"}</dd></div>
                    </dl>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

async function Trades({ gameId }: { gameId: string }) {
  const trades = await db.trade.findMany({ where: { status: "COMPLETED", item: { gameId } }, include: tradeInclude, orderBy: { completedAt: "desc" }, take: 50 });
  return <div className="panel p-2 sm:p-3"><TradeList trades={trades} /></div>;
}

async function AdminDealsLink({ gameId, slug }: { gameId: string; slug: string }) {
  const n = await db.post.count({ where: { gameId, ...activeSpecialWhere() } });
  return (
    <Link href={`/g/${slug}/deals`} className="mt-4 flex items-center justify-between gap-4 rounded-3xl bg-special px-6 py-5 text-[#3d2c00] transition-transform hover:-translate-y-0.5">
      <span>
        <span className="block font-display text-xl font-extrabold tracking-tight">★ Admin deals</span>
        <span className="block text-sm font-semibold opacity-80">Every staff deal for this game, sorted by item type.</span>
      </span>
      <span className="btn bg-[#3d2c00] text-white"><span className="num">{n}</span>&nbsp;live →</span>
    </Link>
  );
}
