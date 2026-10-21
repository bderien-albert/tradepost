export function money(n: number, symbol: string) {
  return `${symbol}${n.toLocaleString("en-US")}`;
}

export function compact(n: number, symbol: string) {
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) => `${symbol}${(Math.round(v * 10) / 10).toString()}${s}`;
  if (abs >= 1_000_000) return fmt(n / 1_000_000, "M");
  if (abs >= 10_000) return fmt(n / 1_000, "k");
  return money(n, symbol);
}

export function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 60) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
