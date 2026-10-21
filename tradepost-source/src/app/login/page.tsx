import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, demoLoginEnabled, robloxLoginEnabled } from "@/lib/session";
import { demoLogin } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  roblox_off: "Roblox login isn't set up on this site yet.",
  state: "The login link expired. Try again.",
  token: "Roblox didn't accept the login. Try again.",
  profile: "Couldn't read your Roblox profile. Try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="text-ink-2 mt-2 text-sm leading-relaxed">
        We use your Roblox account so everyone you trade with is who they say they are. We only read your username and avatar.
      </p>
      {error && <p className="mt-4 text-sm text-sell">{ERRORS[error] ?? "Login failed."}</p>}

      {robloxLoginEnabled() ? (
        <a href="/api/auth/roblox" className="btn w-full mt-6 h-11">Continue with Roblox</a>
      ) : (
        <p className="mt-6 text-sm border border-dashed border-rule-strong rounded-sm p-3 text-ink-2">
          Roblox login turns on once ROBLOX_CLIENT_ID and ROBLOX_CLIENT_SECRET are set.
        </p>
      )}

      {demoLoginEnabled() && (
        <div className="mt-8 pt-6 border-t border-rule">
          <p className="eyebrow mb-2">Test mode</p>
          <ActionForm action={demoLogin} className="space-y-2">
            <input name="username" className="field" placeholder="Pick any username" autoComplete="off" required />
            <SubmitButton className="btn btn-ghost w-full">Log in without Roblox</SubmitButton>
          </ActionForm>
          <p className="text-xs text-ink-3 mt-2">For testing only. Turn off with DEMO_LOGIN=false before launch.</p>
        </div>
      )}

      <p className="text-xs text-ink-3 mt-8">By logging in you confirm you&apos;re 13 or older and agree to the rules.</p>
    </div>
  );
}
