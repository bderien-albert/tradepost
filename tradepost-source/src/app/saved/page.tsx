import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { openWhere, postInclude, reputation } from "@/lib/queries";
import { PostGrid } from "@/components/post-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved" };

export default async function Saved() {
  const user = await requireUser();
  const rows = await db.savedPost.findMany({
    where: { userId: user.id, post: openWhere() },
    include: { post: { include: postInclude } },
    orderBy: { createdAt: "desc" },
  });
  const posts = rows.map((r) => r.post);
  const rep = await reputation([...new Set(posts.map((p) => p.userId))]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Saved</h1>
        <p className="text-ink-2 mt-1">Posts you tapped the heart on. Closed posts drop off automatically.</p>
      </div>
      <PostGrid posts={posts} rep={rep} savedIds={new Set(posts.map((p) => p.id))} showGame empty="Nothing saved yet. Tap the heart on any post to keep it here." />
    </div>
  );
}
