import Link from "next/link";
import type { PostRow } from "@/lib/queries";
import { ago, compact, money } from "@/lib/format";
import { sizeLabel } from "@/lib/sizes";
import { toggleSave } from "@/app/actions";
import { ItemArt } from "./item-art";
import { Avatar } from "./avatar";

export type Rep = Map<string, { stars: number | null; trades: number }>;

export function PostCard({ p, rep, saved, showGame, className = "" }: { p: PostRow; rep: Rep; saved?: boolean; showGame?: boolean; className?: string }) {
  const left = p.quantity - p.filled;
  const r = rep.get(p.userId);
  const size = sizeLabel(p.size);
  return (
    <article className={`group relative panel overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lift ${p.isSpecial ? "ring-2 ring-special" : ""} ${className}`}>
      <Link href={`/post/${p.id}`} className="block">
        <div className="relative">
          <ItemArt item={p.item} className={p.notes ? "aspect-[4/3]" : "aspect-square"} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className={`side-tag side-${p.side} shadow-sm`}>{p.side === "BUY" ? "Buying" : "Selling"}</span>
            {p.isSpecial && <span className="deal-tag shadow-sm">★ Admin deal</span>}
          </div>
          {size && <span className="absolute left-3 bottom-3 rounded-full bg-black/55 text-white text-xs font-bold px-2.5 py-1 backdrop-blur-sm">{size}</span>}
        </div>
        <div className="p-4">
          <p className="font-display text-xl font-extrabold tracking-tight num leading-none">
            {money(p.unitPrice, p.currency.symbol)}
            <span className="text-xs font-semibold text-ink-3 ml-1 font-sans tracking-normal">each</span>
          </p>
          <h3 className="mt-1.5 font-semibold leading-snug">{p.item.name}</h3>
          <p className="text-sm text-ink-2">
            <span className="num">{left.toLocaleString("en-US")}</span> {p.item.unit}{left === 1 ? "" : "s"} · {compact(p.unitPrice * left, p.currency.symbol)} total
            {showGame ? ` · ${p.game.name}` : ""}
          </p>
          {p.notes && <p className="mt-2 text-sm text-ink-2 bg-paper rounded-xl px-3 py-2 line-clamp-3">“{p.notes}”</p>}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Avatar user={p.user} size={24} />
            <span className="font-semibold truncate">{p.user.username}</span>
            {r && (
              <span className="text-xs text-ink-3 whitespace-nowrap">
                {r.stars != null ? <>★ <span className="num">{r.stars.toFixed(1)}</span></> : "new"} · <span className="num">{r.trades}</span>
              </span>
            )}
            <span className="ml-auto text-xs text-ink-3 whitespace-nowrap">{ago(p.createdAt)}</span>
          </div>
        </div>
      </Link>
      <form action={toggleSave.bind(null, p.id)} className="absolute right-3 top-3">
        <button
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${saved ? "bg-brand text-white" : "bg-white/90 text-ink"}`}
          aria-label={saved ? "Remove from saved" : "Save"}
          title={saved ? "Saved" : "Save"}
        >
          <Heart filled={!!saved} />
        </button>
      </form>
    </article>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

// Pinterest-style masonry: cards flow down columns at their natural height.
export function PostGrid({ posts, rep, savedIds, showGame, empty }: { posts: PostRow[]; rep: Rep; savedIds: Set<string>; showGame?: boolean; empty?: React.ReactNode }) {
  if (posts.length === 0) {
    return <div className="panel px-6 py-14 text-center text-ink-2">{empty ?? "Nothing here yet."}</div>;
  }
  // CSS columns render unevenly in Chrome, so cards are dealt into flex columns instead.
  // One layout per breakpoint keeps it server-rendered with no layout script.
  const layouts = [
    { cols: 2, className: "flex md:hidden" },
    { cols: 3, className: "hidden md:flex lg:hidden" },
    { cols: 4, className: "hidden lg:flex" },
  ];
  return (
    <>
      {layouts.map(({ cols, className }) => (
        <div key={cols} className={`${className} items-start gap-3 sm:gap-4`}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
              {posts.filter((_, i) => i % cols === c).map((p) => (
                <PostCard key={p.id} p={p} rep={rep} saved={savedIds.has(p.id)} showGame={showGame} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// Carousell-style horizontal strip, used for admin deals at the top of a board.
export function DealsCarousel({ posts, rep, savedIds, title, href, showGame }: { posts: PostRow[]; rep: Rep; savedIds: Set<string>; title: string; href?: string; showGame?: boolean }) {
  if (posts.length === 0) return null;
  return (
    <section className="relative rounded-[28px] bg-special-tint p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <h2 className="font-display text-xl font-extrabold tracking-tight flex items-center gap-2">
          <span className="inline-flex w-7 h-7 rounded-full bg-special items-center justify-center text-sm">★</span>
          {title}
        </h2>
        {href && <Link href={href} className="text-sm font-bold text-special-ink hover:underline underline-offset-4">See all →</Link>}
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 -mx-1 px-1">
        {posts.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[230px] sm:w-[250px]">
            <PostCard p={p} rep={rep} saved={savedIds.has(p.id)} showGame={showGame} />
          </div>
        ))}
      </div>
    </section>
  );
}
