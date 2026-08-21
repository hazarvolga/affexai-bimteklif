import type { Express } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, memberships, pilotApplications, subscriptions, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { actionUrl, deliverAuthLink, issueAuthAction } from "./auth";
import { publicRegisteredUser } from "../auth/registration";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function registerPilotRoutes(app: Express) {
  app.get("/api/pilot-applications/metrics", authenticate, checkRole(["owner", "admin"]), async (_req, res) => {
    try {
      const applications = await db.select().from(pilotApplications);
      const total = applications.length;
      const converted = applications.filter((application) => application.status === "converted").length;
      const paid = applications.filter((application) => application.paymentStatus === "paid").length;
      const conversionDays = applications
        .filter((application) => application.createdAt && application.convertedAt)
        .map((application) => (application.convertedAt!.getTime() - application.createdAt.getTime()) / 86400000);
      return res.json({ total, converted, paid, conversionRate: total ? converted / total : 0, paidRate: total ? paid / total : 0, averageDaysToConvert: conversionDays.length ? conversionDays.reduce((sum, days) => sum + days, 0) / conversionDays.length : null });
    } catch (error) {
      console.error("Pilot metrics error:", error);
      return res.status(500).json({ error: "Pilot metrikleri yüklenemedi." });
    }
  });

  app.get("/api/pilot-applications", authenticate, checkRole(["owner", "admin"]), async (_req, res) => {
    try {
      const applications = await db.select().from(pilotApplications).orderBy(desc(pilotApplications.createdAt));
      return res.json(applications);
    } catch (error) {
      console.error("Pilot applications fetch error:", error);
      return res.status(500).json({ error: "Pilot başvuruları yüklenemedi." });
    }
  });

  app.patch("/api/pilot-applications/:id", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    const allowedStatuses = ["new", "contacted", "qualified", "rejected", "converted"];
    const allowedPaymentStatuses = ["not_offered", "offered", "paid", "declined"];
    const status = clean(req.body?.status, 30);
    const paymentStatus = clean(req.body?.paymentStatus, 30);
    if (req.body?.status !== undefined && !allowedStatuses.includes(status)) return res.status(400).json({ error: "Geçersiz başvuru durumu." });
    if (req.body?.paymentStatus !== undefined && !allowedPaymentStatuses.includes(paymentStatus)) return res.status(400).json({ error: "Geçersiz ödeme durumu." });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body?.status !== undefined) updates.status = status;
    if (req.body?.paymentStatus !== undefined) {
      updates.paymentStatus = paymentStatus;
      if (paymentStatus === "offered") updates.offerSentAt = new Date();
      if (paymentStatus === "paid") updates.paidAt = new Date();
    }
    if (req.body?.offerAmount !== undefined) {
      const offerAmount = clean(req.body.offerAmount, 30);
      if (offerAmount && !/^\d+(\.\d{1,2})?$/.test(offerAmount)) return res.status(400).json({ error: "Teklif tutarı geçersiz." });
      updates.offerAmount = offerAmount || null;
    }

    try {
      const [existing] = await db.select().from(pilotApplications).where(eq(pilotApplications.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Pilot başvurusu bulunamadı." });
      const now = new Date();
      if (status === "contacted" && !existing.contactedAt) updates.contactedAt = now;
      if (status === "qualified" && !existing.qualifiedAt) updates.qualifiedAt = now;
      if (status === "converted" && !existing.convertedAt) updates.convertedAt = now;
      const [application] = await db.update(pilotApplications)
        .set(updates)
        .where(eq(pilotApplications.id, req.params.id))
        .returning();
      return res.json(application);
    } catch (error) {
      console.error("Pilot application update error:", error);
      return res.status(500).json({ error: "Pilot başvurusu güncellenemedi." });
    }
  });

  app.post("/api/pilot-applications/:id/convert", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const [application] = await db.select().from(pilotApplications).where(eq(pilotApplications.id, req.params.id));
      if (!application) return res.status(404).json({ error: "Pilot başvurusu bulunamadı." });
      if (application.provisionedCompanyId) return res.status(409).json({ error: "Bu başvuru zaten bir hesaba dönüştürülmüş." });

      const [existingUser] = await db.select().from(users).where(eq(users.email, application.email));
      if (existingUser) return res.status(409).json({ error: "Bu e-postayla zaten bir hesap var. Yeni şirket için mevcut kullanıcıyı elle davet edin." });

      const result = await db.transaction(async (tx) => {
        const [company] = await tx.insert(companies).values({ name: application.companyName, phone: application.phone ?? undefined }).returning();
        const [user] = await tx.insert(users).values({ email: application.email, fullName: application.fullName, passwordHash: null, emailVerified: new Date() }).returning();
        await tx.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
        await tx.insert(subscriptions).values({ companyId: company.id, plan: "starter" });
        return { company, user };
      });

      const resetToken = await issueAuthAction(result.user.id, "reset_password", 7 * 24 * 60 * 60 * 1000);
      const setPasswordUrl = await deliverAuthLink("reset_password", result.user.email, actionUrl(`/reset-password/${resetToken}`));

      const now = new Date();
      const [updatedApplication] = await db.update(pilotApplications)
        .set({
          status: "converted",
          convertedAt: application.convertedAt ?? now,
          provisionedCompanyId: result.company.id,
          provisionedUserId: result.user.id,
          updatedAt: now,
        })
        .where(eq(pilotApplications.id, req.params.id))
        .returning();

      return res.status(201).json({
        application: updatedApplication,
        company: result.company,
        user: publicRegisteredUser(result.user),
        ...(setPasswordUrl ? { setPasswordUrl } : {}),
      });
    } catch (error) {
      console.error("Pilot application conversion error:", error);
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ error: "Bu e-postayla zaten bir hesap var." });
      return res.status(500).json({ error: "Pilot başvurusu hesaba dönüştürülemedi." });
    }
  });

  app.post("/api/pilot-applications", async (req, res) => {
    const fullName = clean(req.body?.fullName, 120);
    const companyName = clean(req.body?.companyName, 160);
    const email = clean(req.body?.email, 240).toLowerCase();
    const phone = clean(req.body?.phone, 40) || null;
    const teamSize = clean(req.body?.teamSize, 40) || null;
    const currentWorkflow = clean(req.body?.currentWorkflow, 2000) || null;
    const consent = req.body?.consent === true;

    if (!fullName || !companyName || !email || !consent) {
      return res.status(400).json({ error: "Ad, şirket, e-posta ve iletişim onayı zorunludur." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Geçerli bir e-posta adresi girin." });
    }

    try {
      const [application] = await db.insert(pilotApplications).values({
        fullName,
        companyName,
        email,
        phone,
        teamSize,
        currentWorkflow,
        consentAt: new Date(),
      }).returning({ id: pilotApplications.id, status: pilotApplications.status });

      return res.status(201).json({ application });
    } catch (error) {
      console.error("Pilot application error:", error);
      return res.status(500).json({ error: "Pilot başvurusu alınamadı." });
    }
  });
}
