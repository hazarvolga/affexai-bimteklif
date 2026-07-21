import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { academyEditions, academyEnrollmentAuditLogs, academyEnrollments, academyProducts, companies, memberships, subscriptions, users } from "../../db/schema";
import { ALLPLAN_PROGRAM_VERSION } from "../../academy/allplan/certification";
import { AuthService } from "../../services/auth/authService";
import { authenticate } from "../middleware/auth";
import { parseRegistrationInput, publicRegisteredUser } from "../auth/registration";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = parseRegistrationInput(req.body);
      if (!input) return res.status(400).json({ error: "Kayıt bilgileri geçersiz." });
      const { email, password, fullName, companyName, intent } = input;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
      const passwordHash = await AuthService.hashPassword(password);
      const result = await db.transaction(async tx => {
        const [edition] = intent === "academy" ? await tx.select({ id: academyEditions.id }).from(academyEditions)
          .innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId))
          .where(and(eq(academyProducts.code, "allplan-pro"), eq(academyProducts.isActive, true), eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION), eq(academyEditions.accessMode, "free_pilot"), eq(academyEditions.isActive, true)))
          .limit(1) : [];
        if (intent === "academy" && !edition) throw new Error("ACADEMY_EDITION_UNAVAILABLE");
        const [company] = await tx.insert(companies).values({ name: companyName }).returning();
        const [user] = await tx.insert(users).values({ email, fullName, passwordHash }).returning();
        await tx.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
        await tx.insert(subscriptions).values({ companyId: company.id, plan: "starter" });
        if (edition) {
          const [enrollment] = await tx.insert(academyEnrollments).values({ editionId: edition.id, companyId: company.id, userId: user.id, status: "active", source: "pilot" }).returning();
          await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: enrollment.id, companyId: company.id, actorUserId: user.id, action: "granted", reason: "Ücretsiz Academy öğrenci kaydı", details: { registrationIntent: "academy" } });
        }
        return { company, user, academyEnrolled: Boolean(edition) };
      });

      const token = AuthService.generateToken({ userId: result.user.id, companyId: result.company.id, role: "owner" });
      res.status(201).json({ token, user: publicRegisteredUser(result.user), company: result.company, role: "owner", academyEnrolled: result.academyEnrolled });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error && error.message === "ACADEMY_EDITION_UNAVAILABLE") return res.status(503).json({ error: "Ücretsiz Academy kaydı şu anda kullanılamıyor." });
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
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
