import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { quotationItems, quotations } from "../../db/schema";
import { manualQuotationInput, quotationStatusInput } from "../../services/quotations/input";
import { createManualQuotation, createQuotationRevision, QuotationIntegrityError } from "../../services/quotations/integrity";
import { auditQuotationItems } from "../../lib/quotation-audit";
import { generateQuotationPdf } from "../../services/pdf/generate";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { QuotaError } from "../../services/billing/quota";

export function registerQuotationRoutes(app: Express, canMutate: any) {
  app.get("/api/quotations", authenticate, async (req, res) => {
    try {
      const allQuotes = await db.select()
        .from(quotations)
        .where(and(eq(quotations.isLatest, true), eq(quotations.companyId, req.user.companyId)))
        .orderBy(desc(quotations.createdAt));
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
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Calibration observation could not be saved" });
    }
  });

  app.get("/api/quotations/:id/pdf", authenticate, canMutate, usageTracker("PDF_GENERATED"), async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId } = req.query;

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const pdfBuffer = await generateQuotationPdf(id, templateId as string, req.user.companyId, req.query.includeEvidence === "true");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=teklif-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
}
