# Tradepost

A board where Roblox players post sell listings and buy orders for game items, priced in each game's own in-game currency, then meet in-game to swap. Every completed trade is stored for good and drives price history and player reputation. No real money, Robux or accounts are ever traded.

Starts with a Lumber Tycoon 2 tab; admins add more games and items from `/admin`.

## What's in it

- Game tabs with **For sale**, **Buy orders**, **Items & prices** and **Recent trades**
- **Admin specials**: staff pin up to 3 posts per board above the normal results, labelled like sponsored search results
- Offers and counter-prices, a trade room with chat, two-sided "trade done" confirmation, ratings
- Item pages with a 30-day price chart, profiles with full trade history, a public `/history` of every trade
- Reports, disputes, bans, roles and an audit log at `/admin`
- Filters that block real-money talk, Robux, links and Discord tags
- Sign in with Roblox (OAuth), plus an optional test login

Stack: Next.js 15, TypeScript, Tailwind CSS 4, Prisma, PostgreSQL.

## Run it on your computer

Needs Node.js 20+ and a Postgres database (a free Neon database works fine).

```bash
cp .env.example .env        # then fill in DATABASE_URL, DATABASE_URL_UNPOOLED, SESSION_SECRET
                            # set DEMO_LOGIN="true" and SEED_DEMO="true" to test without Roblox
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                 # http://localhost:3000
```

The first account to log in becomes the admin.

## Put it online for free

See [DEPLOY.md](DEPLOY.md).
