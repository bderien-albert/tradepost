import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { logout } from "@/app/actions";
import { GameTabs } from "./game-tabs";

export async function SiteHeader() {
  const [user, games] = await Promise.all([
    currentUser(),
    db.game.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
  ]);

  return (
    <header className="border-b border-rule-strong bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-display text-[1.45rem] font-semibold tracking-tight leading-none">Tradepost</span>
          <span className="hidden sm:inline eyebrow">in-game only</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-ink-2">
          <Link href="/history" className="hover:text-ink">Trade history</Link>
          <Link href="/rules" className="hover:text-ink">Rules</Link>
          {user && user.role !== "PLAYER" && <Link href="/admin" className="hover:text-ink">Admin</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/me" className="hidden sm:inline text-sm text-ink-2 hover:text-ink">My trades</Link>
              <Link href="/post/new" className="btn btn-sm">Post a trade</Link>
              <Link href={`/u/${user.username}`} className="text-sm font-medium hover:underline underline-offset-4">{user.username}</Link>
              <form action={logout}>
                <button className="text-sm text-ink-3 hover:text-ink" title="Log out">Log out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-sm">Log in with Roblox</Link>
          )}
        </div>
      </div>
      {games.length > 0 && <GameTabs games={games} />}
    </header>
  );
}
