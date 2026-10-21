import Link from "next/link";
import { Prisma } from "@prisma/client";
import { money, shortDate } from "@/lib/format";
import { sizeLabel } from "@/lib/sizes";
import { ItemArt } from "./item-art";

export const tradeInclude = {
  buyer: { select: { username: true } },
  seller: { select: { username: true } },
  item: { include: { game: { select: { name: true, slug: true } } } },
  currency: true,
} satisfies Prisma.TradeInclude;

export type TradeRow = Prisma.TradeGetPayload<{ include: typeof tradeInclude }>;

export function TradeList({ trades, showGame = false, empty }: { trades: TradeRow[]; showGame?: boolean; empty?: string }) {
  if (trades.length === 0) {
    return <div className="px-6 py-10 text-center text-sm text-ink-2">{empty ?? "No completed trades yet."}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="ledger min-w-[620px]">
        <thead>
          <tr>
            <th>Item</th>
            <th className="r">Qty</th>
            <th className="r">Price each</th>
            <th>Seller → Buyer</th>
            <th className="r">Date</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td>
                <Link href={`/g/${t.item.game.slug}/i/${t.item.slug}`} className="flex items-center gap-3 group">
                  <ItemArt item={t.item} size="sm" className="w-10 h-10 rounded-xl shrink-0" />
                  <span>
                    <span className="font-semibold group-hover:underline underline-offset-4">{t.item.name}</span>
                    <span className="block text-xs text-ink-3">{[sizeLabel(t.size), showGame ? t.item.game.name : null].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              </td>
              <td className="r num">{t.quantity.toLocaleString("en-US")}</td>
              <td className="r num font-bold">{money(t.unitPrice, t.currency.symbol)}</td>
              <td className="text-sm whitespace-nowrap">
                <Link href={`/u/${t.seller.username}`} className="font-semibold hover:underline underline-offset-4">{t.seller.username}</Link>
                <span className="text-ink-3"> → </span>
                <Link href={`/u/${t.buyer.username}`} className="font-semibold hover:underline underline-offset-4">{t.buyer.username}</Link>
              </td>
              <td className="r text-ink-3 text-xs whitespace-nowrap num">{shortDate(t.completedAt ?? t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
