import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ago, money } from "@/lib/format";
import { cancelTrade, confirmTrade, disputeTrade, rateTrade, sendMessage } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { WEEK_MS, maybeCleanup } from "@/lib/cleanup";
import { isAdmin } from "@/lib/admins";
import { ItemArt } from "@/components/item-art";
import { sizeLabel } from "@/lib/sizes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trade room" };

export default async function TradePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await maybeCleanup();
  const { id } = await params;
  const trade = await db.trade.findUnique({
    where: { id },
    include: {
      buyer: true, seller: true, currency: true,
      item: { include: { game: true } },
      messages: { where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) } }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "asc" } },
      ratings: true,
    },
  });
  if (!trade) notFound();
  const isBuyer = trade.buyerId === user.id;
  const isSeller = trade.sellerId === user.id;
  const isStaff = isAdmin(user);
  if (!isBuyer && !isSeller && !isStaff) notFound();

  const other = isBuyer ? trade.seller : trade.buyer;
  const myConfirm = isBuyer ? trade.buyerConfirmedAt : trade.sellerConfirmedAt;
  const theirConfirm = isBuyer ? trade.sellerConfirmedAt : trade.buyerConfirmedAt;
  const myRating = trade.ratings.find((r) => r.fromId === user.id);
  const party = isBuyer || isSeller;

  const steps = [
    { label: "Offer accepted", done: true },
    { label: `${trade.seller.username} confirmed`, done: !!trade.sellerConfirmedAt },
    { label: `${trade.buyer.username} confirmed`, done: !!trade.buyerConfirmedAt },
    { label: "On the record", done: trade.status === "COMPLETED" },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-10">
      <div>
        <ItemArt item={trade.item} className="w-24 h-24 rounded-3xl mb-4" size="sm" />
        <p className="eyebrow">Trade room · {trade.item.game.name}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
          <span className="num">{trade.quantity.toLocaleString("en-US")}</span> × {trade.item.name}{trade.size ? <span className="text-ink-3"> · {sizeLabel(trade.size)}</span> : null}
        </h1>
        <p className="mt-2 text-lg">
          <span className="num font-medium">{money(trade.unitPrice * trade.quantity, trade.currency.symbol)}</span>
          <span className="text-ink-2"> total · {money(trade.unitPrice, trade.currency.symbol)} each</span>
        </p>
        <p className="text-sm text-ink-2 mt-1">
          <Link href={`/u/${trade.seller.username}`} className="font-medium text-ink hover:underline underline-offset-4">{trade.seller.username}</Link> sells to{" "}
          <Link href={`/u/${trade.buyer.username}`} className="font-medium text-ink hover:underline underline-offset-4">{trade.buyer.username}</Link>
        </p>

        <ol className="mt-8 grid grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <li key={i} className="text-xs">
              <div className={`h-2 rounded-full ${s.done ? "bg-buy" : "bg-rule"}`} />
              <p className={`mt-2 ${s.done ? "text-ink" : "text-ink-3"}`}>{s.label}</p>
            </li>
          ))}
        </ol>

        {trade.status === "DISPUTED" && <Notice tone="sell">This trade is disputed. A moderator is reviewing it.</Notice>}
        {trade.status === "CANCELLED" && <Notice tone="muted">This trade was cancelled. Nothing is recorded against either player.</Notice>}
        {trade.status === "COMPLETED" && <Notice tone="buy">Completed {trade.completedAt ? ago(trade.completedAt) : ""}. It&apos;s now part of both players&apos; history and the price record.</Notice>}

        {trade.status === "ACTIVE" && party && (
          <div className="mt-8 panel p-5">
            <p className="font-medium">How to finish</p>
            <ol className="mt-2 text-sm text-ink-2 space-y-1 list-decimal pl-5">
              <li>Agree a time and server in the chat. Add <span className="font-medium text-ink">{other.username}</span> as a friend on Roblox.</li>
              <li>Meet in {trade.item.game.name}. {isSeller ? "Hand over the items" : "Check the items"} before {isBuyer ? "you pay" : "they pay"}.</li>
              <li>Once it&apos;s done in-game, press Confirm. When you both confirm, it&apos;s recorded.</li>
            </ol>
            <p className="mt-3 text-xs text-ink-3">
              Closes automatically on {new Date(trade.createdAt.getTime() + WEEK_MS).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}:
              finalized if either of you confirmed, cancelled if neither did.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 items-center">
              {myConfirm ? (
                <span className="text-sm text-buy">You confirmed. Waiting for {other.username}.</span>
              ) : (
                <form action={confirmTrade.bind(null, trade.id)}>
                  <SubmitButton className="btn btn-buy">Confirm trade done</SubmitButton>
                </form>
              )}
              {!myConfirm && !theirConfirm && (
                <form action={cancelTrade.bind(null, trade.id)}>
                  <SubmitButton className="btn btn-ghost">Call it off</SubmitButton>
                </form>
              )}
            </div>
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-ink-3 hover:text-sell">Something went wrong? Open a dispute</summary>
              <ActionForm action={disputeTrade} className="mt-3 space-y-2">
                <input type="hidden" name="tradeId" value={trade.id} />
                <textarea name="reason" rows={3} className="field" placeholder="What happened? Moderators will see the chat too." required />
                <SubmitButton className="btn btn-ghost btn-sm">Open dispute</SubmitButton>
              </ActionForm>
            </details>
          </div>
        )}

        {trade.status === "COMPLETED" && party && !myRating && (
          <div className="mt-8 panel p-5">
            <p className="font-medium">Rate {other.username}</p>
            <ActionForm action={rateTrade} className="mt-3 space-y-3">
              <input type="hidden" name="tradeId" value={trade.id} />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name="stars" value={n} className="peer sr-only" defaultChecked={n === 5} />
                    <span className="num inline-flex w-10 h-10 items-center justify-center panel peer-checked:bg-special peer-checked:text-[#3d2c00] peer-checked:border-special">{n}</span>
                  </label>
                ))}
              </div>
              <input name="comment" maxLength={200} className="field" placeholder="Short comment (optional)" />
              <SubmitButton className="btn">Save rating</SubmitButton>
            </ActionForm>
          </div>
        )}
        {myRating && <p className="mt-6 text-sm text-ink-2">You rated {other.username} <span className="num">{myRating.stars}/5</span>{myRating.comment ? `: “${myRating.comment}”` : "."}</p>}
      </div>

      <aside className="panel flex flex-col h-[560px] overflow-hidden">
        <div className="px-4 py-3 border-b border-rule flex items-baseline justify-between">
          <p className="font-medium text-sm">Chat</p>
          <p className="text-xs text-ink-3">Messages delete after 7 days</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 flex flex-col-reverse">
          <div className="space-y-3">
            {trade.messages.length === 0 && <p className="text-sm text-ink-3">Say hi and suggest a time to meet.</p>}
            {trade.messages.map((m) => {
              const mine = m.userId === user.id;
              return (
                <div key={m.id} className={`max-w-[85%] ${mine ? "ml-auto text-right" : ""}`}>
                  <p className="text-[0.7rem] text-ink-3">{m.user.username} · {ago(m.createdAt)}</p>
                  <p className={`inline-block text-sm px-3 py-1.5 rounded-2xl mt-0.5 text-left ${mine ? "bg-brand text-white" : "bg-paper-2"}`}>{m.body}</p>
                </div>
              );
            })}
          </div>
        </div>
        {party && trade.status !== "CANCELLED" && (
          <ActionForm action={sendMessage} className="border-t border-rule p-3" resetOnOk>
            <input type="hidden" name="tradeId" value={trade.id} />
            <div className="flex gap-2">
              <input name="body" maxLength={500} className="field" placeholder={`Message ${other.username}`} autoComplete="off" required />
              <SubmitButton className="btn" pendingText="…">Send</SubmitButton>
            </div>
          </ActionForm>
        )}
      </aside>
    </div>
  );
}

function Notice({ tone, children }: { tone: "buy" | "sell" | "muted"; children: React.ReactNode }) {
  const cls = tone === "buy" ? "bg-buy-tint text-buy" : tone === "sell" ? "bg-sell-tint text-sell" : "bg-card text-ink-2";
  return <p className={`mt-6 text-sm px-4 py-3 rounded-2xl ${cls}`}>{children}</p>;
}
