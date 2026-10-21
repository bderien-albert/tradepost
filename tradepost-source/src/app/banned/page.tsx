import { currentUser } from "@/lib/session";

export default async function Banned() {
  const user = await currentUser();
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Account suspended</h1>
      <p className="mt-3 text-ink-2">You can still browse, but you can&apos;t post, offer or trade.{user?.banReason ? ` Reason: ${user.banReason}.` : ""}</p>
    </div>
  );
}
