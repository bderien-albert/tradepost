import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, robloxLoginEnabled } from "@/lib/session";
import { login } from "@/app/auth-actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Log in with your Tradepost username and password.">
      <ActionForm action={login} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" name="username" className="field" autoComplete="username" autoCapitalize="none" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
        </div>
        <SubmitButton className="btn btn-brand btn-lg w-full" pendingText="Logging in…">Log in</SubmitButton>
      </ActionForm>
      {robloxLoginEnabled() && <a href="/api/auth/roblox" className="btn btn-ghost btn-lg w-full mt-3">Continue with Roblox</a>}
      <p className="mt-6 text-sm text-ink-2">New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-brand hover:underline underline-offset-4">Create an account</Link></p>
    </AuthShell>
  );
}
