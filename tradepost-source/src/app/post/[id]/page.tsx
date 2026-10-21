import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { reputation, priceStats } from "@/lib/queries";
import { ago, money } from "@/lib/format";
import { acceptOffer, cancelPost, declineOffer, makeOffer, removePost, setSpecial, toggleSave, withdrawOffer } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Stars } from "@/components/trader";
import { ItemArt } from "@/components/item-art";
import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admins";
import { sizeLabel } from "@/lib/sizes";
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
  const isStaff = isAdmin(user);
  const expired = post.status === "OPEN" && post.expiresAt < new Date();
  const status = expired ? "Expired" : STATUS_LABEL[post.status];
  const isOpen = post.status === "OPEN" && !expired;
  const left = post.quantity - post.filled;
  const specialActive = post.isSpecial && (!post.specialUntil || post.specialUntil > new Date());
  const [rep, stats] = await Promise.all([reputation([post.userId, ...post.offers.map((o) => o.userId)]), priceStats(post.itemId)]);
  const myOffers = post.offers.filter((o) => o.userId === user?.id);
  const visibleOffers = isOwner || isStaff ? post.offers : myOffers;
  const verb = post.side === "SELL" ? "Selling" : "Buying";
  const size = sizeLabel(post.size);
  const saved = user ? !!(await db.savedPost.findUnique({ where: { userId_postId: { userId: user.id, postId: post.id } } })) : false;
  const r = rep.get(post.userId);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        <div className="relative">
          <ItemArt item={post.item} size="lg" className="rounded-[32px] aspect-[4/3] lg:aspect-auto lg:h-full min-h-[280px]" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className={`side-tag side-${post.side} h-7 px-3 text-xs shadow-sm`}>{verb}</span>
            {specialActive && <span className="deal-tag h-7 px-3 text-xs shadow-sm">★ Admin deal</span>}
          </div>
          {size && <span className="absolute left-4 bottom-4 rounded-full bg-black/55 text-white text-sm font-bold px-3.5 py-1.5 backdrop-blur-sm">{size}</span>}
        </div>

        <div className="panel p-6 sm:p-8 space-y-5">
          <div>
            <p className="eyebrow">
              <Link href={`/g/${post.game.slug}`} className="hover:text-ink">{post.game.name}</Link> ·{" "}
              <Link href={`/g/${post.game.slug}/i/${post.item.slug}`} className="hover:text-ink">{post.item.name}</Link>
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              <span className="num">{left.toLocaleString("en-US")}</span> × {post.item.name}{size ? <span className="text-ink-3"> · {size}</span> : null}
            </h1>
            <p className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-4xl font-extrabold text-brand num">{money(post.unitPrice, post.currency.symbol)}</span>
              <span className="text-ink-2 font-semibold">per {post.item.unit} · <span className="num">{money(post.unitPrice * left, post.currency.symbol)}</span> total</span>
            </p>
            {stats && (
              <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${post.unitPrice > stats.avg * 1.15 ? "bg-sell-tint text-sell" : post.unitPrice < stats.avg * 0.85 ? "bg-buy-tint text-buy" : "bg-paper-2 text-ink-2"}`}>
                30-day avg {money(stats.avg, post.currency.symbol)} · {post.unitPrice > stats.avg * 1.15 ? "above market" : post.unitPrice < stats.avg * 0.85 ? "below market" : "close to market"}
              </p>
            )}
            <p className="mt-2 text-xs text-ink-3">
              {status} · posted {ago(post.createdAt)}
              {isOpen && (specialActive ? " · no expiry" : ` · closes ${post.expiresAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`)}
            </p>
          </div>

          {post.notes && <p className="rounded-2xl bg-paper px-4 py-3 text-ink-2 whitespace-pre-line">“{post.notes}”</p>}

          <Link href={`/u/${post.user.username}`} className="flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 hover:bg-paper transition-colors">
            <Avatar user={post.user} size={44} />
            <span className="min-w-0">
              <span className="block font-bold truncate">{post.user.username}</span>
              <span className="block text-xs text-ink-2">
                {r?.stars != null ? <>★ <Stars value={r.stars} /></> : "New trader"} · <span className="num">{r?.trades ?? 0}</span> trades · joined {post.user.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </span>
            <span className="ml-auto text-ink-3">→</span>
          </Link>

          {isOpen && !isOwner && user && (
            <ActionForm action={makeOffer} className="space-y-3" resetOnOk>
              <input type="hidden" name="postId" value={post.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="o-qty">Quantity</label>
                  <input id="o-qty" name="quantity" type="number" min={1} max={left} defaultValue={left} className="field num" required />
                </div>
                <div>
                  <label className="label" htmlFor="o-price">Your price each ({post.currency.symbol})</label>
                  <input id="o-price" name="unitPrice" type="number" min={1} defaultValue={post.unitPrice} className="field num" required />
                </div>
              </div>
              <input name="message" maxLength={280} className="field" placeholder="Add a note (optional)" />
              <SubmitButton className={`btn btn-lg w-full ${post.side === "SELL" ? "btn-buy" : "btn-sell"}`} pendingText="Sending…">
                {post.side === "SELL" ? "Make an offer" : "Offer to sell"}
              </SubmitButton>
            </ActionForm>
          )}
          {isOpen && !user && <Link href={`/login?next=/post/${post.id}`} className="btn btn-brand btn-lg w-full">Log in to make an offer</Link>}

          <div className="flex flex-wrap gap-2">
            <form action={toggleSave.bind(null, post.id)}>
              <SubmitButton className={`btn ${saved ? "btn-brand" : "btn-ghost"}`}>{saved ? "♥ Saved" : "♡ Save"}</SubmitButton>
            </form>
            {!isOwner && <a href="#chat" className="btn btn-ghost">Chat with {post.user.username}</a>}
            {isOwner && isOpen && (
              <form action={cancelPost.bind(null, post.id)}>
                <SubmitButton className="btn btn-ghost">Close this post</SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight mb-3">{isOwner || isStaff ? `Offers (${post.offers.length})` : "Your offers"}</h2>
            {visibleOffers.length === 0 ? (
              <p className="text-sm text-ink-3">{isOwner ? "No offers yet." : "You haven't made an offer on this post."}</p>
            ) : (
              <ul className="space-y-2">
                {visibleOffers.map((o) => (
                  <li key={o.id} className="rounded-2xl bg-paper px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Avatar user={o.user} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold num">{o.quantity.toLocaleString("en-US")} × {money(o.unitPrice, post.currency.symbol)}</p>
                      <p className="text-xs text-ink-2">{o.user.username} · {ago(o.createdAt)}</p>
                      {o.message && <p className="text-sm text-ink-2 mt-1">{o.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {o.status === "PENDING" && isOwner && isOpen && (
                        <>
                          <form action={acceptOffer.bind(null, o.id)}><SubmitButton className="btn btn-buy btn-sm">Accept</SubmitButton></form>
                          <form action={declineOffer.bind(null, o.id)}><SubmitButton className="btn btn-ghost btn-sm">Decline</SubmitButton></form>
                        </>
                      )}
                      {o.status === "PENDING" && o.userId === user?.id && (
                        <form action={withdrawOffer.bind(null, o.id)}><SubmitButton className="btn btn-ghost btn-sm">Withdraw</SubmitButton></form>
                      )}
                      {o.status !== "PENDING" && <span className="text-xs font-bold text-ink-3 uppercase tracking-wider">{o.status.toLowerCase()}</span>}
                      {o.trade && (isOwner || o.userId === user?.id || isStaff) && (
                        <Link href={`/trade/${o.trade.id}`} className="btn btn-sm">Trade room →</Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isStaff && (
            <section className="rounded-3xl bg-special-tint p-5 space-y-3">
              <p className="eyebrow !text-special-ink">Admin</p>
              <form action={setSpecial} className="flex gap-2 items-end">
                <input type="hidden" name="postId" value={post.id} />
                <div className="flex-1">
                  <label className="label" htmlFor="sp-days">Admin deal</label>
                  <select id="sp-days" name="days" className="field" defaultValue={specialActive ? "0" : "-1"}>
                    <option value="0">Off</option>
                    <option value="-1">Until removed</option>
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
                <SubmitButton className="btn h-[2.75rem]">Save</SubmitButton>
              </form>
              {specialActive && <p className="text-xs text-special-ink font-semibold">{post.specialUntil ? `Pinned until ${post.specialUntil.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Pinned until an admin removes it"}</p>}
              {post.status !== "REMOVED" && (
                <form action={removePost}>
                  <input type="hidden" name="postId" value={post.id} />
                  <SubmitButton className="btn btn-ghost btn-sm">Remove post</SubmitButton>
                </form>
              )}
            </section>
          )}

          {user && !isOwner && <ReportForm targetType="post" targetId={post.id} label="Report this post" />}
        </div>

        <div className="min-w-0 -mt-10 lg:mt-0">
          <PostChat postId={post.id} ownerId={post.userId} ownerName={post.user.username} viewer={user} selected={chatWith} open={isOpen} />
        </div>
      </div>
    </div>
  );
}
