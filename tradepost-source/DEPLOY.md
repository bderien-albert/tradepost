# Publishing Tradepost for free

Total cost: $0. You get a free address like `tradepost-yourname.vercel.app`. A custom `.com` is optional (about $10 to $15 a year).

| Piece | Service | Free plan |
| --- | --- | --- |
| Code | GitHub | Free |
| Website hosting | Vercel (Hobby) | Free for non-commercial sites |
| Database | Neon Postgres, added from inside Vercel | Free, 0.5 GB (hundreds of thousands of trades) |
| Login | Roblox OAuth | Free |

## 1. Put the code on GitHub

Create a free account at github.com, make a new **empty** repository (for example `tradepost`), and push this folder to it. (Or ask Claude to push it once the repo exists.)

## 2. Create the site on Vercel

1. Go to vercel.com and **Sign up with GitHub** (pick the free Hobby plan).
2. **Add New → Project**, pick the `tradepost` repo, and click **Import**. Don't deploy yet.
3. Open **Environment Variables** and add:
   - `SESSION_SECRET` = a long random string (any 40+ random letters and numbers)
   - `DEMO_LOGIN` = `true` for now, so you can test before Roblox login is set up
4. Click **Deploy**. The first deploy fails because there's no database yet. That's expected.

## 3. Add the free database

1. In the Vercel project, open **Storage → Create Database → Neon (Serverless Postgres)** and choose the free plan.
2. Connect it to the project. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. Go to **Deployments**, open the latest one, and click **Redeploy**.

Each deploy runs the database migrations and adds the Lumber Tycoon 2 items automatically. Nothing is ever wiped.

Your site is now live at the address Vercel shows (e.g. `https://tradepost-yourname.vercel.app`). Log in with the test box; **the first account becomes admin**.

## 4. Turn on "Sign in with Roblox"

1. Go to https://create.roblox.com/dashboard/credentials → **OAuth 2.0 Apps → Create OAuth App**.
2. Name it, add your site URL, and set the redirect URL to `https://YOUR-SITE.vercel.app/api/auth/roblox/callback`.
3. Pick the scopes `openid` and `profile`.
4. Copy the **Client ID** and **Client Secret** into Vercel's Environment Variables as `ROBLOX_CLIENT_ID` and `ROBLOX_CLIENT_SECRET`. Also add `SITE_URL` = `https://YOUR-SITE.vercel.app`.
5. Optional: add `ADMIN_ROBLOX_IDS` = your Roblox user ID, so your real Roblox account is admin.
6. Set `DEMO_LOGIN` = `false` and redeploy. Now only real Roblox accounts can log in.

## 5. Optional: your own domain

Buy one from Cloudflare, Namecheap or Porkbun, then in Vercel open **Settings → Domains**, add it, and follow the two DNS records it shows. HTTPS is automatic. Update `SITE_URL` and the Roblox redirect URL to the new domain.

## Keeping it free

- Vercel's Hobby plan is for **non-commercial** sites. If you ever charge for admin specials or run ads, move to Vercel Pro ($20/month), or host elsewhere.
- Neon's free database pauses when idle and wakes in about a second on the next visit. It never deletes data.
- To back up, use Neon's dashboard (branches / restore) or run `pg_dump` against `DATABASE_URL_UNPOOLED`.

## Updating the site

Every push to the GitHub repo redeploys automatically.
