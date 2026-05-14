import type { Express } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { clients } from "../../db/schema";
import { authenticate } from "../middleware/auth";

export function registerClientRoutes(app: Express, canMutate: any) {
  app.get("/api/clients", authenticate, async (req, res) => {
    try {
      const allClients = await db.select().from(clients).where(eq(clients.companyId, req.user.companyId)).orderBy(desc(clients.createdAt));
      res.json(allClients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authenticate, canMutate, async (req, res) => {
    try {
      const data = { ...req.body, companyId: req.user.companyId };
      const newClient = await db.insert(clients).values(data).returning();
      res.json(newClient[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });
}
