import Link from "next/link";

export function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-3">new</span>;
  return <span className="num">{value.toFixed(1)}<span className="text-ink-3">/5</span></span>;
}

export function Trader({ username, rep }: { username: string; rep?: { stars: number | null; trades: number } }) {
  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <Link href={`/u/${username}`} className="font-medium hover:underline underline-offset-4">{username}</Link>
      {rep && (
        <span className="text-xs text-ink-2">
          <Stars value={rep.stars} /> · <span className="num">{rep.trades}</span> trades
        </span>
      )}
    </span>
  );
}
