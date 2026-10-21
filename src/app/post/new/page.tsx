import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { NewPostForm } from "./form";

export const metadata: Metadata = { title: "Post a trade" };

export default async function NewPost({ searchParams }: { searchParams: Promise<{ game?: string; item?: string; side?: string; adminDeal?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const games = await db.game.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true, name: true,
      currencies: { select: { id: true, name: true, symbol: true } },
      items: { select: { id: true, slug: true, name: true, category: true, unit: true }, orderBy: [{ category: "asc" }, { name: "asc" }] },
    },
  });
  return (
    <div className="max-w-xl">
      <p className="eyebrow">New post</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Post a trade</h1>
      <p className="text-ink-2 mt-2 text-sm leading-relaxed">
        Prices are in the game&apos;s own currency. Anyone can send an offer or chat with you; you pick which offer to accept, then you both meet in-game. Posts close after a week at most.
      </p>
      <NewPostForm games={games} isStaff={user.role !== "PLAYER"} initial={{ game: sp.game, item: sp.item, side: sp.side === "BUY" ? "BUY" : "SELL", adminDeal: sp.adminDeal === "1" }} />
    </div>
  );
}
