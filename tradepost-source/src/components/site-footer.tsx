import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-paper-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <Logo size={30} />
          <p className="mt-3 text-sm text-ink-2 max-w-md leading-relaxed">
            A fan-made board for in-game currency and item trades. No real money, Robux or accounts change hands here.
            Not affiliated with Roblox Corporation or any game&apos;s developers.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-2 sm:justify-end content-start">
          <Link href="/rules" className="hover:text-ink">Rules &amp; safety</Link>
          <Link href="/history" className="hover:text-ink">All trades</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
