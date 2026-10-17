import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { quotationItems, quotations, smartcheckAuditLogs } from "../../db/schema";
import { manualQuotationInput, quotationStatusInput } from "../../services/quotations/input";
import { createManualQuotation, createQuotationRevision, QuotationIntegrityError } from "../../services/quotations/integrity";
import { auditQuotationItems } from "../../lib/quotation-audit";
import { generateQuotationPdf } from "../../services/pdf/generate";
import { PdfRenderError } from "../../services/pdf/renderer";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { QuotaError } from "../../services/billing/quota";
import { consumeRateLimit } from "../auth/security";
import { captureError } from "../observability/error-tracking";

export function registerQuotationRoutes(app: Express, canMutate: any) {
  const pdfRateLimit = async (req: any, res: any, next: any) => {
    const result = await consumeRateLimit(`pdf:${req.user.companyId}`, 10, 60_000);
    if (!result.allowed) {
      return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "PDF üretim limiti aşıldı. Lütfen bir dakika bekleyin." });
    }
    next();
  };

  const auditQuotation = async (req: any, action: string, quotationId: string, metadataJson: Record<string, unknown> = {}) => {
    try {
      const mergedMetadata = {
        ...metadataJson,
        ...(req.user?.impersonatedBy ? { impersonatedBy: req.user.impersonatedBy } : {}),
      };
      await db.insert(smartcheckAuditLogs).values({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action,
        entityType: "quotation",
        entityId: quotationId,
        metadataJson: mergedMetadata,
      });
    } catch (auditErr) {
      // The business action already succeeded; a lost audit row must still be visible to operators (Sentry), not only stdout.
      console.error("Failed to write quotation audit log:", auditErr);
      captureError(auditErr, { area: "quotation-audit", action, quotationId });
    }
  };

  app.get("/api/quotations", authenticate, async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allQuotes = await db.select()
        .from(quotations)
        .where(and(eq(quotations.isLatest, true), eq(quotations.companyId, req.user.companyId)))
        .orderBy(desc(quotations.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(allQuotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id/smartcheck", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await db.query.quotations.findFirst({ where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)) });
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, req.user.companyId)));
      const issues = auditQuotationItems(items);
      res.json({ status: issues.some((issue) => issue.severity === 'warning') ? 'needs_review' : 'ready_for_review', authorityStatus: 'traceability_only', issues });
    } catch (error) {
      res.status(500).json({ error: "Quotation audit failed" });
    }
  });

  app.get("/api/quotations/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });

      if (!quote) return res.status(404).json({ error: "Quote not found" });

      const items = await db.select()
        .from(quotationItems)
        .where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, req.user.companyId)));

      const revisions = await db.select()
        .from(quotations)
        .where(
          and(
            eq(quotations.parentId, quote.parentId || quote.id),
            eq(quotations.companyId, quote.companyId)
          )
        )
        .orderBy(desc(quotations.revisionVersion));

      res.json({ ...quote, items, revisions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotation details" });
    }
  });

  app.post("/api/quotations", authenticate, canMutate, usageTracker("QUOTATION_CREATED"), async (req, res) => {
    try {
      const parsed = manualQuotationInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid quotation input", issues: parsed.error.issues });
      const newQuote = await createManualQuotation(req.user.companyId, parsed.data);
      await auditQuotation(req, "quotation.created", newQuote.id);
      res.json(newQuote);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      if (error instanceof QuotationIntegrityError) return res.status(error.status).json({ error: error.message });
      console.error("Quote creation error:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.post("/api/quotations/:id/revision", authenticate, canMutate, async (req, res) => {
    try {
      const newQuote = await createQuotationRevision(req.user.companyId, req.params.id);
      await auditQuotation(req, "quotation.revision_created", newQuote.id, { parentId: req.params.id });
      res.json(newQuote);
    } catch (error) {
      if (error instanceof QuotationIntegrityError) return res.status(error.status).json({ error: error.message });
      console.error("Revision error:", error);
      res.status(500).json({ error: "Failed to create revision" });
    }
  });

  app.patch("/api/quotations/:id/status", authenticate, canMutate, async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = quotationStatusInput.safeParse(req.body?.status);
      if (!parsed.success) return res.status(400).json({ error: "Invalid quotation status" });
      const status = parsed.data;

      const [updated] = await db.update(quotations)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Quotation not found" });
      await auditQuotation(req, "quotation.status_updated", updated.id, { status });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.patch("/api/quotations/:id/calibration", authenticate, canMutate, async (req, res) => {
    try {
      const actualCost = req.body.actualCost == null || req.body.actualCost === "" ? null : Number(req.body.actualCost);
      const actualDurationMonths = req.body.actualDurationMonths == null || req.body.actualDurationMonths === "" ? null : Number(req.body.actualDurationMonths);
      if (actualCost !== null && (!Number.isFinite(actualCost) || actualCost < 0)) return res.status(400).json({ error: "Gerçekleşen maliyet geçersiz." });
      if (actualDurationMonths !== null && (!Number.isInteger(actualDurationMonths) || actualDurationMonths < 1)) return res.status(400).json({ error: "Gerçekleşen süre geçersiz." });
      const [updated] = await db.update(quotations).set({
        observedActualCost: actualCost === null ? null : String(actualCost),
        observedActualDurationMonths: actualDurationMonths,
        calibrationStatus: actualCost !== null || actualDurationMonths !== null ? "collected" : "not_collected",
        calibrationNote: typeof req.body.note === "string" ? req.body.note.slice(0, 2000) : null,
        updatedAt: new Date(),
      }).where(and(eq(quotations.id, req.params.id), eq(quotations.companyId, req.user.companyId))).returning();
      if (!updated) return res.status(404).json({ error: "Quotation not found" });
      await auditQuotation(req, "quotation.calibrated", updated.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Calibration observation could not be saved" });
    }
  });

  app.get("/api/quotations/:id/pdf", authenticate, pdfRateLimit, canMutate, usageTracker("PDF_GENERATED"), async (req, res) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    req.once('aborted', cancel);
    res.once('close', cancel);
    try {
      const { id } = req.params;
      const { templateId } = req.query;

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const pdfBuffer = await generateQuotationPdf(id, templateId as string, req.user.companyId, req.query.includeEvidence === "true", controller.signal);
      if (controller.signal.aborted || res.destroyed) return;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=teklif-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      if (controller.signal.aborted || res.destroyed) return;
      if (error instanceof PdfRenderError) return res.status(error.status).set('Retry-After', '5').json({ error: 'PDF hizmeti meşgul; lütfen tekrar deneyin.', code: error.code });
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    } finally {
      req.removeListener('aborted', cancel);
      res.removeListener('close', cancel);
    }
  });
}
