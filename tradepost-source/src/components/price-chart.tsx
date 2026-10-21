import { compact, shortDate } from "@/lib/format";

// Small hand-drawn line of completed-trade prices; one dot per trade.
export function PriceChart({ points, symbol }: { points: { t: number; p: number }[]; symbol: string }) {
  if (points.length < 2) return <p className="text-sm text-ink-3">Not enough trades yet to draw a price line.</p>;
  const W = 640, H = 180, L = 52, R = 12, T = 12, B = 26;
  const ts = points.map((d) => d.t), ps = points.map((d) => d.p);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const lo = Math.min(...ps), hi = Math.max(...ps);
  const pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const p0 = Math.max(0, lo - pad), p1 = hi + pad;
  const x = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (p: number) => T + (1 - (p - p0) / (p1 - p0)) * (H - T - B);
  const ticks = [p0, (p0 + p1) / 2, p1].map(Math.round);
  const d = points.map((pt, i) => `${i ? "L" : "M"}${x(pt.t).toFixed(1)},${y(pt.p).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Price of completed trades over the last 30 days">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeDasharray="2 3" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)">{compact(v, symbol)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
      {points.map((pt, i) => <circle key={i} cx={x(pt.t)} cy={y(pt.p)} r="2.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.25" />)}
      <text x={L} y={H - 6} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)">{shortDate(new Date(t0))}</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)">{shortDate(new Date(t1))}</text>
    </svg>
  );
}
