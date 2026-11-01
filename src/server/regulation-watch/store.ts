import { eq, inArray, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { adminAuditLogs, regulationWatchDays, regulationWatchItems } from "../../db/schema";
import type { RegulationWatchStore } from "./service";

export const regulationWatchStore: RegulationWatchStore = {
  async checkedDays(issueDates) {
    const rows = await db.select({ issueDate: regulationWatchDays.issueDate }).from(regulationWatchDays)
      .where(and(eq(regulationWatchDays.source, "resmi_gazete"), inArray(regulationWatchDays.issueDate, issueDates), eq(regulationWatchDays.status, "checked")));
    return rows.map(row => row.issueDate);
  },
  async saveItems(items) {
    await db.insert(regulationWatchItems).values(items).onConflictDoNothing({ target: regulationWatchItems.url });
  },
  async saveDay(day) {
    const checkedAt = new Date();
    await db.insert(regulationWatchDays).values({ ...day, checkedAt }).onConflictDoUpdate({
      target: [regulationWatchDays.source, regulationWatchDays.issueDate],
      set: { status: day.status, matchedCount: day.matchedCount, unreadCount: day.unreadCount, errorCode: day.errorCode, checkedAt },
    });
  },
};

const LISTED_ITEMS = 100;
const LISTED_DAYS = 21;

export async function readRegulationWatch() {
  const [items, days] = await Promise.all([
    db.select().from(regulationWatchItems).orderBy(desc(regulationWatchItems.issueDate), desc(regulationWatchItems.createdAt)).limit(LISTED_ITEMS),
    db.select().from(regulationWatchDays).orderBy(desc(regulationWatchDays.issueDate)).limit(LISTED_DAYS),
  ]);
  return { items, days };
}

export async function reviewRegulationWatchItem(input: { id: string; adminId: string; status: "reviewed" | "dismissed"; note: string | null }) {
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(regulationWatchItems)
      .set({ status: input.status, reviewNote: input.note, reviewedByUserId: input.adminId, reviewedAt: new Date() })
      .where(eq(regulationWatchItems.id, input.id)).returning();
    if (!updated) return null;
    await tx.insert(adminAuditLogs).values({
      adminId: input.adminId,
      action: "regulation_watch.reviewed",
      details: { itemId: updated.id, status: input.status, url: updated.url, note: input.note },
    });
    return updated;
  });
}
