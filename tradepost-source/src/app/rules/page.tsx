import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rules & safety" };

export default function Rules() {
  return (
    <article className="max-w-2xl">
      <p className="eyebrow">Read before trading</p>
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">Rules &amp; safety</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Tradepost only connects players who want to swap items for in-game currency, or items for items. The trade itself always happens inside the game.
      </p>

      <h2 className="font-medium text-lg mt-10">Not allowed</h2>
      <ul className="mt-3 space-y-2 text-ink-2 list-disc pl-5">
        <li>Real money in any form: cash, PayPal, gift cards, crypto, or prices in dollars or euros.</li>
        <li>Robux, and anything bought with Robux traded for real money.</li>
        <li>Buying, selling or sharing Roblox accounts.</li>
        <li>Links, Discord tags or phone numbers. Keep contact in the trade room.</li>
        <li>Scams, fake listings, or posting items you don&apos;t have.</li>
        <li>Breaking the game&apos;s own rules or Roblox&apos;s Terms of Use and Community Standards.</li>
      </ul>

      <h2 className="font-medium text-lg mt-10">Trading safely</h2>
      <ol className="mt-3 space-y-2 text-ink-2 list-decimal pl-5">
        <li>Check the other player&apos;s rating and trade count first.</li>
        <li>Only meet the Roblox account whose username matches their Tradepost profile.</li>
        <li>For big trades, split it into smaller rounds.</li>
        <li>Only press Confirm after the swap is done in-game.</li>
        <li>If something goes wrong, open a dispute from the trade room. Moderators see the chat.</li>
      </ol>

      <h2 className="font-medium text-lg mt-10">Time limits</h2>
      <ul className="mt-3 space-y-2 text-ink-2 list-disc pl-5">
        <li>Posts close after at most 7 days. Post again if you still want to trade.</li>
        <li>Chat messages are deleted 7 days after they&apos;re sent.</li>
        <li>A trade still open after 7 days is closed: finalized if either player confirmed it, cancelled if neither did.</li>
        <li>Completed trades, ratings and prices are kept for good.</li>
      </ul>

      <h2 className="font-medium text-lg mt-10">Admin deals</h2>
      <p className="mt-3 text-ink-2 leading-relaxed">
        Rows marked <span className="deal-tag">★ Admin deal</span> are
        picked or posted by the site team. They&apos;re pinned above normal results, listed on each game&apos;s Admin deals page, and stay up until staff remove them. Otherwise they follow the same rules as every other post.
      </p>

      <h2 className="font-medium text-lg mt-10">Age</h2>
      <p className="mt-3 text-ink-2 leading-relaxed">You need to be 13 or older to use Tradepost.</p>
    </article>
  );
}
