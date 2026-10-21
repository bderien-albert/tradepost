import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { activeSpecialWhere, postInclude, reputation } from "@/lib/queries";
import { maybeCleanup } from "@/lib/cleanup";
import { PostTable } from "@/components/post-table";

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
  const rep = await reputation([...new Set(deals.map((p) => p.userId))]);
  const isStaff = user && user.role !== "PLAYER";
  const tabs = [{ key: undefined, label: "All", n: total }, ...categories.map((c) => ({ key: c.category, label: c.category, n: perCat.get(c.category) ?? 0 }))];

  return (
    <div>
      <p className="eyebrow"><Link href={`/g/${slug}`} className="hover:text-ink">{game.name}</Link> · Admin deals</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-1 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Admin deals</h1>
          <p className="text-ink-2 mt-2 max-w-2xl">Deals picked or posted by the {game.name} staff. They stay up until staff take them down, unlike normal posts which close after a week.</p>
        </div>
        {isStaff && <Link href={`/post/new?game=${slug}&adminDeal=1`} className="btn">Add an admin deal</Link>}
      </div>

      <div className="flex gap-6 border-b border-rule-strong mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/g/${slug}/deals?type=${encodeURIComponent(t.key)}` : `/g/${slug}/deals`}
            className={`pb-2.5 -mb-px border-b-2 text-sm whitespace-nowrap ${type === t.key ? "border-ink font-medium" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {t.label} <span className="num text-xs text-ink-3">{t.n}</span>
          </Link>
        ))}
      </div>

      <PostTable
        posts={deals}
        rep={rep}
        showSide
        empty={isStaff ? "No admin deals here yet. Pin any open post, or add one with the button above." : "No admin deals in this category right now."}
      />
    </div>
  );
}
