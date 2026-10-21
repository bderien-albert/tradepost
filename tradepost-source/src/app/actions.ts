"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkText } from "@/lib/filter";
import { audit } from "@/lib/audit";
import { NO_EXPIRY, WEEK_MS } from "@/lib/cleanup";
import { currentUser, endSession, requireStaff, requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admins";
import { WOOD_SIZES, isWood } from "@/lib/sizes";

export type FormState = { error?: string; ok?: string } | undefined;

const MAX_OPEN_POSTS = 25;
const NEW_ACCOUNT_DAILY_POSTS = 5;

// ---------- auth ----------

export async function logout() {
  await endSession();
  redirect("/");
}

// ---------- posts ----------

const postSchema = z.object({
  itemId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitPrice: z.coerce.number().int().min(1).max(1_000_000_000),
  currencyId: z.string().min(1),
  notes: z.string().max(280).optional(),
  days: z.coerce.number().int().min(1).max(7),
  size: z.enum(WOOD_SIZES.map((w) => w.key) as [string, ...string[]]).optional(),
});

export async function createPost(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = postSchema.safeParse({
    itemId: form.get("itemId"),
    side: form.get("side"),
    quantity: form.get("quantity"),
    unitPrice: form.get("unitPrice"),
    currencyId: form.get("currencyId"),
    notes: (form.get("notes") as string) || undefined,
    days: form.get("days") ?? 7,
    size: (form.get("size") as string) || undefined,
  });
  if (!parsed.success) return { error: "Check the item, quantity and price." };
  const d = parsed.data;
  if (d.notes) {
    const bad = checkText(d.notes);
    if (bad) return { error: bad };
  }

  const item = await db.item.findUnique({ where: { id: d.itemId } });
  const currency = await db.currency.findUnique({ where: { id: d.currencyId } });
  if (!item || !currency || currency.gameId !== item.gameId) return { error: "That item and currency don't belong to the same game." };
  if (isWood(item.category) && !d.size) return { error: "Pick a size for the wood." };

  const open = await db.post.count({ where: { userId: user.id, status: "OPEN" } });
  if (open >= MAX_OPEN_POSTS) return { error: `You can have ${MAX_OPEN_POSTS} open posts at once. Close some first.` };
  const isNew = Date.now() - user.createdAt.getTime() < 7 * 86400_000;
  if (isNew && !isAdmin(user)) {
    const today = await db.post.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 86400_000) } } });
    if (today >= NEW_ACCOUNT_DAILY_POSTS) return { error: `New accounts can post ${NEW_ACCOUNT_DAILY_POSTS} times a day for their first week.` };
  }

  const adminDeal = isAdmin(user) && form.get("adminDeal") === "on";
  const post = await db.post.create({
    data: {
      isSpecial: adminDeal,
      userId: user.id,
      gameId: item.gameId,
      itemId: item.id,
      side: d.side,
      quantity: d.quantity,
      size: isWood(item.category) ? (d.size as (typeof WOOD_SIZES)[number]["key"]) : null,
      unitPrice: d.unitPrice,
      currencyId: currency.id,
      notes: d.notes,
      expiresAt: adminDeal ? NO_EXPIRY : new Date(Date.now() + d.days * 86400_000),
    },
  });
  if (adminDeal) await audit(user.id, "special.create", `post:${post.id}`);
  redirect(`/post/${post.id}`);
}

export async function cancelPost(postId: string) {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== user.id || post.status !== "OPEN") return;
  await db.$transaction([
    db.post.update({ where: { id: postId }, data: { status: "CANCELLED" } }),
    db.offer.updateMany({ where: { postId, status: "PENDING" }, data: { status: "DECLINED", decidedAt: new Date() } }),
  ]);
  revalidatePath(`/post/${postId}`);
}

// ---------- offers ----------

const offerSchema = z.object({
  postId: z.string(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(1).max(1_000_000_000),
  message: z.string().max(280).optional(),
});

export async function makeOffer(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = offerSchema.safeParse({
    postId: form.get("postId"),
    quantity: form.get("quantity"),
    unitPrice: form.get("unitPrice"),
    message: (form.get("message") as string) || undefined,
  });
  if (!parsed.success) return { error: "Check the quantity and price." };
  const d = parsed.data;
  if (d.message) {
    const bad = checkText(d.message);
    if (bad) return { error: bad };
  }
  const post = await db.post.findUnique({ where: { id: d.postId } });
  if (!post || post.status !== "OPEN" || post.expiresAt < new Date()) return { error: "This post is no longer open." };
  if (post.userId === user.id) return { error: "You can't make an offer on your own post." };
  if (d.quantity > post.quantity - post.filled) return { error: `Only ${post.quantity - post.filled} left on this post.` };
  const pending = await db.offer.count({ where: { postId: post.id, userId: user.id, status: "PENDING" } });
  if (pending) return { error: "You already have a pending offer here. Withdraw it to send a new one." };

  await db.offer.create({ data: { postId: post.id, userId: user.id, quantity: d.quantity, unitPrice: d.unitPrice, message: d.message } });
  revalidatePath(`/post/${post.id}`);
  return { ok: "Offer sent. You'll see it under My trades once they answer." };
}

export async function withdrawOffer(offerId: string) {
  const user = await requireUser();
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.userId !== user.id || offer.status !== "PENDING") return;
  await db.offer.update({ where: { id: offerId }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
  revalidatePath(`/post/${offer.postId}`);
}

export async function declineOffer(offerId: string) {
  const user = await requireUser();
  const offer = await db.offer.findUnique({ where: { id: offerId }, include: { post: true } });
  if (!offer || offer.post.userId !== user.id || offer.status !== "PENDING") return;
  await db.offer.update({ where: { id: offerId }, data: { status: "DECLINED", decidedAt: new Date() } });
  revalidatePath(`/post/${offer.postId}`);
}

export async function acceptOffer(offerId: string) {
  const user = await requireUser();
  const tradeId = await db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({ where: { id: offerId }, include: { post: true } });
    if (!offer || offer.post.userId !== user.id || offer.status !== "PENDING") return null;
    const post = offer.post;
    const left = post.quantity - post.filled;
    if (post.status !== "OPEN" || offer.quantity > left) return null;

    const filled = post.filled + offer.quantity;
    await tx.post.update({ where: { id: post.id }, data: { filled, status: filled >= post.quantity ? "FILLED" : "OPEN" } });
    await tx.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", decidedAt: new Date() } });
    if (filled >= post.quantity) {
      await tx.offer.updateMany({ where: { postId: post.id, status: "PENDING" }, data: { status: "DECLINED", decidedAt: new Date() } });
    }
    const sellerIsPoster = post.side === "SELL";
    const trade = await tx.trade.create({
      data: {
        postId: post.id,
        offerId: offer.id,
        buyerId: sellerIsPoster ? offer.userId : post.userId,
        sellerId: sellerIsPoster ? post.userId : offer.userId,
        itemId: post.itemId,
        size: post.size,
        quantity: offer.quantity,
        unitPrice: offer.unitPrice,
        currencyId: post.currencyId,
      },
    });
    return trade.id;
  });
  if (tradeId) redirect(`/trade/${tradeId}`);
}

// ---------- trades ----------

async function myTrade(tradeId: string) {
  const user = await requireUser();
  const trade = await db.trade.findUnique({ where: { id: tradeId } });
  if (!trade || (trade.buyerId !== user.id && trade.sellerId !== user.id)) return null;
  return { user, trade, isBuyer: trade.buyerId === user.id };
}

export async function confirmTrade(tradeId: string) {
  const ctx = await myTrade(tradeId);
  if (!ctx || ctx.trade.status !== "ACTIVE") return;
  const now = new Date();
  const field = ctx.isBuyer ? { buyerConfirmedAt: now } : { sellerConfirmedAt: now };
  const other = ctx.isBuyer ? ctx.trade.sellerConfirmedAt : ctx.trade.buyerConfirmedAt;
  await db.trade.update({
    where: { id: tradeId },
    data: { ...field, ...(other ? { status: "COMPLETED", completedAt: now } : {}) },
  });
  revalidatePath(`/trade/${tradeId}`);
}

export async function cancelTrade(tradeId: string) {
  const ctx = await myTrade(tradeId);
  if (!ctx || ctx.trade.status !== "ACTIVE" || ctx.trade.buyerConfirmedAt || ctx.trade.sellerConfirmedAt) return;
  await db.$transaction(async (tx) => {
    await tx.trade.update({ where: { id: tradeId }, data: { status: "CANCELLED" } });
    const post = await tx.post.findUniqueOrThrow({ where: { id: ctx.trade.postId } });
    const filled = Math.max(0, post.filled - ctx.trade.quantity);
    const reopen = post.status === "FILLED" && post.expiresAt > new Date();
    await tx.post.update({ where: { id: post.id }, data: { filled, ...(reopen ? { status: "OPEN" } : {}) } });
  });
  await audit(ctx.user.id, "trade.cancel", `trade:${tradeId}`);
  revalidatePath(`/trade/${tradeId}`);
}

export async function disputeTrade(_: FormState, form: FormData): Promise<FormState> {
  const tradeId = String(form.get("tradeId"));
  const reason = String(form.get("reason") ?? "").trim();
  const ctx = await myTrade(tradeId);
  if (!ctx || ctx.trade.status !== "ACTIVE") return { error: "This trade can't be disputed." };
  if (reason.length < 10) return { error: "Say what went wrong in a sentence or two." };
  await db.$transaction([
    db.trade.update({ where: { id: tradeId }, data: { status: "DISPUTED" } }),
    db.report.create({ data: { reporterId: ctx.user.id, targetType: "trade", targetId: tradeId, reason } }),
  ]);
  revalidatePath(`/trade/${tradeId}`);
  return { ok: "Reported. A moderator will look at it." };
}

export async function sendMessage(_: FormState, form: FormData): Promise<FormState> {
  const tradeId = String(form.get("tradeId"));
  const body = String(form.get("body") ?? "").trim();
  const ctx = await myTrade(tradeId);
  if (!ctx) return { error: "Not your trade." };
  if (!body || body.length > 500) return { error: "Messages are 1 to 500 characters." };
  const bad = checkText(body);
  if (bad) return { error: bad };
  await db.message.create({ data: { tradeId, userId: ctx.user.id, body } });
  revalidatePath(`/trade/${tradeId}`);
  return {};
}

export async function rateTrade(_: FormState, form: FormData): Promise<FormState> {
  const tradeId = String(form.get("tradeId"));
  const stars = Number(form.get("stars"));
  const comment = String(form.get("comment") ?? "").trim() || undefined;
  const ctx = await myTrade(tradeId);
  if (!ctx || ctx.trade.status !== "COMPLETED") return { error: "You can rate once the trade is completed." };
  if (!(stars >= 1 && stars <= 5)) return { error: "Pick 1 to 5 stars." };
  if (comment) {
    const bad = checkText(comment);
    if (bad) return { error: bad };
  }
  const toId = ctx.isBuyer ? ctx.trade.sellerId : ctx.trade.buyerId;
  const exists = await db.rating.findUnique({ where: { tradeId_fromId: { tradeId, fromId: ctx.user.id } } });
  if (exists) return { error: "You already rated this trade." };
  await db.rating.create({ data: { tradeId, fromId: ctx.user.id, toId, stars, comment: comment?.slice(0, 200) } });
  revalidatePath(`/trade/${tradeId}`);
  return { ok: "Thanks, rating saved." };
}

// ---------- post chat ----------

export async function sendPostMessage(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const postId = String(form.get("postId"));
  const body = String(form.get("body") ?? "").trim();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.status === "REMOVED") return { error: "This post is gone." };
  // The thread belongs to the non-owner; owners reply into a chosen thread.
  const participantId = user.id === post.userId ? String(form.get("participantId") ?? "") : user.id;
  if (!participantId || participantId === post.userId) return { error: "Pick a conversation first." };
  if (!body || body.length > 500) return { error: "Messages are 1 to 500 characters." };
  const bad = checkText(body);
  if (bad) return { error: bad };
  if (user.id === post.userId) {
    const started = await db.postMessage.count({ where: { postId, participantId } });
    if (!started) return { error: "Wait for them to message you first." };
  }
  await db.postMessage.create({ data: { postId, participantId, senderId: user.id, body } });
  revalidatePath(`/post/${postId}`);
  return {};
}

// ---------- reports ----------

export async function report(_: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Log in to report." };
  const targetType = String(form.get("targetType"));
  const targetId = String(form.get("targetId"));
  const reason = String(form.get("reason") ?? "").trim();
  if (!["post", "user", "trade"].includes(targetType)) return { error: "Unknown target." };
  if (reason.length < 10) return { error: "Add a sentence on what's wrong." };
  await db.report.create({ data: { reporterId: user.id, targetType, targetId, reason: reason.slice(0, 500) } });
  return { ok: "Thanks. A moderator will review it." };
}

// ---------- staff ----------

// days > 0 pins for that many days, -1 pins until unpinned, 0 unpins.
export async function setSpecial(form: FormData) {
  const staff = await requireStaff();
  const postId = String(form.get("postId"));
  const days = Number(form.get("days") ?? 0);
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return;
  const now = Date.now();
  if (days === 0) {
    // Back to a normal post: at most a week left.
    const expiresAt = new Date(Math.min(post.expiresAt.getTime(), now + WEEK_MS));
    await db.post.update({ where: { id: postId }, data: { isSpecial: false, specialUntil: null, expiresAt } });
  } else {
    const specialUntil = days > 0 ? new Date(now + days * 86400_000) : null;
    await db.post.update({ where: { id: postId }, data: { isSpecial: true, specialUntil, expiresAt: NO_EXPIRY } });
  }
  await audit(staff.id, days === 0 ? "special.off" : "special.on", `post:${postId}`, days ? { days } : undefined);
  revalidatePath("/", "layout");
}

export async function removePost(form: FormData) {
  const staff = await requireStaff();
  const postId = String(form.get("postId"));
  await db.post.update({ where: { id: postId }, data: { status: "REMOVED", isSpecial: false } });
  await audit(staff.id, "post.remove", `post:${postId}`);
  revalidatePath("/", "layout");
}

export async function resolveReport(form: FormData) {
  const staff = await requireStaff();
  const id = String(form.get("reportId"));
  const outcome = String(form.get("outcome")) === "dismiss" ? "DISMISSED" : "RESOLVED";
  const note = String(form.get("note") ?? "").trim() || null;
  const rep = await db.report.update({
    where: { id },
    data: { status: outcome, resolution: note, resolvedBy: staff.id, resolvedAt: new Date() },
  });
  if (rep.targetType === "trade") {
    const verdict = String(form.get("tradeVerdict") ?? "");
    if (verdict === "complete") await db.trade.update({ where: { id: rep.targetId }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (verdict === "cancel") await db.trade.update({ where: { id: rep.targetId }, data: { status: "CANCELLED" } });
  }
  await audit(staff.id, `report.${outcome.toLowerCase()}`, `report:${id}`, note ? { note } : undefined);
  revalidatePath("/admin");
}

export async function banUser(form: FormData) {
  const staff = await requireStaff();
  const userId = String(form.get("userId"));
  const reason = String(form.get("reason") ?? "").trim() || "Broke the trading rules";
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || isAdmin(target) || target.id === staff.id) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { bannedAt: new Date(), banReason: reason } }),
    db.post.updateMany({ where: { userId, status: "OPEN" }, data: { status: "REMOVED", isSpecial: false } }),
  ]);
  await audit(staff.id, "user.ban", `user:${userId}`, { reason });
  revalidatePath("/", "layout");
}

export async function unbanUser(form: FormData) {
  const staff = await requireStaff();
  const userId = String(form.get("userId"));
  await db.user.update({ where: { id: userId }, data: { bannedAt: null, banReason: null } });
  await audit(staff.id, "user.unban", `user:${userId}`);
  revalidatePath("/admin");
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function addGame(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  const currency = String(form.get("currency") ?? "").trim();
  const symbol = String(form.get("symbol") ?? "").trim();
  if (!name || !currency || !symbol) return { error: "Name, currency and symbol are all needed." };
  const slug = slugify(name);
  if (await db.game.findUnique({ where: { slug } })) return { error: "That game already exists." };
  const count = await db.game.count();
  await db.game.create({ data: { name, slug, sortOrder: count, currencies: { create: { name: currency, symbol } } } });
  await audit(staff.id, "game.add", `game:${slug}`);
  revalidatePath("/", "layout");
  return { ok: `${name} added.` };
}

export async function addItem(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const gameId = String(form.get("gameId"));
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim() || "Other";
  const unit = String(form.get("unit") ?? "").trim() || "unit";
  const rarity = String(form.get("rarity") ?? "").trim() || null;
  if (!name) return { error: "Give the item a name." };
  const slug = slugify(name);
  if (await db.item.findUnique({ where: { gameId_slug: { gameId, slug } } })) return { error: "That item already exists in this game." };
  await db.item.create({ data: { gameId, name, slug, category, unit, rarity } });
  await audit(staff.id, "item.add", `item:${slug}`);
  revalidatePath("/", "layout");
  return { ok: `${name} added.` };
}

// ---------- saved ----------

export async function toggleSave(postId: string) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=/post/${postId}`);
  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await db.savedPost.findUnique({ where: key });
  if (existing) await db.savedPost.delete({ where: key });
  else await db.savedPost.create({ data: { userId: user.id, postId } });
  revalidatePath("/", "layout");
}
