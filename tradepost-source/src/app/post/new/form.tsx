"use client";

import { useMemo, useState } from "react";
import { createPost } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ItemArt } from "@/components/item-art";
import { WOOD_SIZES } from "@/lib/sizes";

type Game = {
  slug: string; name: string;
  currencies: { id: string; name: string; symbol: string }[];
  items: { id: string; slug: string; name: string; category: string; unit: string }[];
};

export function NewPostForm({ games, initial, isStaff }: { games: Game[]; isStaff: boolean; initial: { game?: string; item?: string; side: "BUY" | "SELL"; adminDeal?: boolean } }) {
  const [adminDeal, setAdminDeal] = useState(isStaff && !!initial.adminDeal);
  const [gameSlug, setGameSlug] = useState(initial.game && games.some((g) => g.slug === initial.game) ? initial.game : games[0]?.slug);
  const game = games.find((g) => g.slug === gameSlug);
  const [side, setSide] = useState<"BUY" | "SELL">(initial.side);
  const [itemId, setItemId] = useState(() => game?.items.find((i) => i.slug === initial.item)?.id ?? "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const item = game?.items.find((i) => i.id === itemId);
  const wood = item?.category.toLowerCase() === "wood";
  const currency = game?.currencies[0];
  const total = Number(qty) * Number(price);

  const grouped = useMemo(() => {
    const m = new Map<string, Game["items"]>();
    for (const i of game?.items ?? []) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m.entries()];
  }, [game]);

  if (!game) return <p className="mt-6 text-sm">No games yet. An admin needs to add one first.</p>;

  return (
    <ActionForm action={createPost} className="mt-8 space-y-5">
      {item && (
        <div className="flex items-center gap-4 rounded-3xl bg-paper-2 p-3">
          <ItemArt item={item} size="sm" className="w-20 h-20 rounded-2xl shrink-0" />
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">{item.name}</p>
            <p className="text-sm text-ink-2">{item.category} · {game.name}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper-2 p-1" role="radiogroup">
        {(["SELL", "BUY"] as const).map((s) => (
          <label key={s} className={`cursor-pointer text-center py-2.5 rounded-full text-sm font-bold transition-colors ${side === s ? (s === "SELL" ? "bg-sell text-white shadow" : "bg-buy text-white shadow") : "text-ink-2 hover:text-ink"}`}>
            <input type="radio" name="side" value={s} checked={side === s} onChange={() => setSide(s)} className="sr-only" />
            {s === "SELL" ? "I'm selling" : "I'm buying"}
          </label>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="game">Game</label>
          <select id="game" className="field" value={gameSlug} onChange={(e) => { setGameSlug(e.target.value); setItemId(""); }}>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="itemId">Item</label>
          <select id="itemId" name="itemId" className="field" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            <option value="" disabled>Choose an item</option>
            {grouped.map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {wood && (
        <div>
          <span className="label">Wood size</span>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {WOOD_SIZES.map((w, i) => (
              <label key={w.key} className="cursor-pointer">
                <input type="radio" name="size" value={w.key} defaultChecked={i === 0} className="peer sr-only" />
                <span className="chip peer-checked:bg-ink peer-checked:text-paper peer-checked:shadow-none">{w.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <input type="hidden" name="currencyId" value={currency?.id ?? ""} />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="quantity">Quantity{item ? ` (${item.unit}s)` : ""}</label>
          <input id="quantity" name="quantity" type="number" min={1} inputMode="numeric" className="field num" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="unitPrice">{side === "BUY" ? "Paying" : "Asking"} per {item?.unit ?? "unit"} ({currency?.name})</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 num text-sm">{currency?.symbol}</span>
            <input id="unitPrice" name="unitPrice" type="number" min={1} inputMode="numeric" className="field num pl-7" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notes <span className="text-ink-3 font-normal">(optional)</span></label>
        <textarea id="notes" name="notes" rows={2} maxLength={280} className="field" placeholder="Times you're online, delivery on your plot, bulk discount…" />
        <p className="text-xs text-ink-3 mt-1">No links, Discord tags, Robux or real-money prices. They&apos;ll be blocked.</p>
      </div>

      {isStaff && (
        <label className="flex items-start gap-3 rounded-2xl bg-special-tint p-4 cursor-pointer">
          <input type="checkbox" name="adminDeal" checked={adminDeal} onChange={(e) => setAdminDeal(e.target.checked)} className="mt-1" />
          <span>
            <span className="block text-sm font-medium">Post as an admin deal</span>
            <span className="block text-xs text-ink-2">Pinned at the top of the board and listed on the Admin deals page. Doesn&apos;t expire.</span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-rule">
        <div>
          <label className="label" htmlFor="days">Keep it up for</label>
          {adminDeal ? (
            <p className="text-sm text-special-ink h-[2.4rem] flex items-center">Until staff remove it</p>
          ) : (
            <select id="days" name="days" className="field w-36" defaultValue="7">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days (max)</option>
            </select>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-3">Total</p>
          <p className="num font-display text-3xl font-extrabold text-brand">{currency?.symbol}{Number.isFinite(total) && total > 0 ? total.toLocaleString("en-US") : "0"}</p>
        </div>
      </div>

      <SubmitButton className={`btn btn-lg w-full ${side === "SELL" ? "btn-sell" : "btn-buy"}`} pendingText="Posting…">
        {side === "SELL" ? "Post listing" : "Post buy order"}
      </SubmitButton>
    </ActionForm>
  );
}
