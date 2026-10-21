import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";

// Starts "Sign in with Roblox" (OAuth 2.0 + PKCE). Register the app at
// https://create.roblox.com/dashboard/credentials and set ROBLOX_CLIENT_ID / ROBLOX_CLIENT_SECRET.
export async function GET(req: Request) {
  const clientId = process.env.ROBLOX_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=roblox_off", req.url));

  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const origin = process.env.SITE_URL ?? new URL(req.url).origin;

  const url = new URL("https://apis.roblox.com/oauth/v1/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/roblox/callback`);
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  res.cookies.set("rbx_state", state, opts);
  res.cookies.set("rbx_verifier", verifier, opts);
  return res;
}
