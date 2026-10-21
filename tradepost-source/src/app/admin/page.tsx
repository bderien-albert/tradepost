import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { activeSpecialWhere, openWhere, postInclude } from "@/lib/queries";
import { ago, money } from "@/lib/format";
import { addGame, addItem, banUser, resolveReport, setRole, setSpecial, unbanUser } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

const TABS = [
  { key: "specials", label: "Admin deals" },
  { key: "reports", label: "Reports" },
  { key: "users", label: "Users" },
  { key: "catalog", label: "Games & items" },
  { key: "log", label: "Audit log" },
] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "specials";
  const openReports = await db.report.count({ where: { status: "OPEN" } });

  return (
    <div>
      <p className="eyebrow">Staff · signed in as {staff.username} ({staff.role.toLowerCase()})</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Admin</h1>
      <div className="flex gap-6 border-b border-rule-strong mt-6 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin?tab=${t.key}`} className={`pb-2.5 -mb-px border-b-2 text-sm whitespace-nowrap ${tab === t.key ? "border-ink font-medium" : "border-transparent text-ink-2 hover:text-ink"}`}>
            {t.label}{t.key === "reports" && openReports > 0 && <span className="ml-1.5 num text-xs bg-sell text-white rounded-sm px-1.5">{openReports}</span>}
          </Link>
        ))}
      </div>
      {tab === "specials" && <Specials q={sp.q} />}
      {tab === "reports" && <Reports />}
      {tab === "users" && <Users q={sp.q} isAdmin={staff.role === "ADMIN"} />}
      {tab === "catalog" && <Catalog />}
      {tab === "log" && <Log />}
    </div>
  );
}

async function Specials({ q }: { q?: string }) {
  const [active, candidates] = await Promise.all([
    db.post.findMany({ where: activeSpecialWhere(), include: postInclude, orderBy: { createdAt: "desc" } }),
    db.post.findMany({
      where: { ...openWhere(), isSpecial: false, ...(q ? { OR: [{ item: { name: { contains: q, mode: "insensitive" } } }, { user: { username: { contains: q, mode: "insensitive" } } }] } : {}) },
      include: postInclude, orderBy: { createdAt: "desc" }, take: 20,
    }),
  ]);
  return (
    <div className="space-y-10">
      <p className="text-sm text-ink-2 max-w-2xl">
        Admin deals sit above normal results on the game board and home page (up to 3 per board), like sponsored search results,
        and every one is listed on the game&apos;s Admin deals page, sorted by item type. Pinned &quot;until removed&quot;, they never expire.
      </p>
      <section>
        <h2 className="eyebrow mb-3">Pinned now ({active.length})</h2>
        {active.length === 0 ? <p className="text-sm text-ink-3">Nothing pinned.</p> : (
          <PostRows posts={active} action={(id) => (
            <form action={setSpecial}><input type="hidden" name="postId" value={id} /><input type="hidden" name="days" value="0" /><SubmitButton className="btn btn-ghost btn-sm">Unpin</SubmitButton></form>
          )} />
        )}
      </section>
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="eyebrow">Pin an open post</h2>
          <form className="flex gap-2"><input type="hidden" name="tab" value="specials" /><input name="q" defaultValue={q} placeholder="Item or username" className="field w-56 h-8" /><button className="btn btn-ghost btn-sm">Search</button></form>
        </div>
        <PostRows posts={candidates} action={(id) => (
          <form action={setSpecial} className="flex gap-1.5">
            <input type="hidden" name="postId" value={id} />
            <select name="days" defaultValue="-1" className="field h-[1.85rem] w-32 text-xs"><option value="-1">Until removed</option><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="30">30 days</option></select>
            <SubmitButton className="btn btn-sm">Pin</SubmitButton>
          </form>
        )} />
      </section>
    </div>
  );
}

function PostRows({ posts, action }: { posts: Awaited<ReturnType<typeof db.post.findMany<{ include: typeof postInclude }>>>; action: (id: string) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto"><table className="ledger min-w-[640px]">
      <thead><tr><th>Post</th><th>Game</th><th className="r">Price each</th><th>By</th><th>Until</th><th /></tr></thead>
      <tbody>
        {posts.map((p) => (
          <tr key={p.id}>
            <td><span className={`side-tag side-${p.side} mr-2`}>{p.side === "BUY" ? "Buy" : "Sell"}</span><Link href={`/post/${p.id}`} className="hover:underline underline-offset-4">{p.quantity - p.filled} × {p.item.name}</Link></td>
            <td className="text-sm text-ink-2">{p.game.name}</td>
            <td className="r num">{money(p.unitPrice, p.currency.symbol)}</td>
            <td className="text-sm">{p.user.username}</td>
            <td className="text-xs text-ink-3">{p.isSpecial ? (p.specialUntil ? p.specialUntil.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Until removed") : `expires ${p.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</td>
            <td className="r">{action(p.id)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

async function Reports() {
  const reports = await db.report.findMany({ include: { reporter: { select: { username: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 50 });
  if (reports.length === 0) return <p className="text-sm text-ink-3">No reports.</p>;
  const href = (r: { targetType: string; targetId: string }) => (r.targetType === "trade" ? `/trade/${r.targetId}` : r.targetType === "post" ? `/post/${r.targetId}` : null);
  const userTargets = await db.user.findMany({ where: { id: { in: reports.filter((r) => r.targetType === "user").map((r) => r.targetId) } }, select: { id: true, username: true } });
  const names = new Map(userTargets.map((u) => [u.id, u.username]));
  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const link = href(r) ?? (names.get(r.targetId) ? `/u/${names.get(r.targetId)}` : null);
        return (
          <li key={r.id} className={`border rounded-sm p-4 ${r.status === "OPEN" ? "border-rule-strong bg-card" : "border-rule opacity-70"}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="eyebrow">{r.targetType}</span>
              {link && <Link href={link} className="underline underline-offset-4">Open {r.targetType}{r.targetType === "user" ? ` ${names.get(r.targetId)}` : ""}</Link>}
              <span className="text-ink-3">by {r.reporter.username} · {ago(r.createdAt)}</span>
              <span className="ml-auto eyebrow">{r.status.toLowerCase()}</span>
            </div>
            <p className="mt-2">{r.reason}</p>
            {r.resolution && <p className="mt-1 text-sm text-ink-2">Resolution: {r.resolution}</p>}
            {r.status === "OPEN" && (
              <form action={resolveReport} className="mt-3 flex flex-wrap gap-2 items-center">
                <input type="hidden" name="reportId" value={r.id} />
                <input name="note" placeholder="Note (optional)" className="field h-8 w-64" />
                {r.targetType === "trade" && (
                  <select name="tradeVerdict" className="field h-8 w-auto text-sm" defaultValue="">
                    <option value="">Leave trade as is</option>
                    <option value="complete">Mark trade completed</option>
                    <option value="cancel">Cancel trade</option>
                  </select>
                )}
                <button name="outcome" value="resolve" className="btn btn-sm">Resolve</button>
                <button name="outcome" value="dismiss" className="btn btn-ghost btn-sm">Dismiss</button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

async function Users({ q, isAdmin }: { q?: string; isAdmin: boolean }) {
  const users = await db.user.findMany({
    where: q ? { username: { contains: q, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" }, take: 50,
    include: { _count: { select: { posts: true, reports: true } } },
  });
  return (
    <div>
      <form className="flex gap-2 mb-4"><input type="hidden" name="tab" value="users" /><input name="q" defaultValue={q} placeholder="Username" className="field w-64" /><button className="btn btn-ghost">Search</button></form>
      <div className="overflow-x-auto"><table className="ledger min-w-[720px]">
        <thead><tr><th>User</th><th>Joined</th><th className="r">Posts</th><th>Role</th><th>Status</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/u/${u.username}`} className="font-medium hover:underline underline-offset-4">{u.username}</Link></td>
              <td className="text-xs text-ink-3">{ago(u.createdAt)}</td>
              <td className="r num">{u._count.posts}</td>
              <td>
                {isAdmin ? (
                  <form action={setRole} className="flex gap-1.5">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="field h-[1.85rem] w-28 text-xs"><option value="PLAYER">Player</option><option value="MOD">Moderator</option><option value="ADMIN">Admin</option></select>
                    <SubmitButton className="btn btn-ghost btn-sm">Set</SubmitButton>
                  </form>
                ) : <span className="text-sm">{u.role.toLowerCase()}</span>}
              </td>
              <td className="text-sm">{u.bannedAt ? <span className="text-sell">Banned</span> : "Active"}</td>
              <td className="r">
                {u.bannedAt ? (
                  <form action={unbanUser}><input type="hidden" name="userId" value={u.id} /><SubmitButton className="btn btn-ghost btn-sm">Unban</SubmitButton></form>
                ) : u.role !== "ADMIN" && (
                  <form action={banUser} className="flex gap-1.5 justify-end"><input type="hidden" name="userId" value={u.id} /><input name="reason" placeholder="Reason" className="field h-[1.85rem] w-32 text-xs" /><SubmitButton className="btn btn-ghost btn-sm">Ban</SubmitButton></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

async function Catalog() {
  const games = await db.game.findMany({ orderBy: { sortOrder: "asc" }, include: { currencies: true, _count: { select: { items: true } } } });
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <section className="border border-rule-strong rounded-sm p-5">
        <h2 className="font-medium">Add a game tab</h2>
        <ActionForm action={addGame} className="mt-4 space-y-3" resetOnOk>
          <div><label className="label">Game name</label><input name="name" className="field" placeholder="e.g. Bee Swarm Simulator" required /></div>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <div><label className="label">Currency name</label><input name="currency" className="field" placeholder="e.g. Honey" required /></div>
            <div><label className="label">Symbol</label><input name="symbol" className="field" placeholder="🍯 or H" required /></div>
          </div>
          <SubmitButton>Add game</SubmitButton>
        </ActionForm>
        <ul className="mt-6 text-sm divide-y divide-rule border-t border-rule">
          {games.map((g) => <li key={g.id} className="py-2 flex justify-between"><span>{g.name}</span><span className="text-ink-3">{g._count.items} items · {g.currencies.map((c) => c.symbol).join(" ")}</span></li>)}
        </ul>
      </section>
      <section className="border border-rule-strong rounded-sm p-5">
        <h2 className="font-medium">Add an item</h2>
        <ActionForm action={addItem} className="mt-4 space-y-3" resetOnOk>
          <div><label className="label">Game</label><select name="gameId" className="field">{games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div><label className="label">Item name</label><input name="name" className="field" placeholder="e.g. Phantom Wood" required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Category</label><input name="category" className="field" placeholder="Wood" /></div>
            <div><label className="label">Unit</label><input name="unit" className="field" placeholder="log" /></div>
            <div><label className="label">Rarity</label><input name="rarity" className="field" placeholder="Rare" /></div>
          </div>
          <SubmitButton>Add item</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}

async function Log() {
  const entries = await db.auditLog.findMany({ include: { actor: { select: { username: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  if (entries.length === 0) return <p className="text-sm text-ink-3">No staff actions yet.</p>;
  return (
    <table className="ledger">
      <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className="text-xs text-ink-3 whitespace-nowrap">{ago(e.createdAt)}</td>
            <td className="text-sm">{e.actor?.username ?? "system"}</td>
            <td className="num text-sm">{e.action}</td>
            <td className="num text-xs text-ink-2">{e.target}</td>
            <td className="num text-xs text-ink-3">{e.detail ? JSON.stringify(e.detail) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
