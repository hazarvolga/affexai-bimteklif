import { desc, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { adminAuditLogs } from "../../db/schema";

export const EXPERT_GRANTED_ACTION = "member.expert_granted" as const;
export const EXPERT_REVOKED_ACTION = "member.expert_revoked" as const;

export async function isUserExpertReviewer(
  userId: string,
  isSuperAdmin?: boolean | null,
): Promise<boolean> {
  if (isSuperAdmin) return true;
  if (!userId) return false;
  try {
    const rows = await db
      .select({
        action: adminAuditLogs.action,
      })
      .from(adminAuditLogs)
      .where(
        sql`${adminAuditLogs.action} IN (${EXPERT_GRANTED_ACTION}, ${EXPERT_REVOKED_ACTION}) AND ${adminAuditLogs.details}->>'targetUserId' = ${userId}`,
      )
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
      .limit(1);
    return rows[0]?.action === EXPERT_GRANTED_ACTION;
  } catch {
    return false;
  }
}

export async function getExpertReviewerStatusMap(
  userIds: readonly string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  for (const id of uniqueIds) {
    result.set(id, false);
  }
  if (uniqueIds.length === 0) return result;

  try {
    const rows = await db
      .select({
        action: adminAuditLogs.action,
        details: adminAuditLogs.details,
      })
      .from(adminAuditLogs)
      .where(
        inArray(adminAuditLogs.action, [
          EXPERT_GRANTED_ACTION,
          EXPERT_REVOKED_ACTION,
        ]),
      )
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id));

    const decided = new Set<string>();
    for (const row of rows) {
      const details = (row.details ?? {}) as Record<string, unknown>;
      const targetUserId =
        typeof details.targetUserId === "string" ? details.targetUserId : null;
      if (
        !targetUserId ||
        !result.has(targetUserId) ||
        decided.has(targetUserId)
      ) {
        continue;
      }
      decided.add(targetUserId);
      result.set(targetUserId, row.action === EXPERT_GRANTED_ACTION);
      if (decided.size === uniqueIds.length) break;
    }
  } catch {
    // Fallback to false map if audit table query fails in mock/unit environments
  }

  return result;
}
