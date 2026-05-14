import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, memberships, subscriptions, users } from "../../db/schema";
import { AuthService } from "../../services/auth/authService";
import { authenticate } from "../middleware/auth";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, companyName } = req.body;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(400).json({ error: "User already exists" });

      const [company] = await db.insert(companies).values({ name: companyName }).returning();
      const passwordHash = await AuthService.hashPassword(password);
      const [user] = await db.insert(users).values({ email, fullName, passwordHash }).returning();

      await db.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
      await db.insert(subscriptions).values({ companyId: company.id, plan: "starter" });

      const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: "owner" });
      res.json({ token, user, company });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !(await AuthService.comparePassword(password, user.passwordHash || ""))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;

      const token = AuthService.generateToken({
        userId: user.id,
        companyId: membership?.companyId || null,
        role: membership?.role || null
      });

      res.json({ token, user, company, role: membership?.role });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.user.userId) });
      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, req.user.userId));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;
      res.json({ user, company, role: membership?.role });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
}
