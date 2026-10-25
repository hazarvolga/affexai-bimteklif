import type { Express } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { tenantOf, withAppTenant } from "../../db/app-tenant";
import { clients } from "../../db/schema";
import { authenticate } from "../middleware/auth";

export interface ClientTenantAccess {
  withTenant: typeof withAppTenant;
}

const defaultTenantAccess: ClientTenantAccess = {
  withTenant: withAppTenant,
};

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Müşteri adı zorunludur.").max(255),
  type: z.string().trim().max(100).default("company"),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(255).nullable().optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  pipelineStage: z.enum(["lead", "contacted", "quotation_sent", "negotiation", "won", "lost"]).default("lead"),
});

export function registerClientRoutes(app: Express, canMutate: any, tenantAccess: ClientTenantAccess = defaultTenantAccess) {
  app.get("/api/clients", authenticate, async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allClients = await tenantAccess.withTenant(tenantOf(req.user), (tenantDb) => tenantDb.select()
        .from(clients)
        .where(eq(clients.companyId, req.user.companyId))
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset));
      res.json(allClients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authenticate, canMutate, async (req, res) => {
    try {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || "Geçersiz müşteri verisi" });
      }
      const data = {
        name: parsed.data.name,
        type: parsed.data.type,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        pipelineStage: parsed.data.pipelineStage,
        companyId: req.user.companyId,
      };
      const [newClient] = await tenantAccess.withTenant(tenantOf(req.user), (tenantDb) =>
        tenantDb.insert(clients).values(data).returning()
      );
      res.json(newClient);
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });
}
