import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { reputation, priceStats } from "@/lib/queries";
import { ago, money } from "@/lib/format";
import { acceptOffer, cancelPost, declineOffer, makeOffer, removePost, setSpecial, withdrawOffer } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Trader } from "@/components/trader";
import { ReportForm } from "@/components/report-form";
import { PostChat } from "@/components/post-chat";
import { maybeCleanup } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ chat?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.post.findUnique({ where: { id: (await params).id }, include: { item: true } });
  return { title: p ? `${p.side === "BUY" ? "Buying" : "Selling"} ${p.item.name}` : "Post" };
}

const STATUS_LABEL = { OPEN: "Open", FILLED: "Filled", CANCELLED: "Cancelled", EXPIRED: "Expired", REMOVED: "Removed by a moderator" } as const;

export default async function PostPage({ params, searchParams }: Props) {
  await maybeCleanup();
  const { id } = await params;
  const chatWith = (await searchParams)?.chat;
  const [user, post] = await Promise.all([
    currentUser(),
    db.post.findUnique({
      where: { id },
      include: {
        user: true, item: true, currency: true, game: true,
        offers: { include: { user: true, trade: { select: { id: true } } }, orderBy: { createdAt: "desc" } },
        trades: { select: { id: true, status: true, quantity: true } },
      },
    }),
  ]);
  if (!post) notFound();

  const isOwner = user?.id === post.userId;
  const isStaff = user && user.role !== "PLAYER";
  const expired = post.status === "OPEN" && post.expiresAt < new Date();
  const status = expired ? "Expired" : STATUS_LABEL[post.status];
  const isOpen = post.status === "OPEN" && !expired;
  const left = post.quantity - post.filled;
  const specialActive = post.isSpecial && (!post.specialUntil || post.specialUntil > new Date());
  const [rep, stats] = await Promise.all([reputation([post.userId, ...post.offers.map((o) => o.userId)]), priceStats(post.itemId)]);
  const myOffers = post.offers.filter((o) => o.userId === user?.id);
  const visibleOffers = isOwner || isStaff ? post.offers : myOffers;
  const verb = post.side === "SELL" ? "Selling" : "Buying";

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-10">
      <div>
        <p className="eyebrow">
          <Link href={`/g/${post.game.slug}`} className="hover:text-ink">{post.game.name}</Link> ·{" "}
          <Link href={`/g/${post.game.slug}/i/${post.item.slug}`} className="hover:text-ink">{post.item.name}</Link>
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className={`side-tag side-${post.side}`}>{verb}</span>
          {specialActive && <span className="eyebrow !text-special-ink border border-special-rule bg-special rounded-[2px] px-1.5 py-px">Admin deal</span>}
          <span className="text-xs text-ink-3">
            {status} · posted {ago(post.createdAt)}
            {isOpen && (specialActive ? " · no expiry" : ` · closes ${post.expiresAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`)}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-3">
          <span className="num">{left.toLocaleString("en-US")}</span> × {post.item.name}
        </h1>
        <p className="mt-2 text-lg">
          <span className="num font-medium">{money(post.unitPrice, post.currency.symbol)}</span>
          <span className="text-ink-2"> per {post.item.unit} · </span>
          <span className="num text-ink-2">{money(post.unitPrice * left, post.currency.symbol)} total</span>
        </p>
        {stats && (
          <p className="text-sm text-ink-3 mt-1">
            30-day average {money(stats.avg, post.currency.symbol)} ·{" "}
            {post.unitPrice > stats.avg * 1.15 ? "priced above market" : post.unitPrice < stats.avg * 0.85 ? "priced below market" : "close to market"}
          </p>
        )}
        {post.notes && <blockquote className="mt-5 border-l-2 border-rule-strong pl-4 text-ink-2 leading-relaxed whitespace-pre-line">{post.notes}</blockquote>}

        <PostChat postId={post.id} ownerId={post.userId} ownerName={post.user.username} viewer={user} selected={chatWith} open={isOpen} />

        <section className="mt-10">
          <h2 className="eyebrow mb-3">{isOwner || isStaff ? `Offers (${post.offers.length})` : "Your offers"}</h2>
          {visibleOffers.length === 0 ? (
            <p className="text-sm text-ink-3">{isOwner ? "No offers yet." : "You haven't made an offer on this post."}</p>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {visibleOffers.map((o) => (
                <li key={o.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="num font-medium">{o.quantity.toLocaleString("en-US")} × {money(o.unitPrice, post.currency.symbol)}</span>
                      <Trader username={o.user.username} rep={rep.get(o.userId)} />
                      <span className="text-xs text-ink-3">{ago(o.createdAt)}</span>
                    </div>
                    {o.message && <p className="text-sm text-ink-2 mt-1">{o.message}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {o.status === "PENDING" && isOwner && isOpen && (
                      <>
                        <form action={acceptOffer.bind(null, o.id)}><SubmitButton className="btn btn-sm">Accept</SubmitButton></form>
                        <form action={declineOffer.bind(null, o.id)}><SubmitButton className="btn btn-ghost btn-sm">Decline</SubmitButton></form>
                      </>
                    )}
                    {o.status === "PENDING" && o.userId === user?.id && (
                      <form action={withdrawOffer.bind(null, o.id)}><SubmitButton className="btn btn-ghost btn-sm">Withdraw</SubmitButton></form>
                    )}
                    {o.status !== "PENDING" && <span className="text-xs text-ink-3 uppercase tracking-wider">{o.status.toLowerCase()}</span>}
                    {o.trade && (isOwner || o.userId === user?.id || isStaff) && (
                      <Link href={`/trade/${o.trade.id}`} className="btn btn-ghost btn-sm">Trade room →</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <div className="border border-rule-strong bg-card rounded-sm p-4">
          <p className="eyebrow mb-2">Posted by</p>
          <Trader username={post.user.username} rep={rep.get(post.userId)} />
          <p className="text-xs text-ink-3 mt-2">Member since {post.user.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
        </div>

        {isOpen && !isOwner && user && (
          <div className="border border-rule-strong rounded-sm p-4">
            <p className="font-medium">{post.side === "SELL" ? "Make an offer" : "Sell to this buyer"}</p>
            <ActionForm action={makeOffer} className="mt-3 space-y-3" resetOnOk>
              <input type="hidden" name="postId" value={post.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="o-qty">Quantity</label>
                  <input id="o-qty" name="quantity" type="number" min={1} max={left} defaultValue={left} className="field num" required />
                </div>
                <div>
                  <label className="label" htmlFor="o-price">Each ({post.currency.symbol})</label>
                  <input id="o-price" name="unitPrice" type="number" min={1} defaultValue={post.unitPrice} className="field num" required />
                </div>
              </div>
              <textarea name="message" rows={2} maxLength={280} className="field" placeholder="Optional note" />
              <SubmitButton className={`btn w-full ${post.side === "SELL" ? "btn-buy" : "btn-sell"}`} pendingText="Sending…">Send offer</SubmitButton>
            </ActionForm>
          </div>
        )}
        {isOpen && !user && (
          <Link href="/login" className="btn w-full">Log in to make an offer</Link>
        )}
        {isOwner && isOpen && (
          <form action={cancelPost.bind(null, post.id)}>
            <SubmitButton className="btn btn-ghost w-full">Close this post</SubmitButton>
          </form>
        )}

        {isStaff && (
          <div className="border border-special-rule bg-special rounded-sm p-4 space-y-3">
            <p className="eyebrow !text-special-ink">Staff</p>
            <form action={setSpecial} className="flex gap-2 items-end">
              <input type="hidden" name="postId" value={post.id} />
              <div className="flex-1">
                <label className="label" htmlFor="sp-days">Admin deal for</label>
                <select id="sp-days" name="days" className="field" defaultValue={specialActive ? "0" : "-1"}>
                  <option value="0">Off</option>
                  <option value="-1">Until removed</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <SubmitButton className="btn btn-sm h-[2.4rem]">Save</SubmitButton>
            </form>
            {specialActive && !post.specialUntil && <p className="text-xs text-special-ink">Pinned until staff remove it</p>}
            {specialActive && post.specialUntil && <p className="text-xs text-special-ink">Pinned until {post.specialUntil.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
            {post.status !== "REMOVED" && (
              <form action={removePost}>
                <input type="hidden" name="postId" value={post.id} />
                <SubmitButton className="btn btn-ghost btn-sm w-full">Remove post</SubmitButton>
              </form>
            )}
          </div>
        )}

        {user && !isOwner && <ReportForm targetType="post" targetId={post.id} label="Report this post" />}
      </aside>
    </div>
  );
}
