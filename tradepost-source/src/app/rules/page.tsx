import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rules & safety" };

export default function Rules() {
  return (
    <article className="max-w-2xl">
      <p className="eyebrow">Read before trading</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Rules &amp; safety</h1>
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

      <h2 className="font-medium text-lg mt-10">Admin specials</h2>
      <p className="mt-3 text-ink-2 leading-relaxed">
        Rows marked <span className="eyebrow !text-special-ink border border-special-rule bg-special rounded-[2px] px-1.5 py-px">Admin special</span> are
        picked by the site team and pinned above normal results. They follow the same rules as every other post.
      </p>

      <h2 className="font-medium text-lg mt-10">Age</h2>
      <p className="mt-3 text-ink-2 leading-relaxed">You need to be 13 or older to use Tradepost.</p>
    </article>
  );
}
