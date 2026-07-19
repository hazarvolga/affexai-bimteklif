import type { Express } from "express";
import crypto from "crypto";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { companies, companyIndustrySettings, invitations, memberships, pilotApplications, quotationFinancials, quotationItems, quotations, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";

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

  app.get("/api/company", async (req, res) => {
    try {
      const company = await db.query.companies.findFirst();
      res.json(company || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.get("/api/invitations", authenticate, async (req, res) => {
    try {
      const invites = await db.select().from(invitations).where(eq(invitations.companyId, req.user.companyId)).orderBy(desc(invitations.createdAt));
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.post("/api/invitations", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { email, role } = req.body;
      const companyId = req.user.companyId;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [newInvite] = await db.insert(invitations).values({
        companyId,
        email,
        role: role || "viewer",
        token,
        invitedBy: req.user.userId,
        expiresAt,
      } as any).returning();

      console.log(`Invitation link: http://0.0.0.0:3000/accept-invite/${token}`);
      res.json(newInvite);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invite);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify invitation" });
    }
  });

  app.post("/api/invitations/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { fullName } = req.body;

      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: "Invalid or expired invitation" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");

      const [newUser] = await db.insert(users).values({
        email: invite.email,
        fullName,
        verificationToken,
        emailVerified: null,
      } as any).returning();

      await db.update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      console.log(`Verification link: http://0.0.0.0:3000/verify-email/${verificationToken}`);

      res.json(newUser);
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
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
