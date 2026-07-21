import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "../../db";
import { academyEditions, academyEnrollments, academyProducts } from "../../db/schema";
import { ALLPLAN_PROGRAM_VERSION } from "../../academy/allplan/certification";

export async function findAllplanEntitlement(companyId: string, userId: string) {
  const now = new Date();
  const [entitlement] = await db.select({
    enrollmentId: academyEnrollments.id,
    status: academyEnrollments.status,
    source: academyEnrollments.source,
    startsAt: academyEnrollments.startsAt,
    endsAt: academyEnrollments.endsAt,
    edition: academyEditions.version,
    accessMode: academyEditions.accessMode,
  }).from(academyEnrollments)
    .innerJoin(academyEditions, eq(academyEditions.id, academyEnrollments.editionId))
    .innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId))
    .where(and(
      eq(academyEnrollments.companyId, companyId),
      eq(academyEnrollments.userId, userId),
      eq(academyEnrollments.status, "active"),
      lte(academyEnrollments.startsAt, now),
      or(isNull(academyEnrollments.endsAt), gt(academyEnrollments.endsAt, now)),
      eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION),
      eq(academyEditions.isActive, true),
      eq(academyProducts.code, "allplan-pro"),
      eq(academyProducts.isActive, true),
    )).limit(1);
  return entitlement ? { ...entitlement, accessMode: entitlement.source === "purchase" ? "paid" : entitlement.accessMode } : null;
}

export const requireAllplanEntitlement = async (req: any, res: any, next: any) => {
  try {
    const certificateAdminAction = req.method === "POST" && /\/api\/academy\/allplan\/certificates\/BPA-\d{4}-[A-F0-9]{12}\/revoke$/i.test(String(req.originalUrl).split("?")[0]);
    if (certificateAdminAction && ["owner", "admin"].includes(req.user.role)) return next();
    const entitlement = await findAllplanEntitlement(req.user.companyId, req.user.userId);
    if (!entitlement) return res.status(403).json({ error: "Allplan eğitim erişimi etkin değil.", code: "ACADEMY_ENTITLEMENT_REQUIRED" });
    res.locals.allplanEntitlement = entitlement;
    next();
  } catch (error) {
    next(error);
  }
};
