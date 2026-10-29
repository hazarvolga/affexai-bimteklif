import type { Express } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { tenantOf, withAppTenant } from "../../db/app-tenant";
import { activities, clients, deals, quotations } from "../../db/schema";
import {
  appendClientStageNote,
  CLIENT_STAGE_MAP,
  normalizeClientStageKey,
  parseClientNotes,
} from "../../lib/client-notes";
import { authenticate } from "../middleware/auth";

export interface ClientTenantAccess {
  withTenant: typeof withAppTenant;
}

const defaultTenantAccess: ClientTenantAccess = {
  withTenant: withAppTenant,
};

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_CLIENT_NOTES_CHARS = 20_000;

function safeText(max: number, requiredMsg?: string) {
  const base = z
    .string()
    .trim()
    .max(max)
    .refine((val) => !CONTROL_CHARS_RE.test(val), "Geçersiz kontrol karakteri içeriyor.");
  return requiredMsg ? base.min(1, requiredMsg) : base;
}

const clientTypeSchema = z.enum(["company", "person"]);

const pipelineStageSchema = z.enum([
  "lead",
  "contacted",
  "quotation_sent",
  "negotiation",
  "won",
  "lost",
]);

const createClientSchema = z.strictObject({
  name: safeText(255, "Müşteri adı zorunludur."),
  type: clientTypeSchema.default("company"),
  phone: safeText(50).nullable().optional(),
  email: safeText(255).nullable().optional(),
  address: safeText(1000).nullable().optional(),
  notes: safeText(MAX_CLIENT_NOTES_CHARS).nullable().optional(),
  pipelineStage: pipelineStageSchema.default("lead"),
});

const updateClientSchema = z.strictObject({
  name: safeText(255, "Müşteri adı zorunludur.").optional(),
  type: clientTypeSchema.optional(),
  phone: safeText(50).nullable().optional(),
  email: safeText(255).nullable().optional(),
  address: safeText(1000).nullable().optional(),
  notes: safeText(MAX_CLIENT_NOTES_CHARS).nullable().optional(),
  pipelineStage: pipelineStageSchema.optional(),
  stageNote: z
    .strictObject({
      stage: pipelineStageSchema.optional(),
      content: safeText(4000, "Not içeriği zorunludur."),
    })
    .optional(),
});

const appendClientNoteSchema = z.strictObject({
  stage: pipelineStageSchema,
  content: safeText(4000, "Not içeriği zorunludur."),
  updatePipelineStage: z.boolean().optional().default(false),
});

const bulkImportClientsSchema = z.strictObject({
  clients: z.array(createClientSchema).min(1, "En az 1 müşteri satırı gereklidir.").max(500),
  duplicateStrategy: z.enum(["update", "skip"]).default("update"),
});

const clientIdParamSchema = z.strictObject({
  id: z.string().uuid("Geçersiz müşteri kimliği."),
});

function ensureCompanyId(req: any, res: any): string | null {
  const companyId = req.user?.companyId;
  if (typeof companyId !== "string" || !companyId.trim()) {
    res.status(403).json({ error: "Şirket üyeliği gereklidir.", code: "COMPANY_REQUIRED" });
    return null;
  }
  return companyId;
}

function capNotesLength(notes: string | null | undefined): string | null {
  if (!notes) return null;
  return notes.length > MAX_CLIENT_NOTES_CHARS ? notes.slice(0, MAX_CLIENT_NOTES_CHARS) : notes;
}

export function registerClientRoutes(
  app: Express,
  canMutate: any,
  tenantAccess: ClientTenantAccess = defaultTenantAccess,
) {
  app.get("/api/clients", authenticate, async (req, res) => {
    if (!ensureCompanyId(req, res)) return;
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allClients = await tenantAccess.withTenant(tenantOf(req.user), (tenantDb) =>
        tenantDb
          .select()
          .from(clients)
          .where(eq(clients.companyId, req.user.companyId))
          .orderBy(desc(clients.createdAt))
          .limit(limit)
          .offset(offset),
      );
      res.json(allClients);
    } catch {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // This is an impact preview, not a deletion request or a complete personal-data inventory.
  app.get("/api/clients/:id/deletion-impact", authenticate, async (req, res) => {
    const companyId = ensureCompanyId(req, res);
    if (!companyId) return;
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bu önizleme yalnızca firma sahibi ve yöneticisine açıktır." });
    }
    const parsed = clientIdParamSchema.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz müşteri kimliği." });
    const id = parsed.data.id;
    try {
      const result = await tenantAccess.withTenant(tenantOf(req.user), (tenantDb) => tenantDb.execute<{
        client_id: string; quotations: number; revisions: number; deals: number; activities: number;
      }>(sql`
        SELECT ${clients.id} AS client_id,
          (SELECT COUNT(*)::int FROM ${quotations} q WHERE q.client_id = ${clients.id} AND q.company_id = ${companyId}) AS quotations,
          (SELECT COUNT(*)::int FROM ${quotations} q WHERE q.client_id = ${clients.id} AND q.company_id = ${companyId} AND q.revision_version > 1) AS revisions,
          (SELECT COUNT(*)::int FROM ${deals} d WHERE d.client_id = ${clients.id} AND d.company_id = ${companyId}) AS deals,
          (SELECT COUNT(*)::int FROM ${activities} a JOIN ${deals} d ON d.id = a.deal_id AND d.company_id = a.company_id
             WHERE d.client_id = ${clients.id} AND d.company_id = ${companyId} AND a.company_id = ${companyId}) AS activities
        FROM ${clients} WHERE ${clients.id} = ${id} AND ${clients.companyId} = ${companyId}
      `), { readOnly: true, isolationLevel: "repeatable read" });
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: "Müşteri bulunamadı." });
      return res.json({
        clientId: row.client_id,
        counts: { quotations: row.quotations, revisions: row.revisions, deals: row.deals, activities: row.activities },
        limitations: [
          "Bu önizleme silme talebi oluşturmaz ve herhangi bir veriyi silmez.",
          "Serbest metinler, müşteriyle doğrudan bağlantısı bulunmayan adaylar, dosyalar, denetim kayıtları, yedekler ve dış servislerdeki kopyalar hesaplanmaz.",
          "Başka firmalardaki olası ilişkiler güvenlik nedeniyle hesaplanmaz; bu sayımlar tüm bağımlılıkları veya kaydın silinebilirliğini garanti etmez.",
          "Bu sayımlar tüm kişisel verilerin veya yasal saklama yükümlülüklerinin eksiksiz envanteri değildir.",
        ],
      });
    } catch {
      return res.status(500).json({ error: "Müşteri kayıtlarının önizlemesi yüklenemedi." });
    }
  });

  app.post("/api/clients", authenticate, canMutate, async (req, res) => {
    if (!ensureCompanyId(req, res)) return;
    try {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || "Geçersiz müşteri verisi" });
      }
      const rawNotes = parsed.data.notes?.trim() || null;
      const formattedNotes = capNotesLength(
        rawNotes && !rawNotes.includes("[[STAGE_NOTE|")
          ? appendClientStageNote(
              null,
              {
                stage: parsed.data.pipelineStage,
                content: rawNotes,
                author: req.user?.email,
              },
              parsed.data.pipelineStage,
            )
          : rawNotes,
      );

      const data = {
        name: parsed.data.name,
        type: parsed.data.type,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: formattedNotes,
        pipelineStage: parsed.data.pipelineStage,
        companyId: req.user.companyId,
      };
      const [newClient] = await tenantAccess.withTenant(tenantOf(req.user), (tenantDb) =>
        tenantDb.insert(clients).values(data).returning(),
      );
      res.json(newClient);
    } catch {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.get("/api/clients/:id", authenticate, async (req, res) => {
    if (!ensureCompanyId(req, res)) return;
    const paramParsed = clientIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      return res.status(400).json({ error: "Geçersiz müşteri kimliği." });
    }
    const clientId = paramParsed.data.id;
    try {
      const detail = await tenantAccess.withTenant(tenantOf(req.user), async (tenantDb) => {
        const [client] = await tenantDb
          .select()
          .from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId)));
        if (!client) return null;

        const clientDeals = await tenantDb
          .select()
          .from(deals)
          .where(and(eq(deals.clientId, clientId), eq(deals.companyId, req.user.companyId)))
          .orderBy(desc(deals.createdAt));

        const clientQuotations = await tenantDb
          .select({
            id: quotations.id,
            quoteNumber: quotations.quoteNumber,
            projectName: quotations.projectName,
            status: quotations.status,
            currency: quotations.currency,
            grandTotal: quotations.grandTotal,
            date: quotations.date,
            createdAt: quotations.createdAt,
          })
          .from(quotations)
          .where(and(eq(quotations.clientId, clientId), eq(quotations.companyId, req.user.companyId)))
          .orderBy(desc(quotations.createdAt));

        const fallbackDate =
          client.createdAt instanceof Date ? client.createdAt.toISOString() : String(client.createdAt);
        const stageNotes = parseClientNotes(client.notes, client.pipelineStage, fallbackDate);

        return {
          ...client,
          stageNotes,
          deals: clientDeals,
          quotations: clientQuotations,
        };
      });

      if (!detail) {
        return res.status(404).json({ error: "Müşteri bulunamadı." });
      }
      return res.json(detail);
    } catch {
      return res.status(500).json({ error: "Müşteri detayları yüklenemedi." });
    }
  });

  const handleUpdateClient = async (req: any, res: any) => {
    if (!ensureCompanyId(req, res)) return;
    const paramParsed = clientIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      return res.status(400).json({ error: "Geçersiz müşteri kimliği." });
    }
    const bodyParsed = updateClientSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.issues[0]?.message || "Geçersiz müşteri güncelleme verisi." });
    }

    const clientId = paramParsed.data.id;
    const input = bodyParsed.data;

    try {
      const updated = await tenantAccess.withTenant(tenantOf(req.user), async (tenantDb) => {
        const [existing] = await tenantDb
          .select()
          .from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId))).for("update");
        if (!existing) return null;
        if (existing.privacyStatus === "masked") throw new Error("CLIENT_PRIVACY_MASKED");

        const nextStage = input.pipelineStage ?? existing.pipelineStage;
        let nextNotes = input.notes !== undefined ? input.notes : existing.notes;

        if (input.stageNote?.content) {
          nextNotes = appendClientStageNote(
            nextNotes,
            {
              stage: input.stageNote.stage ?? nextStage,
              content: input.stageNote.content,
              author: req.user?.email,
            },
            existing.pipelineStage,
          );
        } else if (input.pipelineStage && input.pipelineStage !== existing.pipelineStage && input.notes === undefined) {
          const oldLabel = CLIENT_STAGE_MAP[normalizeClientStageKey(existing.pipelineStage)]?.label ?? existing.pipelineStage;
          const newLabel = CLIENT_STAGE_MAP[normalizeClientStageKey(input.pipelineStage)]?.label ?? input.pipelineStage;
          nextNotes = appendClientStageNote(
            nextNotes,
            {
              stage: input.pipelineStage,
              content: `Pipeline aşaması "${oldLabel}" adımından "${newLabel}" adımına güncellendi.`,
              author: req.user?.email,
            },
            existing.pipelineStage,
          );
        }

        const [row] = await tenantDb
          .update(clients)
          .set({
            name: input.name ?? existing.name,
            type: input.type ?? existing.type,
            phone: input.phone !== undefined ? input.phone || null : existing.phone,
            email: input.email !== undefined ? input.email || null : existing.email,
            address: input.address !== undefined ? input.address || null : existing.address,
            pipelineStage: nextStage,
            notes: capNotesLength(nextNotes),
          })
          .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId)))
          .returning();

        const fallbackDate = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
        return {
          ...row,
          stageNotes: parseClientNotes(row.notes, row.pipelineStage, fallbackDate),
        };
      });

      if (!updated) {
        return res.status(404).json({ error: "Müşteri bulunamadı." });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "CLIENT_PRIVACY_MASKED") return res.status(409).json({ error: "Maskelenmiş müşteri değiştirilemez." });
      return res.status(500).json({ error: "Müşteri güncellenemedi." });
    }
  };

  if (typeof app.patch === "function") {
    app.patch("/api/clients/:id", authenticate, canMutate, handleUpdateClient);
  }
  app.post("/api/clients/:id/update", authenticate, canMutate, handleUpdateClient);

  app.post("/api/clients/:id/notes", authenticate, canMutate, async (req, res) => {
    if (!ensureCompanyId(req, res)) return;
    const paramParsed = clientIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      return res.status(400).json({ error: "Geçersiz müşteri kimliği." });
    }
    const bodyParsed = appendClientNoteSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.issues[0]?.message || "Geçersiz not verisi." });
    }

    const clientId = paramParsed.data.id;
    const { stage, content, updatePipelineStage } = bodyParsed.data;

    try {
      const updated = await tenantAccess.withTenant(tenantOf(req.user), async (tenantDb) => {
        const [existing] = await tenantDb
          .select()
          .from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId))).for("update");
        if (!existing) return null;
        if (existing.privacyStatus === "masked") throw new Error("CLIENT_PRIVACY_MASKED");

        const nextStage = updatePipelineStage ? stage : existing.pipelineStage;
        const nextNotes = capNotesLength(
          appendClientStageNote(
            existing.notes,
            {
              stage,
              content,
              author: req.user?.email,
            },
            existing.pipelineStage,
          ),
        );

        const [row] = await tenantDb
          .update(clients)
          .set({
            notes: nextNotes,
            pipelineStage: nextStage,
          })
          .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId)))
          .returning();

        const fallbackDate = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
        return {
          ...row,
          stageNotes: parseClientNotes(row.notes, row.pipelineStage, fallbackDate),
        };
      });

      if (!updated) {
        return res.status(404).json({ error: "Müşteri bulunamadı." });
      }
      return res.status(201).json(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "CLIENT_PRIVACY_MASKED") return res.status(409).json({ error: "Maskelenmiş müşteriye not eklenemez." });
      return res.status(500).json({ error: "Müşteri notu kaydedilemedi." });
    }
  });

  app.post("/api/clients/bulk-import", authenticate, canMutate, async (req, res) => {
    if (!ensureCompanyId(req, res)) return;
    const parsed = bulkImportClientsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Geçersiz toplu müşteri verisi." });
    }
    const { clients: incomingRows, duplicateStrategy } = parsed.data;

    try {
      const summary = await tenantAccess.withTenant(tenantOf(req.user), async (tenantDb) => {
        const existingClients = await tenantDb
          .select()
          .from(clients)
          .where(eq(clients.companyId, req.user.companyId));

        const byEmail = new Map<string, typeof existingClients[number]>();
        const byName = new Map<string, typeof existingClients[number]>();
        for (const c of existingClients) {
          if (c.privacyStatus === "masked") continue;
          if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
          byName.set(c.name.trim().toLocaleLowerCase("tr-TR"), c);
        }

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const item of incomingRows) {
          const emailKey = item.email?.trim().toLowerCase() || "";
          const nameKey = item.name.trim().toLocaleLowerCase("tr-TR");
          const existing = (emailKey ? byEmail.get(emailKey) : undefined) ?? byName.get(nameKey);

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount += 1;
              continue;
            }

            let mergedNotes = existing.notes;
            if (item.notes && item.notes.trim()) {
              const incomingParsed = parseClientNotes(item.notes, item.pipelineStage);
              for (const n of [...incomingParsed].reverse()) {
                mergedNotes = appendClientStageNote(
                  mergedNotes,
                  {
                    stage: n.stage,
                    content: n.content,
                    author: req.user?.email,
                  },
                  existing.pipelineStage,
                );
              }
            }
            mergedNotes = capNotesLength(mergedNotes);

            const [updatedRow] = await tenantDb
              .update(clients)
              .set({
                type: item.type || existing.type,
                phone: item.phone || existing.phone,
                email: item.email || existing.email,
                address: item.address || existing.address,
                pipelineStage: item.pipelineStage || existing.pipelineStage,
                notes: mergedNotes,
              })
              .where(and(eq(clients.id, existing.id), eq(clients.companyId, req.user.companyId), ne(clients.privacyStatus, "masked")))
              .returning();

            if (!updatedRow) { skippedCount += 1; continue; }
            if (updatedRow) {
              if (updatedRow.email) byEmail.set(updatedRow.email.trim().toLowerCase(), updatedRow);
              byName.set(updatedRow.name.trim().toLocaleLowerCase("tr-TR"), updatedRow);
            }
            updatedCount += 1;
          } else {
            const rawNotes = item.notes?.trim() || null;
            const formattedNotes = capNotesLength(
              rawNotes && !rawNotes.includes("[[STAGE_NOTE|")
                ? appendClientStageNote(
                    null,
                    {
                      stage: item.pipelineStage,
                      content: rawNotes,
                      author: req.user?.email,
                    },
                    item.pipelineStage,
                  )
                : rawNotes,
            );

            const [createdRow] = await tenantDb
              .insert(clients)
              .values({
                companyId: req.user.companyId,
                name: item.name.trim(),
                type: item.type || "company",
                phone: item.phone || null,
                email: item.email || null,
                address: item.address || null,
                pipelineStage: item.pipelineStage || "lead",
                notes: formattedNotes,
              })
              .returning();

            if (createdRow) {
              if (createdRow.email) byEmail.set(createdRow.email.trim().toLowerCase(), createdRow);
              byName.set(createdRow.name.trim().toLocaleLowerCase("tr-TR"), createdRow);
            }
            createdCount += 1;
          }
        }

        return {
          createdCount,
          updatedCount,
          skippedCount,
          totalProcessed: incomingRows.length,
        };
      });

      return res.json(summary);
    } catch {
      return res.status(500).json({ error: "Toplu müşteri aktarımı tamamlanamadı." });
    }
  });
}
