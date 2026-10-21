import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-4 space-y-4 text-ink-2 leading-relaxed">
        <p>When you log in with Roblox we store your Roblox user ID, username, display name and avatar picture. We never see your Roblox password.</p>
        <p>We keep your posts, offers, trades, trade-room messages, ratings and reports so the trade history stays accurate. One cookie keeps you logged in; there are no ad trackers.</p>
        <p>To delete your account, contact the site admin. Your profile is removed and your past trades stay on record under an anonymous name.</p>
      </div>
    </article>
  );
}
