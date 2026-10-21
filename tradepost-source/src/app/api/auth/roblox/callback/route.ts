import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("rbx_state")?.value;
  const verifier = req.cookies.get("rbx_verifier")?.value;
  if (!code || !state || state !== savedState || !verifier) return fail("state");

  const origin = process.env.SITE_URL ?? req.nextUrl.origin;
  const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: `${origin}/api/auth/roblox/callback`,
      client_id: process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
    }),
  });
  if (!tokenRes.ok) return fail("token");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return fail("profile");
  const info = (await infoRes.json()) as { sub: string; preferred_username?: string; nickname?: string; name?: string; picture?: string };
  const username = info.preferred_username ?? info.nickname ?? `user${info.sub}`;

  const existingCount = await db.user.count();
  const user = await db.user.upsert({
    where: { robloxUserId: info.sub },
    // Usernames can change on Roblox, so refresh them on every login.
    update: { username, displayName: info.nickname ?? username, avatarUrl: info.picture ?? null },
    create: {
      robloxUserId: info.sub,
      username,
      displayName: info.nickname ?? username,
      avatarUrl: info.picture ?? null,
      role: existingCount === 0 || process.env.ADMIN_ROBLOX_IDS?.split(",").includes(info.sub) ? "ADMIN" : "PLAYER",
    },
  });
  await startSession(user.id);
  const res = NextResponse.redirect(new URL(user.bannedAt ? "/banned" : "/", req.url));
  res.cookies.delete("rbx_state");
  res.cookies.delete("rbx_verifier");
  return res;
}
