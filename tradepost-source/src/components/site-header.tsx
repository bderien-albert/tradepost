import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/admins";
import { logout } from "@/app/actions";
import { GameTabs } from "./game-tabs";
import { Logo, LogoMark } from "./logo";
import { Avatar } from "./avatar";

export async function SiteHeader() {
  const [user, games] = await Promise.all([
    currentUser(),
    db.game.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
  ]);

  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-rule">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-5">
        <Link href="/" className="shrink-0" aria-label="Tradepost home">
          <span className="hidden sm:inline"><Logo size={34} /></span>
          <span className="sm:hidden"><LogoMark size={34} /></span>
        </Link>

        <form action="/search" className="flex-1 max-w-xl">
          <label className="relative block">
            <span className="sr-only">Search items</span>
            <svg viewBox="0 0 24 24" width="18" height="18" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input name="q" placeholder="Search Phantom, Rukiryaxe, Lava…" className="w-full h-11 rounded-full bg-paper-2 pl-10 pr-4 text-[0.95rem] border-0 outline-none focus:bg-card focus:ring-2 focus:ring-brand/40 placeholder:text-ink-3" />
          </label>
        </form>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link href="/post/new" className="btn btn-brand hidden sm:inline-flex">+ Post</Link>
              <Link href="/post/new" className="btn btn-brand sm:hidden w-10 px-0" aria-label="Post a trade">+</Link>
              <Link href="/saved" className="hidden md:inline-flex w-10 h-10 rounded-full items-center justify-center hover:bg-paper-2" title="Saved" aria-label="Saved">
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
              </Link>
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-full p-0.5 hover:ring-2 hover:ring-rule-strong" aria-label="Account menu">
                  <Avatar user={user} size={38} />
                </summary>
                <div className="absolute right-0 mt-2 w-56 panel p-2 text-sm z-40">
                  <p className="px-3 py-2 font-bold truncate">{user.username}</p>
                  <MenuLink href={`/u/${user.username}`}>My profile</MenuLink>
                  <MenuLink href="/me">My trades &amp; chats</MenuLink>
                  <MenuLink href="/saved">Saved</MenuLink>
                  <MenuLink href="/settings">Settings</MenuLink>
                  <MenuLink href="/history">Trade history</MenuLink>
                  {isAdmin(user) && <MenuLink href="/admin">Admin panel</MenuLink>}
                  <form action={logout} className="border-t border-rule mt-1 pt-1">
                    <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-paper text-ink-2">Log out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm sm:h-10 sm:px-4">Log in</Link>
              <Link href="/signup" className="btn btn-brand btn-sm sm:h-10 sm:px-4">Sign up</Link>
            </>
          )}
        </nav>
      </div>
      {games.length > 0 && <GameTabs games={games} />}
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block px-3 py-2 rounded-xl hover:bg-paper">{children}</Link>;
}
