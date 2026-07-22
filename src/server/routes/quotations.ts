import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { quotationItems, quotations } from "../../db/schema";
import { calculateLineItemTotal, calculateQuotationTotals, normalizeLineItem, validateQuotationItems } from "../../lib/calculations";
import { auditQuotationItems } from "../../lib/quotation-audit";
import { generateQuotationPdf } from "../../services/pdf/generate";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";

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
      const { items, ...quoteData } = req.body;
      const validationIssues = validateQuotationItems(items);
      if (validationIssues.length > 0) return res.status(400).json({ error: "Teklif kalemleri doğrulanamadı.", issues: validationIssues });
      const normalizedItems = Array.isArray(items)
        ? items.map((item: any) => ({
            ...item,
            ...normalizeLineItem(item),
          }))
        : [];
      const totals = calculateQuotationTotals(normalizedItems);

      const [newQuote] = await db.insert(quotations).values({
        ...quoteData,
        companyId: req.user.companyId,
        subtotal: String(totals.subtotal),
        discountTotal: String(totals.discountTotal),
        vatTotal: String(totals.vatTotal),
        grandTotal: String(totals.grandTotal),
        date: new Date(quoteData.date),
        expiryDate: new Date(quoteData.expiryDate),
        revisionVersion: 1,
        isLatest: true
      }).returning();

      if (normalizedItems.length > 0) {
        const itemsWithExtras = normalizedItems.map((item: any) => ({
          ...item,
          quotationId: newQuote.id,
          companyId: newQuote.companyId,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          discountPercent: String(item.discountPercent),
          vatPercent: String(item.vatPercent),
          costUnitPrice: item.costUnitPrice == null || item.costUnitPrice === "" ? null : String(item.costUnitPrice),
          wastePercent: String(item.wastePercent ?? 0),
          costCategory: item.costCategory || "material",
          quantitySource: item.quantitySource || "manual",
          priceSource: item.priceSource || "manual",
          sourceReference: item.sourceReference || null,
          verificationStatus: item.verificationStatus || "unverified",
          total: String(calculateLineItemTotal(item)),
        }));
        await db.insert(quotationItems).values(itemsWithExtras);
      }

      res.json(newQuote);
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.post("/api/quotations/:id/revision", authenticate, canMutate, async (req, res) => {
    try {
      const { id } = req.params;

      const original = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });

      if (!original) return res.status(404).json({ error: "Original quote not found" });

      const originalItems = await db.select()
        .from(quotationItems)
        .where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, req.user.companyId)));

      await db.update(quotations)
        .set({ isLatest: false })
        .where(and(
          eq(quotations.parentId, original.parentId || original.id),
          eq(quotations.companyId, req.user.companyId)
        ));

      const [newQuote] = await db.insert(quotations).values({
        ...original,
        id: undefined,
        parentId: original.parentId || original.id,
        revisionVersion: original.revisionVersion + 1,
        isLatest: true,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).returning();

      if (originalItems.length > 0) {
        const clonedItems = originalItems.map(item => ({
          ...item,
          id: undefined,
          quotationId: newQuote.id,
        }));
        await db.insert(quotationItems).values(clonedItems);
      }

      res.json(newQuote);
    } catch (error) {
      console.error("Revision error:", error);
      res.status(500).json({ error: "Failed to create revision" });
    }
  });

  app.patch("/api/quotations/:id/status", authenticate, canMutate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

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
