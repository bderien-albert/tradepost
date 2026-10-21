import Link from "next/link";
import { Prisma } from "@prisma/client";
import { money, shortDate } from "@/lib/format";

export const tradeInclude = {
  buyer: { select: { username: true } },
  seller: { select: { username: true } },
  item: { include: { game: { select: { name: true, slug: true } } } },
  currency: true,
} satisfies Prisma.TradeInclude;

export type TradeRow = Prisma.TradeGetPayload<{ include: typeof tradeInclude }>;

export function TradeList({ trades, showGame = false, empty }: { trades: TradeRow[]; showGame?: boolean; empty?: string }) {
  if (trades.length === 0) {
    return <div className="border border-dashed border-rule-strong rounded-sm px-6 py-8 text-center text-sm text-ink-2">{empty ?? "No completed trades yet."}</div>;
  }
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="ledger min-w-[640px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th className="r">Qty</th>
            <th className="r">Price each</th>
            <th>Seller → Buyer</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td className="text-ink-2 text-xs whitespace-nowrap num">{shortDate(t.completedAt ?? t.createdAt)}</td>
              <td>
                <Link href={`/g/${t.item.game.slug}/i/${t.item.slug}`} className="hover:underline underline-offset-4">{t.item.name}</Link>
                {showGame && <span className="text-xs text-ink-3"> · {t.item.game.name}</span>}
              </td>
              <td className="r num">{t.quantity.toLocaleString("en-US")}</td>
              <td className="r num font-medium">{money(t.unitPrice, t.currency.symbol)}</td>
              <td className="text-sm whitespace-nowrap">
                <Link href={`/u/${t.seller.username}`} className="hover:underline underline-offset-4">{t.seller.username}</Link>
                <span className="text-ink-3"> → </span>
                <Link href={`/u/${t.buyer.username}`} className="hover:underline underline-offset-4">{t.buyer.username}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
