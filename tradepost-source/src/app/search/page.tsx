import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { openWhere, postInclude, reputation, savedIdsFor } from "@/lib/queries";
import { PostGrid } from "@/components/post-card";
import { ItemArt } from "@/components/item-art";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const user = await currentUser();
  const [items, posts, users, savedIds] = q
    ? await Promise.all([
        db.item.findMany({ where: { name: { contains: q, mode: "insensitive" } }, include: { game: true }, take: 12 }),
        db.post.findMany({
          where: { ...openWhere(), OR: [{ item: { name: { contains: q, mode: "insensitive" } } }, { notes: { contains: q, mode: "insensitive" } }] },
          include: postInclude, orderBy: [{ isSpecial: "desc" }, { createdAt: "desc" }], take: 40,
        }),
        db.user.findMany({ where: { username: { contains: q, mode: "insensitive" } }, take: 6 }),
        savedIdsFor(user?.id),
      ])
    : [[], [], [], new Set<string>()];
  const rep = await reputation([...new Set(posts.map((p) => p.userId))]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{q ? <>Results for “{q}”</> : "Search"}</h1>
      {!q && <p className="text-ink-2">Type an item, a note or a username in the search bar at the top.</p>}
      {items.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {items.map((i) => (
            <Link key={i.id} href={`/g/${i.game.slug}/i/${i.slug}`} className="panel flex items-center gap-3 pr-5 shrink-0 overflow-hidden hover:shadow-lift">
              <ItemArt item={i} size="sm" className="w-16 h-16" />
              <span><span className="block font-bold">{i.name}</span><span className="block text-xs text-ink-3">{i.game.name} · {i.category}</span></span>
            </Link>
          ))}
        </div>
      )}
      {users.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {users.map((u) => <Link key={u.id} href={`/u/${u.username}`} className="chip">@{u.username}</Link>)}
        </div>
      )}
      {q && <PostGrid posts={posts} rep={rep} savedIds={savedIds} showGame empty={`No open posts match “${q}”.`} />}
    </div>
  );
}
