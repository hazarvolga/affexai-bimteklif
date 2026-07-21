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
  return entitlement ?? null;
}

export const requireAllplanEntitlement = async (req: any, res: any, next: any) => {
  const entitlement = await findAllplanEntitlement(req.user.companyId, req.user.userId);
  if (!entitlement) return res.status(403).json({ error: "Allplan eğitim erişimi etkin değil.", code: "ACADEMY_ENTITLEMENT_REQUIRED" });
  res.locals.allplanEntitlement = entitlement;
  next();
};
