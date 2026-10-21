import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule-strong mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-ink-3 flex flex-col sm:flex-row gap-3 sm:justify-between">
        <p className="max-w-xl leading-relaxed">
          Tradepost is a fan-made board for in-game currency and item trades. No real money, Robux or accounts change hands here.
          Not affiliated with Roblox Corporation or any game&apos;s developers.
        </p>
        <div className="flex gap-4 shrink-0">
          <Link href="/rules" className="hover:text-ink">Rules &amp; safety</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/history" className="hover:text-ink">All trades</Link>
        </div>
      </div>
    </footer>
  );
}
