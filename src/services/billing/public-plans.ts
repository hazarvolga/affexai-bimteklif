import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { plans } from '../../db/schema';

/** The same published catalog powers public API and server-rendered surfaces. */
export async function readPublicPlans() {
  return db.select({
    id: plans.id, name: plans.name, monthlyPrice: plans.monthlyPrice,
    monthlyQuoteLimit: plans.monthlyQuoteLimit, monthlyIfcLimit: plans.monthlyIfcLimit,
    ifcMaxFileMb: plans.ifcMaxFileMb, ifcMaxConcurrent: plans.ifcMaxConcurrent,
    monthlyPdfLimit: plans.monthlyPdfLimit, monthlyAiLimit: plans.monthlyAiLimit,
    monthlyCrmLimit: plans.monthlyCrmLimit, monthlyRegulationLimit: plans.monthlyRegulationLimit,
    monthlyProfitAnalysisLimit: plans.monthlyProfitAnalysisLimit, storageMaxBytes: plans.storageMaxBytes,
    maxDocuments: plans.maxDocuments, isTrial: plans.isTrial, isActive: plans.isActive,
    isPublished: plans.isPublished, isFeatured: plans.isFeatured, displayOrder: plans.displayOrder,
    marketingBadge: plans.marketingBadge, marketingDescription: plans.marketingDescription,
  }).from(plans).where(and(eq(plans.isActive, true), eq(plans.isPublished, true)))
    .orderBy(asc(plans.displayOrder), asc(plans.monthlyPrice), asc(plans.name));
}

export type PublicPlan = Awaited<ReturnType<typeof readPublicPlans>>[number];
export type PublicPlanView = Pick<PublicPlan, 'name' | 'monthlyPrice' | 'monthlyQuoteLimit' | 'monthlyIfcLimit' | 'ifcMaxFileMb' | 'monthlyPdfLimit' | 'isTrial' | 'isActive' | 'isPublished' | 'displayOrder'>;
