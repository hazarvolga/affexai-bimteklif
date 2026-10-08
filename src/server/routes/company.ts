import type { Express } from "express";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { companies, companyIndustrySettings, invitations, memberships, pilotApplications, quotationFinancials, quotationItems, quotations, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { acceptInvitation, invitationErrorResponse, invitationRateLimit, issueInvitation, previewInvitation, publicInvitation } from '../auth/invitations';

export function registerCompanyRoutes(app: Express) {
  app.get("/api/company/risk-calibration", authenticate, async (req, res) => {
    const [quotes, pricedItems, financialReports, pilots] = await Promise.all([
      db.select({ count: count() }).from(quotations).where(eq(quotations.companyId, req.user.companyId)),
      db.select({ count: count() }).from(quotationItems).where(and(eq(quotationItems.companyId, req.user.companyId), isNotNull(quotationItems.costUnitPrice))),
      db.select({ count: count() }).from(quotationFinancials).innerJoin(quotations, eq(quotationFinancials.quotationId, quotations.id)).where(eq(quotations.companyId, req.user.companyId)),
      db.select({ count: count() }).from(pilotApplications),
    ]);
    const quoteCount = Number(quotes[0]?.count || 0);
    const pricedItemCount = Number(pricedItems[0]?.count || 0);
    const observedQuotes = await db.select({ count: count() }).from(quotations).where(and(eq(quotations.companyId, req.user.companyId), eq(quotations.calibrationStatus, "collected")));
    res.json({
      quoteCount,
      pricedItemCount,
      financialReportCount: Number(financialReports[0]?.count || 0),
      pilotApplicationCount: Number(pilots[0]?.count || 0),
      observedQuoteCount: Number(observedQuotes[0]?.count || 0),
      minimumQuoteSamples: 5,
      readyForCalibration: quoteCount >= 5 && pricedItemCount >= 20,
      message: quoteCount >= 5 && pricedItemCount >= 20
        ? "Kalibrasyon için başlangıç veri eşiği karşılandı; katsayılar uzman incelemesiyle güncellenebilir."
        : "Kalibrasyon için en az 5 teklif ve 20 maliyetli kalem gerekir. Mevcut varsayımlar otomatik değiştirilmez.",
    });
  });
  app.get("/api/company/risk-settings", authenticate, async (req, res) => {
    const company = await db.query.companies.findFirst({ where: eq(companies.id, req.user.companyId) });
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({
      escalationVolatilityPercent: Number(company.defaultEscalationVolatilityPercent),
      carbonRiskPremiumPercent: Number(company.defaultCarbonRiskPremiumPercent),
      informationDeliveryCostPercent: Number(company.defaultInformationDeliveryCostPercent),
    });
  });

  app.get("/api/company/risk-calibration/report", authenticate, async (req, res) => {
    const rows = await db.select({
      plannedCost: quotationFinancials.totalCost,
      plannedDuration: quotations.projectDurationMonths,
      actualCost: quotations.observedActualCost,
      actualDuration: quotations.observedActualDurationMonths,
    }).from(quotations)
      .innerJoin(quotationFinancials, eq(quotationFinancials.quotationId, quotations.id))
      .where(and(eq(quotations.companyId, req.user.companyId), eq(quotations.calibrationStatus, "collected"), isNotNull(quotations.observedActualCost)));
    const observations = rows.map((row) => ({
      plannedCost: Number(row.plannedCost),
      actualCost: Number(row.actualCost),
      plannedDuration: Number(row.plannedDuration),
      actualDuration: row.actualDuration == null ? null : Number(row.actualDuration),
    })).filter((row) => Number.isFinite(row.plannedCost) && Number.isFinite(row.actualCost));
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const costBiasPercent = average(observations.map((row) => row.plannedCost > 0 ? ((row.actualCost - row.plannedCost) / row.plannedCost) * 100 : 0));
    const durationBiasPercent = average(observations.filter((row) => row.actualDuration !== null && row.plannedDuration > 0).map((row) => ((row.actualDuration! - row.plannedDuration) / row.plannedDuration) * 100));
    res.json({
      status: observations.length >= 5 ? "review_ready" : "insufficient_data",
      observationCount: observations.length,
      averagePlannedCost: average(observations.map((row) => row.plannedCost)),
      averageActualCost: average(observations.map((row) => row.actualCost)),
      costBiasPercent,
      durationBiasPercent,
      recommendation: observations.length >= 5
        ? "Sapmaları uzmanla inceleyin; şirket varsayımlarını yalnızca onay sonrası güncelleyin."
        : "Otomatik katsayı önerisi için en az 5 maliyet gözlemi gerekir.",
    });
  });

  app.post("/api/company/risk-settings", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    const parsePercent = (value: unknown) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
    const [updated] = await db.update(companies).set({
      defaultEscalationVolatilityPercent: String(parsePercent(req.body.escalationVolatilityPercent)),
      defaultCarbonRiskPremiumPercent: String(parsePercent(req.body.carbonRiskPremiumPercent)),
      defaultInformationDeliveryCostPercent: String(parsePercent(req.body.informationDeliveryCostPercent)),
    }).where(eq(companies.id, req.user.companyId)).returning();
    res.json({
      escalationVolatilityPercent: Number(updated.defaultEscalationVolatilityPercent),
      carbonRiskPremiumPercent: Number(updated.defaultCarbonRiskPremiumPercent),
      informationDeliveryCostPercent: Number(updated.defaultInformationDeliveryCostPercent),
    });
  });

  app.get("/api/company/team", authenticate, async (req, res) => {
    const members = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.companyId, req.user.companyId));

    res.json(members);
  });

  app.get("/api/company/industry-settings", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const settings = await db.select().from(companyIndustrySettings)
        .where(eq(companyIndustrySettings.companyId, companyId));

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industry settings" });
    }
  });

  app.post("/api/company/industry-settings", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { industryId, isEnabled } = req.body;
      const companyId = req.user.companyId;

      await db.insert(companyIndustrySettings)
        .values({ companyId, industryId, isEnabled })
        .onConflictDoUpdate({
          target: [companyIndustrySettings.companyId, companyIndustrySettings.industryId],
          set: { isEnabled }
        });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update industry settings" });
    }
  });

  app.get("/api/company", authenticate, async (req, res) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Forbidden: Company membership required" });
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.companyId),
        columns: { id: true, name: true, logoUrl: true, defaultCurrency: true, defaultVatRate: true },
      });
      res.json(company || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.get("/api/invitations", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const invites = await db.select().from(invitations).where(eq(invitations.companyId, req.user.companyId)).orderBy(desc(invitations.createdAt));
      res.json(invites.map(publicInvitation));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.post("/api/invitations", authenticate, checkRole(["owner", "admin"]), invitationRateLimit('issue'), async (req, res) => {
    try {
      const result = await issueInvitation(req.user.companyId, req.user.userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      invitationErrorResponse(error, res);
    }
  });

  app.get("/api/invitations/:token", invitationRateLimit('preview'), async (req, res) => {
    try {
      res.json(await previewInvitation(req.params.token));
    } catch (error) {
      invitationErrorResponse(error, res);
    }
  });

  app.post("/api/invitations/:token/accept", (req, res, next) => {
    if (req.headers.authorization) return authenticate(req, res, next);
    next();
  }, invitationRateLimit('accept'), async (req, res) => {
    try {
      res.json(await acceptInvitation(req.params.token, req.body, req.user));
    } catch (error) {
      invitationErrorResponse(error, res);
    }
  });

  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await db.query.users.findFirst({
        where: eq(users.verificationToken, token)
      });

      if (!user) {
        return res.status(404).json({ error: "Invalid verification token" });
      }

      await db.update(users)
        .set({
          emailVerified: new Date(),
          verificationToken: null
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Email successfully verified!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
}
