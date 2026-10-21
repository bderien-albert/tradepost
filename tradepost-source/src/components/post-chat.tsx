import Link from "next/link";
import { db } from "@/lib/db";
import { WEEK_MS } from "@/lib/cleanup";
import { ago } from "@/lib/format";
import { sendPostMessage } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";

type Viewer = { id: string; username: string } | null;

export async function PostChat({ postId, ownerId, ownerName, viewer, selected, open }: {
  postId: string; ownerId: string; ownerName: string; viewer: Viewer; selected?: string; open: boolean;
}) {
  if (!viewer) {
    return <Shell><p className="text-sm text-ink-3 px-4 py-6"><Link href="/login" className="underline underline-offset-4">Log in</Link> to chat with {ownerName}.</p></Shell>;
  }
  const since = new Date(Date.now() - WEEK_MS);
  const isOwner = viewer.id === ownerId;

  if (!isOwner) {
    const messages = await db.postMessage.findMany({
      where: { postId, participantId: viewer.id, createdAt: { gte: since } },
      include: { sender: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    });
    return (
      <Shell title={`Chat with ${ownerName}`}>
        <Messages messages={messages} viewerId={viewer.id} empty={`Ask ${ownerName} a question before you make an offer.`} />
        {open && <Composer postId={postId} placeholder={`Message ${ownerName}`} />}
      </Shell>
    );
  }

  // Owner: one thread per interested player.
  const recent = await db.postMessage.findMany({
    where: { postId, createdAt: { gte: since } },
    include: { participant: { select: { id: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  const threads = new Map<string, { username: string; last: Date }>();
  for (const m of recent) if (!threads.has(m.participantId)) threads.set(m.participantId, { username: m.participant.username, last: m.createdAt });
  if (threads.size === 0) return <Shell title="Chats"><p className="text-sm text-ink-3 px-4 py-6">No one has messaged you about this post yet.</p></Shell>;

  const current = selected && threads.has(selected) ? selected : [...threads.keys()][0];
  const messages = await db.postMessage.findMany({
    where: { postId, participantId: current, createdAt: { gte: since } },
    include: { sender: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <Shell title={`Chats (${threads.size})`}>
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-3">
        {[...threads.entries()].map(([id, t]) => (
          <Link key={id} href={`/post/${postId}?chat=${id}#chat`} scroll={false}
            className={`text-sm px-2.5 py-1 border rounded-sm whitespace-nowrap ${id === current ? "border-ink bg-paper" : "border-rule text-ink-2 hover:border-rule-strong"}`}>
            {t.username} <span className="text-xs text-ink-3">{ago(t.last)}</span>
          </Link>
        ))}
      </div>
      <Messages messages={messages} viewerId={viewer.id} empty="" />
      <Composer postId={postId} participantId={current} placeholder={`Reply to ${threads.get(current)!.username}`} />
    </Shell>
  );
}

function Shell({ title = "Chat", children }: { title?: string; children: React.ReactNode }) {
  return (
    <section id="chat" className="mt-10 border border-rule-strong rounded-sm bg-card">
      <div className="px-4 py-3 border-b border-rule flex items-baseline justify-between gap-3">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-ink-3">Messages delete after 7 days</p>
      </div>
      {children}
    </section>
  );
}

function Messages({ messages, viewerId, empty }: {
  messages: { id: string; senderId: string; body: string; createdAt: Date; sender: { username: string } }[]; viewerId: string; empty: string;
}) {
  return (
    <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
      {messages.length === 0 && empty && <p className="text-sm text-ink-3">{empty}</p>}
      {messages.map((m) => {
        const mine = m.senderId === viewerId;
        return (
          <div key={m.id} className={`max-w-[85%] ${mine ? "ml-auto text-right" : ""}`}>
            <p className="text-[0.7rem] text-ink-3">{m.sender.username} · {ago(m.createdAt)}</p>
            <p className={`inline-block text-sm px-3 py-1.5 rounded-sm mt-0.5 text-left ${mine ? "bg-ink text-paper" : "bg-paper border border-rule"}`}>{m.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ postId, participantId, placeholder }: { postId: string; participantId?: string; placeholder: string }) {
  return (
    <ActionForm action={sendPostMessage} className="border-t border-rule p-3" resetOnOk>
      <input type="hidden" name="postId" value={postId} />
      {participantId && <input type="hidden" name="participantId" value={participantId} />}
      <div className="flex gap-2">
        <input name="body" maxLength={500} className="field" placeholder={placeholder} autoComplete="off" required />
        <SubmitButton className="btn" pendingText="…">Send</SubmitButton>
      </div>
    </ActionForm>
  );
}
