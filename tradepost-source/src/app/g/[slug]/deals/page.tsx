import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { activeSpecialWhere, postInclude, reputation, savedIdsFor } from "@/lib/queries";
import { isAdmin } from "@/lib/admins";
import { maybeCleanup } from "@/lib/cleanup";
import { PostGrid } from "@/components/post-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ type?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await db.game.findUnique({ where: { slug: (await params).slug } });
  return { title: game ? `Admin deals · ${game.name}` : "Admin deals" };
}

export default async function AdminDeals({ params, searchParams }: Props) {
  await maybeCleanup();
  const { slug } = await params;
  const { type } = await searchParams;
  const game = await db.game.findUnique({ where: { slug } });
  if (!game || !game.active) notFound();

  const [user, categories, deals] = await Promise.all([
    currentUser(),
    db.item.findMany({ where: { gameId: game.id }, distinct: ["category"], select: { category: true }, orderBy: { category: "desc" } }),
    db.post.findMany({
      where: { gameId: game.id, ...activeSpecialWhere(), ...(type ? { item: { category: type } } : {}) },
      include: postInclude,
      orderBy: [{ item: { name: "asc" } }, { unitPrice: "asc" }],
    }),
  ]);
  const counts = await db.post.groupBy({ by: ["itemId"], where: { gameId: game.id, ...activeSpecialWhere() }, _count: true });
  const itemCats = await db.item.findMany({ where: { id: { in: counts.map((c) => c.itemId) } }, select: { id: true, category: true } });
  const perCat = new Map<string, number>();
  for (const c of counts) {
    const cat = itemCats.find((i) => i.id === c.itemId)!.category;
    perCat.set(cat, (perCat.get(cat) ?? 0) + c._count);
  }
  const total = [...perCat.values()].reduce((a, b) => a + b, 0);
  const [rep, savedIds] = await Promise.all([reputation([...new Set(deals.map((p) => p.userId))]), savedIdsFor(user?.id)]);
  const isStaff = isAdmin(user);
  const tabs = [{ key: undefined, label: "All", n: total }, ...categories.map((c) => ({ key: c.category, label: c.category, n: perCat.get(c.category) ?? 0 }))];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] bg-special text-[#3d2c00] px-6 py-8 sm:px-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70"><Link href={`/g/${slug}`} className="hover:underline">{game.name}</Link> · Admin deals</p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">★ Admin deals</h1>
          <p className="mt-2 max-w-xl font-medium opacity-85">Deals picked or posted by the {game.name} staff. They stay up until staff take them down, unlike normal posts which close after a week.</p>
        </div>
        {isStaff && <Link href={`/post/new?game=${slug}&adminDeal=1`} className="btn btn-lg bg-[#3d2c00] text-white">+ Add an admin deal</Link>}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/g/${slug}/deals?type=${encodeURIComponent(t.key)}` : `/g/${slug}/deals`}
            className={`chip h-10 px-5 text-[0.95rem] ${type === t.key ? "chip-on" : ""}`}
          >
            {t.label} <span className="num text-xs opacity-60">{t.n}</span>
          </Link>
        ))}
      </div>

      <PostGrid
        posts={deals}
        rep={rep}
        savedIds={savedIds}
        empty={isStaff ? "No admin deals here yet. Pin any open post, or add one with the button above." : "No admin deals in this category right now."}
      />
    </div>
  );
}
