import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { signup } from "@/app/auth-actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Sign up" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <AuthShell title="Create your account" subtitle="Use your Roblox username so the people you trade with can find you in-game. Never use your Roblox password here.">
      <ActionForm action={signup} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <div>
          <label className="label" htmlFor="username">Roblox username</label>
          <input id="username" name="username" className="field" autoComplete="username" autoCapitalize="none" pattern="[A-Za-z0-9_]{3,20}" required />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Repeat it</label>
            <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        <p className="text-xs text-ink-3 -mt-1">At least 8 characters, with letters and a number.</p>
        <label className="flex items-start gap-2.5 text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" name="age" className="mt-0.5 w-4 h-4 accent-[var(--brand)]" required />
          <span>I&apos;m 13 or older and I agree to the <Link href="/rules" className="font-bold underline underline-offset-2">rules</Link>.</span>
        </label>
        <SubmitButton className="btn btn-brand btn-lg w-full" pendingText="Creating…">Create account</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-2">Already have an account? <Link href="/login" className="font-bold text-brand hover:underline underline-offset-4">Log in</Link></p>
    </AuthShell>
  );
}
