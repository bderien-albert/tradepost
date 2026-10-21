// Seeds the Lumber Tycoon 2 tab with items and, outside production, some demo
// players, posts and trade history so the board isn't empty while testing.
import { PrismaClient, WoodSize } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { ADMIN_USERNAMES } from "../src/lib/admins";

const db = new PrismaClient();

const LT2_ITEMS: [string, string, string, string][] = [
  ["Oak", "Wood", "Common", "log"],
  ["Birch", "Wood", "Common", "log"],
  ["Cherry", "Wood", "Common", "log"],
  ["Walnut", "Wood", "Uncommon", "log"],
  ["Koa", "Wood", "Uncommon", "log"],
  ["Pine", "Wood", "Common", "log"],
  ["Fir", "Wood", "Common", "log"],
  ["Palm", "Wood", "Uncommon", "log"],
  ["Snow Glow", "Wood", "Rare", "log"],
  ["Frost", "Wood", "Rare", "log"],
  ["Lava", "Wood", "Rare", "log"],
  ["Gold Swampy", "Wood", "Rare", "log"],
  ["Zombie", "Wood", "Rare", "log"],
  ["Spook", "Wood", "Limited", "log"],
  ["Sinister", "Wood", "Limited", "log"],
  ["Phantom", "Wood", "Very rare", "log"],
  ["Cavecrawler", "Wood", "Very rare", "log"],
  ["Silver Axe", "Axes", "Common", "axe"],
  ["Fire Axe", "Axes", "Rare", "axe"],
  ["Beesaxe", "Axes", "Rare", "axe"],
  ["Rukiryaxe", "Axes", "Very rare", "axe"],
  ["End Times Axe", "Axes", "Very rare", "axe"],
  ["Candy Cane Axe", "Axes", "Limited", "axe"],
  ["Bluesteel Axe", "Axes", "Uncommon", "axe"],
];

const BASE_PRICE: Record<string, number> = {
  Oak: 120, Birch: 150, Cherry: 140, Walnut: 260, Koa: 300, Pine: 110, Fir: 110, Palm: 340,
  "Snow Glow": 1400, Frost: 1800, Lava: 2600, "Gold Swampy": 3200, Zombie: 2200,
  Spook: 9000, Sinister: 14000, Phantom: 22000, Cavecrawler: 18000,
  "Silver Axe": 2000, "Fire Axe": 15000, Beesaxe: 45000, Rukiryaxe: 120000,
  "End Times Axe": 250000, "Candy Cane Axe": 60000, "Bluesteel Axe": 9000,
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const game = await db.game.upsert({
    where: { slug: "lumber-tycoon-2" },
    update: {},
    create: {
      name: "Lumber Tycoon 2",
      slug: "lumber-tycoon-2",
      robloxPlaceId: "13822889",
      blurb: "Logs, planks and axes, paid in Money ($). Deliveries happen on either player's plot.",
      sortOrder: 0,
      currencies: { create: { name: "Money", symbol: "$" } },
    },
    include: { currencies: true },
  });
  for (const [name, category, rarity, unit] of LT2_ITEMS) {
    await db.item.upsert({
      where: { gameId_slug: { gameId: game.id, slug: slug(name) } },
      update: {},
      create: { gameId: game.id, name, slug: slug(name), category, rarity, unit },
    });
  }

  await seedAdmins();

  if (process.env.SEED_DEMO !== "true") return;
  if ((await db.trade.count()) > 0) return;

  const currency = game.currencies[0];
  const names = ["woodcutter_jen", "PlankBaron", "axe_mike22", "SwampKing", "lumberlou", "phantom_hunter", "birchbuddy", "tycoonTess"];
  const users = [];
  for (const [i, n] of names.entries()) {
    users.push(await db.user.upsert({
      where: { username: n },
      update: {},
      create: { username: n, displayName: n, robloxUserId: `demo-${n.toLowerCase()}`, createdAt: new Date(Date.now() - (60 + i * 9) * 86400_000) },
    }));
  }
  const items = await db.item.findMany({ where: { gameId: game.id } });
  const SIZES: WoodSize[] = ["SMALL", "MEDIUM", "BIG", "SMALL_TRUCKLOAD", "LONG_TRUCKLOAD"];
  const sizeFor = (it: { category: string }) => (it.category === "Wood" ? SIZES[Math.floor(rand() * SIZES.length)] : null);
  let r = 7;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const day = 86400_000;

  // History: completed trades over the last 30 days.
  for (let i = 0; i < 200; i++) {
    const item = items[i % items.length];
    const base = BASE_PRICE[item.name] ?? 500;
    const drift = 1 + (i / 200) * 0.12;
    const price = Math.round(base * drift * (0.85 + rand() * 0.3));
    const [seller, buyer] = [pick(users), pick(users)];
    if (seller.id === buyer.id) continue;
    const qty = item.unit === "axe" ? 1 : Math.ceil(rand() * 12);
    const when = new Date(Date.now() - (30 - (i / 200) * 30) * day + rand() * day * 0.5);
    const post = await db.post.create({
      data: {
        userId: seller.id, gameId: game.id, itemId: item.id, side: "SELL", quantity: qty, filled: qty, size: sizeFor(item),
        unitPrice: price, currencyId: currency.id, status: "FILLED", expiresAt: new Date(when.getTime() + 7 * day), createdAt: new Date(when.getTime() - day),
      },
    });
    const trade = await db.trade.create({
      data: {
        postId: post.id, buyerId: buyer.id, sellerId: seller.id, itemId: item.id, size: post.size, quantity: qty, unitPrice: price,
        currencyId: currency.id, status: "COMPLETED", buyerConfirmedAt: when, sellerConfirmedAt: when, completedAt: when, createdAt: new Date(when.getTime() - 3600_000),
      },
    });
    if (rand() > 0.3) await db.rating.create({ data: { tradeId: trade.id, fromId: buyer.id, toId: seller.id, stars: rand() > 0.15 ? 5 : 4, createdAt: when } });
    if (rand() > 0.4) await db.rating.create({ data: { tradeId: trade.id, fromId: seller.id, toId: buyer.id, stars: rand() > 0.2 ? 5 : 4, createdAt: when } });
  }

  // Open board.
  const woodNotes = ["Delivered to your plot", "Online most evenings", "Bulk discount over 10", null, null, "Fresh cut, full length", null];
  const axeNotes = ["Online most evenings", "Can show it in-game first", null, null];
  for (let i = 0; i < 34; i++) {
    const item = pick(items);
    const side = rand() > 0.45 ? "SELL" : "BUY";
    const base = BASE_PRICE[item.name] ?? 500;
    const price = Math.round(base * 1.1 * (side === "SELL" ? 1 + rand() * 0.2 : 0.85 + rand() * 0.15));
    await db.post.create({
      data: {
        userId: pick(users).id, gameId: game.id, itemId: item.id, side, quantity: item.unit === "axe" ? 1 : Math.ceil(rand() * 20), size: sizeFor(item),
        unitPrice: price, currencyId: currency.id, notes: pick(item.unit === "axe" ? axeNotes : woodNotes), expiresAt: new Date(Date.now() + (1 + rand() * 5) * day),
        createdAt: new Date(Date.now() - rand() * 2 * day),
      },
    });
  }
  const phantom = items.find((i) => i.name === "Phantom")!;
  await db.post.create({
    data: {
      userId: users[1].id, gameId: game.id, itemId: phantom.id, side: "SELL", quantity: 25, size: "LONG_TRUCKLOAD", unitPrice: 21500, currencyId: currency.id,
      notes: "Weekend sale, delivered to your plot", isSpecial: true, expiresAt: new Date("2100-01-01T00:00:00Z"),
    },
  });
  const sinister = items.find((i) => i.name === "Sinister")!;
  await db.post.create({
    data: {
      userId: users[3].id, gameId: game.id, itemId: sinister.id, side: "BUY", quantity: 40, size: "BIG", unitPrice: 14500, currencyId: currency.id,
      notes: "Buying in bulk all week", isSpecial: true, expiresAt: new Date("2100-01-01T00:00:00Z"),
    },
  });
  const deals: [string, "BUY" | "SELL", number, number, string][] = [
    ["Rukiryaxe", "SELL", 1, 115000, "Staff price, one only"],
    ["Fire Axe", "SELL", 2, 14000, "Below market this week"],
    ["Gold Swampy", "BUY", 30, 3600, "Staff buying, any amount"],
  ];
  const admin = await db.user.findFirstOrThrow({ where: { username: { equals: ADMIN_USERNAMES[1], mode: "insensitive" } } });
  for (const [name, side, quantity, unitPrice, notes] of deals) {
    const item = items.find((i) => i.name === name)!;
    await db.post.create({
      data: { userId: admin.id, gameId: game.id, itemId: item.id, side, quantity, size: sizeFor(item), unitPrice, currencyId: currency.id, notes, isSpecial: true, expiresAt: new Date("2100-01-01T00:00:00Z") },
    });
  }
}

// Only the accounts named in src/lib/admins.ts are admins. Their first password
// comes from the ADMIN_PASSWORD environment variable and is never overwritten,
// so a password changed later on the site sticks.
async function seedAdmins() {
  await db.user.updateMany({
    where: { role: { not: "PLAYER" }, NOT: { username: { in: ADMIN_USERNAMES, mode: "insensitive" } } },
    data: { role: "PLAYER" },
  });
  const initial = process.env.ADMIN_PASSWORD;
  for (const name of ADMIN_USERNAMES) {
    const existing = await db.user.findFirst({ where: { username: { equals: name, mode: "insensitive" } } });
    const passwordHash = !existing?.passwordHash && initial ? await hashPassword(initial) : undefined;
    if (existing) {
      await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN", ...(passwordHash ? { passwordHash } : {}) } });
    } else {
      await db.user.create({ data: { username: name, displayName: name, role: "ADMIN", avatarColor: "#ff5a36", passwordHash } });
    }
  }
  if (!initial) console.warn("ADMIN_PASSWORD is not set: admin accounts without a password can't log in yet.");
}

main().finally(() => db.$disconnect());
