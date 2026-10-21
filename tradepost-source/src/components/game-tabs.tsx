"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function GameTabs({ games }: { games: { name: string; slug: string }[] }) {
  const path = usePathname();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 flex gap-2 overflow-x-auto no-scrollbar">
      <Link href="/" className={`chip h-8 ${path === "/" ? "chip-on" : ""}`}>For you</Link>
      {games.map((g) => {
        const active = path.startsWith(`/g/${g.slug}`);
        return (
          <Link key={g.slug} href={`/g/${g.slug}`} className={`chip h-8 ${active ? "chip-on" : ""}`}>
            {g.name}
          </Link>
        );
      })}
      <Link href="/history" className={`chip h-8 ${path === "/history" ? "chip-on" : ""}`}>Trade history</Link>
      <Link href="/rules" className={`chip h-8 ${path === "/rules" ? "chip-on" : ""}`}>Rules</Link>
    </div>
  );
}
