"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { isAdminName } from "@/lib/admins";
import { requireUser, startSession } from "@/lib/session";
import { checkText } from "@/lib/filter";
import type { FormState } from "./actions";
import { AVATAR_COLORS } from "@/lib/avatar-colors";

const LOCK_AFTER = 8;
const LOCK_MINUTES = 15;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return { error: "Usernames are 3 to 20 letters, numbers or underscores, like on Roblox." };
  if (form.get("age") !== "on") return { error: "You need to be 13 or older to use Tradepost." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords don't match." };
  if (isAdminName(username)) return { error: "That username is reserved." };

  const existing = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (existing) return { error: "That username is taken. Log in instead?" };

  const user = await db.user.create({
    data: {
      username,
      displayName: username,
      passwordHash: await hashPassword(password),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fail = { error: "Wrong username or password." };
  if (!username || !password) return fail;

  const user = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (!user || !user.passwordHash) {
    await verifyPassword(password, "scrypt$00$00"); // keep timing similar
    return fail;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.` };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: failed >= LOCK_AFTER ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: failed },
    });
    return fail;
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await startSession(user.id);
  redirect(user.bannedAt ? "/banned" : safeNext(form.get("next")));
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const bio = String(form.get("bio") ?? "").trim().slice(0, 200);
  const avatarColor = String(form.get("avatarColor") ?? "");
  if (bio) {
    const bad = checkText(bio);
    if (bad) return { error: bad };
  }
  await db.user.update({
    where: { id: user.id },
    data: { bio: bio || null, ...(AVATAR_COLORS.includes(avatarColor) ? { avatarColor } : {}) },
  });
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) return { error: "Your current password is wrong." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password changed." };
}
