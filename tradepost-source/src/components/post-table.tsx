import Link from "next/link";
import type { PostRow } from "@/lib/queries";
import { ago, money } from "@/lib/format";
import { Trader } from "./trader";

type Rep = Map<string, { stars: number | null; trades: number }>;

export function PostTable({
  specials = [],
  posts,
  rep,
  showGame = false,
  showSide = false,
  empty,
}: {
  specials?: PostRow[];
  posts: PostRow[];
  rep: Rep;
  showGame?: boolean;
  showSide?: boolean;
  empty?: React.ReactNode;
}) {
  if (specials.length === 0 && posts.length === 0) {
    return <div className="border border-dashed border-rule-strong rounded-sm px-6 py-10 text-center text-sm text-ink-2">{empty ?? "Nothing here yet."}</div>;
  }
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="ledger sm:min-w-[720px]">
        <thead>
          <tr>
            <th>Item</th>
            <th className="r">Qty</th>
            <th className="r">Price each</th>
            <th className="r hidden md:table-cell">Total</th>
            <th className="hidden sm:table-cell">Trader</th>
            <th className="r hidden sm:table-cell">Posted</th>
          </tr>
        </thead>
        <tbody>
          {specials.map((p) => <Row key={p.id} p={p} rep={rep} special showGame={showGame} showSide={showSide} />)}
          {posts.map((p) => <Row key={p.id} p={p} rep={rep} showGame={showGame} showSide={showSide} />)}
        </tbody>
      </table>
    </div>
  );
}

function Row({ p, rep, special, showGame, showSide }: { p: PostRow; rep: Rep; special?: boolean; showGame?: boolean; showSide?: boolean }) {
  const left = p.quantity - p.filled;
  return (
    <tr className={special ? "!bg-special" : undefined} style={special ? { boxShadow: "inset 3px 0 0 var(--special-rule)" } : undefined}>
      <td>
        <div className="flex items-center gap-2.5">
          {showSide && <span className={`side-tag side-${p.side}`}>{p.side === "BUY" ? "Buying" : "Selling"}</span>}
          <Link href={`/post/${p.id}`} className="font-medium hover:underline underline-offset-4">{p.item.name}</Link>
          {special && (
            <span className="eyebrow !text-special-ink !text-[0.62rem] border border-special-rule rounded-[2px] px-1.5 py-px">Admin special</span>
          )}
        </div>
        <div className="text-xs text-ink-3 mt-0.5">
          {showGame ? `${p.game.name} · ` : ""}
          {p.item.category}
          {p.notes ? <span className="text-ink-2"> · {p.notes.length > 60 ? p.notes.slice(0, 60) + "…" : p.notes}</span> : null}
        </div>
        <div className="sm:hidden text-xs text-ink-2 mt-0.5">by {p.user.username} · {ago(p.createdAt)}</div>
      </td>
      <td className="r num">{left.toLocaleString("en-US")}</td>
      <td className="r num font-medium">{money(p.unitPrice, p.currency.symbol)}</td>
      <td className="r num text-ink-2 hidden md:table-cell">{money(p.unitPrice * left, p.currency.symbol)}</td>
      <td className="hidden sm:table-cell"><Trader username={p.user.username} rep={rep.get(p.userId)} /></td>
      <td className="r text-ink-3 text-xs whitespace-nowrap hidden sm:table-cell">{ago(p.createdAt)}</td>
    </tr>
  );
}
