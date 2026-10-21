import { Prisma } from "@prisma/client";
import { db } from "./db";

export function audit(actorId: string | null, action: string, target: string, detail?: Prisma.InputJsonValue) {
  return db.auditLog.create({ data: { actorId, action, target, detail } });
}
