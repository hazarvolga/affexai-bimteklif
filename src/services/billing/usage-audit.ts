import { db } from "../../db";
import { usageLogs } from "../../db/schema";

// Best-effort reporting only; callers must guard this detached promise.
export async function recordUsage(companyId: string, userId: string, feature: string) {
  await db.insert(usageLogs).values({ companyId, userId, feature, count: 1, costEstimate: "0" });
}
