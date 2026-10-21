import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { openWhere, postInclude, reputation } from "@/lib/queries";
import { PostTable } from "@/components/post-table";
import { TradeList, tradeInclude } from "@/components/trade-list";
import { Stars } from "@/components/trader";
import { ReportForm } from "@/components/report-form";
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

  const [posts, trades, ratings, rep] = await Promise.all([
    db.post.findMany({ where: { userId: profile.id, ...openWhere() }, include: postInclude, orderBy: { createdAt: "desc" } }),
    db.trade.findMany({
      where: { status: "COMPLETED", OR: [{ buyerId: profile.id }, { sellerId: profile.id }] },
      include: tradeInclude, orderBy: { completedAt: "desc" }, take: 50,
    }),
    db.rating.findMany({ where: { toId: profile.id }, include: { from: { select: { username: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    reputation([profile.id]),
  ]);
  const r = rep.get(profile.id)!;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-sm border border-rule-strong bg-card" />
          ) : (
            <div className="w-16 h-16 rounded-sm border border-rule-strong bg-card flex items-center justify-center font-display text-2xl">{profile.username[0]?.toUpperCase()}</div>
          )}
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{profile.username}</h1>
            <p className="text-sm text-ink-3 mt-0.5">
              Joined {ago(profile.createdAt)}
              {profile.role !== "PLAYER" && <span className="ml-2 eyebrow !text-ink-2">{profile.role === "ADMIN" ? "Admin" : "Moderator"}</span>}
              {profile.bannedAt && <span className="ml-2 text-sell">Banned</span>}
            </p>
          </div>
        </div>
        <dl className="flex gap-8">
          <div><dt className="eyebrow">Rating</dt><dd className="text-2xl mt-1"><Stars value={r.stars} /></dd></div>
          <div><dt className="eyebrow">Trades</dt><dd className="num text-2xl mt-1">{r.trades}</dd></div>
          <div><dt className="eyebrow">Reviews</dt><dd className="num text-2xl mt-1">{ratings.length}</dd></div>
        </dl>
      </div>

      <section>
        <h2 className="eyebrow mb-3">Open posts</h2>
        <PostTable posts={posts} rep={rep} showGame showSide empty="No open posts." />
      </section>

      {ratings.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Reviews</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {ratings.map((x) => (
              <li key={x.id} className="border border-rule rounded-sm p-3 bg-card">
                <p className="text-sm"><span className="num font-medium">{x.stars}/5</span> <span className="text-ink-3">from {x.from.username} · {ago(x.createdAt)}</span></p>
                {x.comment && <p className="text-sm text-ink-2 mt-1">{x.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Trade history</h2>
        <TradeList trades={trades} showGame empty="No completed trades yet." />
      </section>

      {viewer && viewer.id !== profile.id && <ReportForm targetType="user" targetId={profile.id} label={`Report ${profile.username}`} />}
    </div>
  );
}
