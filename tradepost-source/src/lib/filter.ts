// Roblox's terms forbid trading virtual items for real money, so posts, offers
// and chat reject anything that looks like a real-money deal or an off-site handoff.
const BLOCKED: [RegExp, string][] = [
  [/\b(paypal|venmo|cash\s?app|cashapp|zelle|stripe|crypto|bitcoin|btc|eth|usdt)\b/i, "payment services"],
  [/(\$\s?\d+(\.\d+)?\s?(usd|eur|gbp|dollars?|bucks))|(\b\d+\s?(usd|eur|gbp|dollars|euros|pounds)\b)/i, "real-money prices"],
  [/\b(real|irl)\s?(money|cash|currency)\b/i, "real money"],
  [/\brobux\b/i, "Robux"],
  [/\b(gift\s?cards?|giftcard)\b/i, "gift cards"],
  [/\b(sell(ing)?|buy(ing)?|trade|trading)\s+(my\s+)?accounts?\b/i, "account trading"],
  [/https?:\/\/|www\.|\.(gg|com|net|io|xyz)\b/i, "links"],
  [/discord(\.gg|app)?|\b\w{2,32}#\d{4}\b/i, "Discord handles"],
  [/\+?\d[\d\s().-]{8,}\d/, "phone numbers"],
];

export function checkText(text: string): string | null {
  for (const [re, label] of BLOCKED) {
    if (re.test(text)) return `Remove ${label}. Trades here are in-game currency or items only, and contact stays on the site.`;
  }
  return null;
}
