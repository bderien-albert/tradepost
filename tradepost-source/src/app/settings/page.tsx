import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { changePassword, updateProfile } from "@/app/auth-actions";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Avatar user={user} size={64} />
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
          <Link href={`/u/${user.username}`} className="text-sm font-bold text-brand hover:underline underline-offset-4">View my public profile →</Link>
        </div>
      </div>

      <section className="panel p-6 sm:p-8">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Profile</h2>
        <ActionForm action={updateProfile} className="mt-4 space-y-4">
          <div>
            <span className="label">Avatar colour</span>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="avatarColor" value={c} defaultChecked={(user.avatarColor ?? AVATAR_COLORS[0]) === c} className="peer sr-only" />
                  <span className="block w-10 h-10 rounded-full ring-offset-2 ring-offset-[var(--card)] peer-checked:ring-4 peer-checked:ring-ink" style={{ background: c }} />
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="bio">About you</label>
            <textarea id="bio" name="bio" rows={3} maxLength={200} defaultValue={user.bio ?? ""} className="field" placeholder="What you trade, when you're online, which server…" />
          </div>
          <SubmitButton className="btn btn-brand">Save profile</SubmitButton>
        </ActionForm>
      </section>

      <section className="panel p-6 sm:p-8">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Change password</h2>
        <ActionForm action={changePassword} className="mt-4 space-y-4" resetOnOk>
          <div>
            <label className="label" htmlFor="current">Current password</label>
            <input id="current" name="current" type="password" className="field" autoComplete="current-password" required={!!user.passwordHash} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Repeat new password</label>
              <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <SubmitButton className="btn">Change password</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
