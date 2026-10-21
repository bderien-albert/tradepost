"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function GameTabs({ games }: { games: { name: string; slug: string }[] }) {
  const path = usePathname();
  return (
    <div className="border-t border-rule">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {games.map((g) => {
          const active = path.startsWith(`/g/${g.slug}`);
          return (
            <Link
              key={g.slug}
              href={`/g/${g.slug}`}
              className={`whitespace-nowrap px-3 py-2.5 text-sm border-b-2 -mb-px ${
                active ? "border-ink text-ink font-medium" : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {g.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
