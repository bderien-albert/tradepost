import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { postInclude, reputation } from "@/lib/queries";
import { PostTable } from "@/components/post-table";
import { PostGrid } from "@/components/post-card";
import { ago, money } from "@/lib/format";
import { WEEK_MS } from "@/lib/cleanup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My trades" };

export default async function Me() {
  const user = await requireUser();
  const [active, posts, incoming, outgoing, past] = await Promise.all([
    db.trade.findMany({
      where: { status: { in: ["ACTIVE", "DISPUTED"] }, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: { item: true, currency: true, buyer: true, seller: true }, orderBy: { createdAt: "desc" },
    }),
    db.post.findMany({ where: { userId: user.id, status: "OPEN" }, include: postInclude, orderBy: { createdAt: "desc" } }),
    db.offer.findMany({ where: { status: "PENDING", post: { userId: user.id } }, include: { post: { include: { item: true, currency: true } }, user: true }, orderBy: { createdAt: "desc" } }),
    db.offer.findMany({ where: { userId: user.id }, include: { post: { include: { item: true, currency: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.post.findMany({ where: { userId: user.id, status: { not: "OPEN" } }, include: postInclude, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const rep = await reputation([user.id]);
  const chatRows = await db.postMessage.findMany({
    where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) }, OR: [{ participantId: user.id }, { post: { userId: user.id } }] },
    include: { post: { include: { item: true, user: { select: { username: true } } } }, participant: { select: { username: true } }, sender: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  const chats = new Map<string, (typeof chatRows)[number]>();
  for (const m of chatRows) {
    const key = `${m.postId}:${m.participantId}`;
    if (!chats.has(key)) chats.set(key, m);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">My trades</h1>
        <Link href="/post/new" className="btn">Post a trade</Link>
      </div>

      <Section title={`Needs you (${active.length + incoming.length})`}>
        {active.length + incoming.length === 0 ? (
          <Empty>Nothing waiting on you.</Empty>
        ) : (
          <ul className="panel divide-y divide-rule px-4">
            {active.map((t) => {
              const mine = t.buyerId === user.id ? t.buyerConfirmedAt : t.sellerConfirmedAt;
              const other = t.buyerId === user.id ? t.seller.username : t.buyer.username;
              return (
                <li key={t.id} className="py-3 flex flex-wrap items-center gap-3">
                  <span className="eyebrow w-24">{t.status === "DISPUTED" ? "Disputed" : mine ? "Waiting" : "Meet & confirm"}</span>
                  <span className="flex-1 text-sm"><span className="num">{t.quantity}</span> × {t.item.name} with <span className="font-medium">{other}</span> · <span className="num">{money(t.unitPrice * t.quantity, t.currency.symbol)}</span></span>
                  <Link href={`/trade/${t.id}`} className="btn btn-sm">Open trade room</Link>
                </li>
              );
            })}
            {incoming.map((o) => (
              <li key={o.id} className="py-3 flex flex-wrap items-center gap-3">
                <span className="eyebrow w-24">New offer</span>
                <span className="flex-1 text-sm"><span className="font-medium">{o.user.username}</span> offers <span className="num">{o.quantity} × {money(o.unitPrice, o.post.currency.symbol)}</span> for your {o.post.item.name} · {ago(o.createdAt)}</span>
                <Link href={`/post/${o.postId}`} className="btn btn-ghost btn-sm">Review</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Chats (${chats.size})`}>
        {chats.size === 0 ? <Empty>No chats this week. Messages delete after 7 days.</Empty> : (
          <ul className="panel divide-y divide-rule px-4 text-sm">
            {[...chats.values()].map((m) => {
              const mineIsOwner = m.post.userId === user.id;
              const other = mineIsOwner ? m.participant.username : m.post.user.username;
              const waiting = m.senderId !== user.id;
              return (
                <li key={m.id} className="py-2.5 flex flex-wrap items-center gap-3">
                  <span className={`eyebrow w-24 ${waiting ? "!text-sell" : ""}`}>{waiting ? "Reply" : "Sent"}</span>
                  <Link href={`/post/${m.postId}${mineIsOwner ? `?chat=${m.participantId}` : ""}#chat`} className="flex-1 min-w-0 hover:underline underline-offset-4">
                    <span className="font-medium">{other}</span> about {m.post.item.name}: <span className="text-ink-2">{m.body.length > 60 ? m.body.slice(0, 60) + "…" : m.body}</span>
                  </Link>
                  <span className="text-xs text-ink-3">{ago(m.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="My open posts">
        <PostGrid posts={posts} rep={rep} savedIds={new Set()} showGame empty="You have no open posts." />
      </Section>

      <Section title="Offers I sent">
        {outgoing.length === 0 ? <Empty>No offers sent yet.</Empty> : (
          <ul className="panel divide-y divide-rule px-4 text-sm">
            {outgoing.map((o) => (
              <li key={o.id} className="py-2.5 flex flex-wrap items-center gap-3">
                <span className="eyebrow w-24">{o.status.toLowerCase()}</span>
                <Link href={`/post/${o.postId}`} className="flex-1 hover:underline underline-offset-4"><span className="num">{o.quantity} × {money(o.unitPrice, o.post.currency.symbol)}</span> for {o.post.item.name}</Link>
                <span className="text-xs text-ink-3">{ago(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Past posts">
        <PostTable posts={past} rep={rep} showGame showSide empty="No past posts." />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-display text-xl font-extrabold tracking-tight mb-3">{title}</h2>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-3">{children}</p>;
}
