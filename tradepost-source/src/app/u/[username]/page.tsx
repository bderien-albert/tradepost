import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { openWhere, postInclude, reputation, savedIdsFor } from "@/lib/queries";
import { isAdmin } from "@/lib/admins";
import { PostGrid } from "@/components/post-card";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { ReportForm } from "@/components/report-form";
import { Avatar } from "@/components/avatar";
import { ago } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).username) };
}

export default async function Profile({ params }: Props) {
  const username = decodeURIComponent((await params).username);
  const profile = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (!profile) notFound();
  const viewer = await currentUser();
  const isMe = viewer?.id === profile.id;

  const [posts, trades, ratings, rep, savedIds] = await Promise.all([
    db.post.findMany({ where: { userId: profile.id, ...openWhere() }, include: postInclude, orderBy: { createdAt: "desc" } }),
    db.trade.findMany({
      where: { status: "COMPLETED", OR: [{ buyerId: profile.id }, { sellerId: profile.id }] },
      include: tradeInclude, orderBy: { completedAt: "desc" }, take: 50,
    }),
    db.rating.findMany({ where: { toId: profile.id }, include: { from: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    reputation([profile.id]),
    savedIdsFor(viewer?.id),
  ]);
  const r = rep.get(profile.id)!;
  const color = profile.avatarColor ?? "#ff5a36";

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden">
        <div className="h-28 sm:h-36" style={{ background: color }} />
        <div className="px-6 sm:px-8 pb-6 -mt-12 flex flex-wrap items-end gap-5">
          <span className="rounded-full ring-[6px] ring-[var(--card)]"><Avatar user={profile} size={104} /></span>
          <div className="flex-1 min-w-[200px] pb-1">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight flex flex-wrap items-center gap-2">
              {profile.username}
              {isAdmin(profile) && <span className="deal-tag">Admin</span>}
              {profile.bannedAt && <span className="side-tag side-SELL">Banned</span>}
            </h1>
            <p className="text-sm text-ink-3">Joined {ago(profile.createdAt)}</p>
          </div>
          {isMe && <Link href="/settings" className="btn btn-ghost mb-1">Edit profile</Link>}
        </div>
        {profile.bio && <p className="px-6 sm:px-8 pb-6 text-ink-2 max-w-2xl leading-relaxed">{profile.bio}</p>}
        <dl className="grid grid-cols-3 border-t border-rule">
          <Stat label="Rating" value={r.stars != null ? `★ ${r.stars.toFixed(1)}` : "New"} />
          <Stat label="Trades" value={String(r.trades)} />
          <Stat label="Reviews" value={String(ratings.length)} />
        </dl>
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold tracking-tight mb-4">{isMe ? "My open posts" : "Open posts"}</h2>
        <PostGrid posts={posts} rep={rep} savedIds={savedIds} showGame empty={isMe ? "You have no open posts. Tap + Post to start." : "No open posts right now."} />
      </section>

      {ratings.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-extrabold tracking-tight mb-4">Reviews</h2>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ratings.map((x) => (
              <div key={x.id} className="panel p-4">
                <div className="flex items-center gap-2">
                  <Avatar user={x.from} size={28} />
                  <span className="font-bold text-sm">{x.from.username}</span>
                  <span className="ml-auto text-special-ink font-bold text-sm">{"★".repeat(x.stars)}<span className="text-rule-strong">{"★".repeat(5 - x.stars)}</span></span>
                </div>
                {x.comment && <p className="text-sm text-ink-2 mt-2">{x.comment}</p>}
                <p className="text-xs text-ink-3 mt-2">{ago(x.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel p-2 sm:p-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight px-3 pt-2 mb-2">Trade history</h2>
        <TradeList trades={trades} showGame empty="No completed trades yet." />
      </section>

      {viewer && !isMe && <ReportForm targetType="user" targetId={profile.id} label={`Report ${profile.username}`} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4 text-center sm:text-left border-r border-rule last:border-r-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-display text-2xl font-extrabold num mt-0.5">{value}</dd>
    </div>
  );
}
