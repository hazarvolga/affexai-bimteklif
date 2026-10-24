import { requireAuthEmailDelivery } from "../auth/email-policy";
import type { Express } from "express";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { companies, invitations, memberships, pilotApplications, quotationFinancials, quotationItems, quotations, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { bodyToken, readSessionToken, setSessionCookies } from "../auth/session-cookie";
import { acceptInvitation, invitationErrorResponse, invitationRateLimit, issueInvitation, previewInvitation, publicInvitation } from '../auth/invitations';
import { CompanyIndustrySettingsService, CompanyIndustrySettingsServiceError } from "../../services/company-industry-settings/service";

const industryIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function registerCompanyRoutes(app: Express, industrySettingsService: CompanyIndustrySettingsService = new CompanyIndustrySettingsService()) {
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

  app.get("/api/company/industry-settings", authenticate, async (req, res, next) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Şirket üyeliği gereklidir.", code: "COMPANY_MEMBERSHIP_REQUIRED" });
      res.json(await industrySettingsService.list(req.user));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/company/industry-settings", authenticate, checkRole(["owner", "admin"]), async (req, res, next) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Şirket üyeliği gereklidir.", code: "COMPANY_MEMBERSHIP_REQUIRED" });
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)
        || Object.keys(body).some((key) => key !== "industryId" && key !== "isEnabled")
        || typeof body.industryId !== "string" || !industryIdPattern.test(body.industryId)
        || typeof body.isEnabled !== "boolean") {
        return res.status(400).json({ error: "Geçersiz sektör ayarı.", code: "INDUSTRY_SETTING_INPUT_INVALID" });
      }
      const setting = await industrySettingsService.setEnabled(req.user, { industryId: body.industryId, isEnabled: body.isEnabled });
      res.json({ success: true, setting });
    } catch (error) {
      if (error instanceof CompanyIndustrySettingsServiceError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      next(error);
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

  app.get("/api/company/profile", authenticate, async (req, res) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Forbidden: Company membership required" });
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.companyId),
      });
      if (!company) return res.status(404).json({ error: "Company not found" });

      res.json({
        id: company.id,
        name: company.name,
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        taxOffice: company.taxOffice || "",
        taxNumber: company.taxNumber || "",
        logoUrl: company.logoUrl || null,
        defaultCurrency: company.defaultCurrency,
        defaultVatRate: company.defaultVatRate,
        countryCode: company.countryCode,
        measurementSystem: company.measurementSystem,
        activeStandard: company.activeStandard,
        classificationSystem: company.classificationSystem,
        isSmartcheckEnabled: company.isSmartcheckEnabled,
        createdAt: company.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company profile" });
    }
  });

  app.patch("/api/company/profile", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Forbidden: Company membership required" });

      const {
        name,
        email,
        phone,
        address,
        taxOffice,
        taxNumber,
        defaultCurrency,
        defaultVatRate,
        countryCode,
        measurementSystem,
        activeStandard,
        classificationSystem,
      } = req.body;

      const updateData: Record<string, any> = {};

      if (typeof name === "string" && name.trim().length > 0) {
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        updateData.email = typeof email === "string" ? email.trim() : null;
      }
      if (phone !== undefined) {
        updateData.phone = typeof phone === "string" ? phone.trim() : null;
      }
      if (address !== undefined) {
        updateData.address = typeof address === "string" ? address.trim() : null;
      }
      if (taxOffice !== undefined) {
        updateData.taxOffice = typeof taxOffice === "string" ? taxOffice.trim() : null;
      }
      if (taxNumber !== undefined) {
        updateData.taxNumber = typeof taxNumber === "string" ? taxNumber.trim() : null;
      }
      if (defaultCurrency && ["TRY", "USD", "EUR"].includes(defaultCurrency)) {
        updateData.defaultCurrency = defaultCurrency;
      }
      if (defaultVatRate !== undefined) {
        const vat = Number(defaultVatRate);
        if (Number.isFinite(vat) && vat >= 0 && vat <= 100) {
          updateData.defaultVatRate = Math.round(vat);
        }
      }
      if (countryCode && ["TR", "DE", "GB", "US", "AE"].includes(countryCode)) {
        updateData.countryCode = countryCode;
      }
      if (measurementSystem && ["metric", "imperial"].includes(measurementSystem)) {
        updateData.measurementSystem = measurementSystem;
      }
      if (activeStandard && ["TBDY_TS500", "EUROCODE_2", "ACI_318"].includes(activeStandard)) {
        updateData.activeStandard = activeStandard;
      }
      if (classificationSystem && ["CSB_TR", "DIN_276", "CSI_MASTERFORMAT", "NRM2_UK"].includes(classificationSystem)) {
        updateData.classificationSystem = classificationSystem;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update" });
      }

      const [updated] = await db.update(companies)
        .set(updateData)
        .where(eq(companies.id, req.user.companyId))
        .returning();

      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
        taxOffice: updated.taxOffice || "",
        taxNumber: updated.taxNumber || "",
        logoUrl: updated.logoUrl || null,
        defaultCurrency: updated.defaultCurrency,
        defaultVatRate: updated.defaultVatRate,
        countryCode: updated.countryCode,
        measurementSystem: updated.measurementSystem,
        activeStandard: updated.activeStandard,
        classificationSystem: updated.classificationSystem,
        isSmartcheckEnabled: updated.isSmartcheckEnabled,
        createdAt: updated.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update company profile" });
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

  app.post("/api/invitations", authenticate, checkRole(["owner", "admin"]), requireAuthEmailDelivery, invitationRateLimit('issue'), async (req, res) => {
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

  app.post("/api/invitations/:token/accept", async (req, res, next) => {
    if (req.headers.authorization) return authenticate(req, res, next);
    // Browser sessions are cookies: only an invitation addressed to an existing account needs the signed-in user.
    if (readSessionToken(req)) {
      try {
        if ((await previewInvitation(req.params.token)).requiresSignIn) return authenticate(req, res, next);
      } catch { /* invalid invitation: the accept handler below reports it */ }
    }
    next();
  }, invitationRateLimit('accept'), async (req, res) => {
    try {
      const accepted = await acceptInvitation(req.params.token, req.body, req.user);
      setSessionCookies(res, accepted.token);
      res.json({ ...accepted, token: bodyToken(req, accepted.token) });
    } catch (error) {
      invitationErrorResponse(error, res);
    }
  });
}
