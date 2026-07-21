import type { Express } from "express";
import crypto from "crypto";
import { and, asc, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { academyEditions, academyEnrollmentAuditLogs, academyEnrollments, academyPaymentEvents, academyProducts, allplanCertificateAuditLogs, allplanCertificates, allplanCheckpointAttempts, allplanExamAttempts, allplanLessonActivity, allplanLessonBookmarks, allplanLessonNotes, allplanLessonProgress, companies, memberships, usageLogs, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { requireAllplanEntitlement } from "../middleware/academyEntitlement";
import { ALLPLAN_DETAILED_LESSONS, ALLPLAN_TRACK, getAllplanCoverageReport } from "../../academy/allplan/track";
import type { AllplanCurriculumNode, AllplanLesson, AllplanLessonSummary } from "../../academy/allplan/types";
import { ALLPLAN_ASSESSMENT, ALLPLAN_MAX_DAILY_ATTEMPTS, ALLPLAN_PROGRAM_VERSION, evaluateCertificationEligibility, publicAssessment, scoreAssessment } from "../../academy/allplan/certification";
import { acceptedStudyDelta, requiredStudySeconds, validateCheckpointEvidence } from "../../academy/allplan/checkpoint";
import { answerFromAllplanLessons } from "../../academy/allplan/companion";
import { parseAcademyPaymentEvent, verifyAcademyPaymentSignature } from "../../academy/allplan/paymentWebhook";

const validSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);
const findLesson = (slug: string) => validSlug(slug) ? ALLPLAN_DETAILED_LESSONS.find(item => item.slug === slug) : undefined;
const cleanNote = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 5000) : "";
const validUuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const requiredLessonSlugs = ALLPLAN_DETAILED_LESSONS.map(lesson => lesson.slug);
const requiredCheckpointSlugs = ALLPLAN_DETAILED_LESSONS.filter(lesson => lesson.interactiveTool).map(lesson => lesson.slug);
const certificateNumber = () => `BPA-${new Date().getUTCFullYear()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
const effectiveCertificateStatus = (certificate: { status: string; expiresAt?: Date | null }) => certificate.status === "active" && certificate.expiresAt && certificate.expiresAt <= new Date() ? "expired" : certificate.status;
const safeHandler = (handler: any) => (req: any, res: any, next: any) => {
  try {
    Promise.resolve(handler(req, res, next)).catch(next);
  } catch (error) {
    next(error);
  }
};

const loadCertificationEligibility = async (companyId: string, userId: string) => {
  const [rows, activities] = await Promise.all([
    db.select({ lessonSlug: allplanLessonProgress.lessonSlug, completedAt: allplanLessonProgress.completedAt, checkpointCompletedAt: allplanLessonProgress.checkpointCompletedAt, checkpointVersion: allplanLessonProgress.checkpointVersion }).from(allplanLessonProgress).where(and(eq(allplanLessonProgress.companyId, companyId), eq(allplanLessonProgress.userId, userId))),
    db.select({ lessonSlug: allplanLessonActivity.lessonSlug, activeSeconds: allplanLessonActivity.activeSeconds }).from(allplanLessonActivity).where(and(eq(allplanLessonActivity.companyId, companyId), eq(allplanLessonActivity.userId, userId))),
  ]);
  const activityByLesson = new Map(activities.map(activity => [activity.lessonSlug, activity.activeSeconds]));
  return evaluateCertificationEligibility({
    completedLessonSlugs: rows.filter(row => {
      const lesson = findLesson(row.lessonSlug);
      return Boolean(row.completedAt && lesson && (activityByLesson.get(row.lessonSlug) ?? 0) >= requiredStudySeconds(lesson.estimatedMinutes));
    }).map(row => row.lessonSlug),
    checkpointLessonSlugs: rows.filter(row => row.checkpointCompletedAt && row.checkpointVersion === "v1").map(row => row.lessonSlug),
  }, requiredLessonSlugs, requiredCheckpointSlugs);
};

const toLessonSummary = (lesson: AllplanLesson): AllplanLessonSummary => ({
  sourceId: lesson.sourceId,
  slug: lesson.slug,
  title: lesson.title,
  subtitle: lesson.subtitle,
  estimatedMinutes: lesson.estimatedMinutes,
  seed: lesson.seed,
  interactiveTool: lesson.interactiveTool,
  contentStatus: lesson.contentStatus,
});

const toCurriculumNode = (node: typeof ALLPLAN_TRACK.nodes[number]): AllplanCurriculumNode => ({
  sourceId: node.sourceId,
  title: node.title,
  type: node.type,
  status: node.status,
  lessonsCount: node.lessonsCount,
  contentStatus: node.contentStatus,
  lesson: node.lesson ? toLessonSummary(node.lesson) : undefined,
  children: node.children.map(toCurriculumNode),
});

export function registerAcademyRoutes(app: Express) {
  const route = {
    get: (path: string, ...handlers: any[]) => app.get(path, ...handlers.map(safeHandler)),
    post: (path: string, ...handlers: any[]) => app.post(path, ...handlers.map(safeHandler)),
    put: (path: string, ...handlers: any[]) => app.put(path, ...handlers.map(safeHandler)),
    delete: (path: string, ...handlers: any[]) => app.delete(path, ...handlers.map(safeHandler)),
  };

  app.use("/api/academy/allplan", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    next();
  });

  route.get("/api/academy/allplan/certificates/verify/:certificateNumber", async (req, res) => {
    const number = String(req.params.certificateNumber ?? "").trim().toUpperCase();
    if (!/^BPA-\d{4}-[A-F0-9]{12}$/.test(number)) return res.status(400).json({ error: "Geçersiz sertifika numarası." });
    const [certificate] = await db.select({ certificateNumber: allplanCertificates.certificateNumber, holderName: allplanCertificates.holderName, companyName: allplanCertificates.companyName, programVersion: allplanCertificates.programVersion, status: allplanCertificates.status, issuedAt: allplanCertificates.issuedAt, expiresAt: allplanCertificates.expiresAt, revokedAt: allplanCertificates.revokedAt }).from(allplanCertificates).where(eq(allplanCertificates.certificateNumber, number));
    if (!certificate) return res.status(404).json({ error: "Sertifika bulunamadı." });
    return res.json({ certificate: { ...certificate, status: effectiveCertificateStatus(certificate) } });
  });

  route.post("/api/academy/allplan/webhooks/payment", async (req, res) => {
    const secret = process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET ?? "";
    if (!secret) return res.status(503).json({ error: "Academy payment webhook yapılandırılmamış." });
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
    if (!verifyAcademyPaymentSignature(rawBody, req.get("x-academy-signature") ?? undefined, secret)) return res.status(401).json({ error: "Geçersiz payment webhook imzası." });
    const event = parseAcademyPaymentEvent(req.body);
    if (!event) return res.status(400).json({ error: "Geçersiz payment webhook payload'u." });
    const accessEndsAt = event.accessEndsAt ? new Date(event.accessEndsAt) : null;
    if (event.type === "academy.purchase.completed" && accessEndsAt && accessEndsAt <= new Date()) return res.status(400).json({ error: "Satın alma erişim bitiş tarihi gelecekte olmalıdır." });
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const now = new Date();

    const outcome = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`academy-payment:${event.provider}:${event.eventId}`}))`);
      const [processed] = await tx.select({ id: academyPaymentEvents.id, enrollmentId: academyPaymentEvents.enrollmentId }).from(academyPaymentEvents).where(and(eq(academyPaymentEvents.provider, event.provider), eq(academyPaymentEvents.eventId, event.eventId)));
      if (processed) return { duplicate: true as const, enrollmentId: processed.enrollmentId };
      const [semanticDuplicate] = await tx.select({ id: academyPaymentEvents.id, enrollmentId: academyPaymentEvents.enrollmentId }).from(academyPaymentEvents).where(and(eq(academyPaymentEvents.provider, event.provider), eq(academyPaymentEvents.paymentReference, event.paymentReference), eq(academyPaymentEvents.eventType, event.type)));
      if (semanticDuplicate) return { duplicate: true as const, enrollmentId: semanticDuplicate.enrollmentId };
      const [[membership], [edition]] = await Promise.all([
        tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.companyId, event.companyId), eq(memberships.userId, event.userId))),
        tx.select({ id: academyEditions.id }).from(academyEditions).innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId)).where(and(eq(academyProducts.code, "allplan-pro"), eq(academyProducts.isActive, true), eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION), eq(academyEditions.isActive, true))),
      ]);
      if (!membership) return { invalid: "PAYMENT_MEMBER_NOT_FOUND" as const };
      if (!edition) return { invalid: "PAYMENT_EDITION_NOT_FOUND" as const };
      const [existing] = await tx.select().from(academyEnrollments).where(and(eq(academyEnrollments.companyId, event.companyId), eq(academyEnrollments.userId, event.userId), eq(academyEnrollments.editionId, edition.id)));

      if (event.type === "academy.purchase.refunded") {
        const [completedPayment] = await tx.select({ id: academyPaymentEvents.id }).from(academyPaymentEvents).where(and(eq(academyPaymentEvents.provider, event.provider), eq(academyPaymentEvents.paymentReference, event.paymentReference), eq(academyPaymentEvents.eventType, "academy.purchase.completed"), eq(academyPaymentEvents.companyId, event.companyId), eq(academyPaymentEvents.userId, event.userId)));
        if (!completedPayment) return { invalid: "PAYMENT_REFERENCE_NOT_FOUND" as const };
        if (!existing || existing.source !== "purchase") return { invalid: "PURCHASE_ENROLLMENT_NOT_FOUND" as const };
      }
      let enrollment = existing;
      let action: "granted" | "extended" | "reactivated" | "refunded" | null = null;
      if (event.type === "academy.purchase.completed") {
        [enrollment] = existing
          ? await tx.update(academyEnrollments).set({ status: "active", source: "purchase", startsAt: now, endsAt: accessEndsAt, updatedAt: now }).where(eq(academyEnrollments.id, existing.id)).returning()
          : await tx.insert(academyEnrollments).values({ editionId: edition.id, companyId: event.companyId, userId: event.userId, status: "active", source: "purchase", startsAt: now, endsAt: accessEndsAt }).returning();
        action = existing ? (existing.status === "active" ? "extended" : "reactivated") : "granted";
      } else if (existing!.status !== "refunded") {
        [enrollment] = await tx.update(academyEnrollments).set({ status: "refunded", updatedAt: now }).where(eq(academyEnrollments.id, existing!.id)).returning();
        action = "refunded";
      }
      if (!enrollment) return { invalid: "PURCHASE_ENROLLMENT_NOT_FOUND" as const };
      if (action) await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: enrollment.id, companyId: event.companyId, actorUserId: event.userId, action, reason: event.type === "academy.purchase.refunded" ? "Doğrulanmış ödeme iadesi webhook'u" : null, details: { provider: event.provider, eventId: event.eventId, paymentReference: event.paymentReference, payloadHash } });
      await tx.insert(academyPaymentEvents).values({ provider: event.provider, eventId: event.eventId, eventType: event.type, companyId: event.companyId, userId: event.userId, enrollmentId: enrollment.id, paymentReference: event.paymentReference, payloadHash, processedAt: now });
      return { duplicate: false as const, enrollmentId: enrollment.id, status: enrollment.status };
    });

    if ("invalid" in outcome) return res.status(409).json({ error: outcome.invalid });
    return res.status(outcome.duplicate ? 200 : event.type === "academy.purchase.completed" ? 201 : 200).json({ processed: true, duplicate: outcome.duplicate, enrollmentId: outcome.enrollmentId, status: "status" in outcome ? outcome.status : undefined });
  });

  route.get("/api/academy/allplan/admin/enrollments", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    const rows = await db.select({ id: academyEnrollments.id, userId: academyEnrollments.userId, userName: users.fullName, userEmail: users.email, status: academyEnrollments.status, source: academyEnrollments.source, startsAt: academyEnrollments.startsAt, endsAt: academyEnrollments.endsAt, edition: academyEditions.version, accessMode: academyEditions.accessMode })
      .from(academyEnrollments)
      .innerJoin(users, eq(users.id, academyEnrollments.userId))
      .innerJoin(academyEditions, eq(academyEditions.id, academyEnrollments.editionId))
      .innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId))
      .where(and(eq(academyEnrollments.companyId, req.user.companyId), eq(academyProducts.code, "allplan-pro")))
      .orderBy(desc(academyEnrollments.updatedAt));
    return res.json({ enrollments: rows.map(row => ({ ...row, accessMode: row.source === "purchase" ? "paid" : row.accessMode })) });
  });

  route.post("/api/academy/allplan/admin/enrollments", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    const { userId } = req.body ?? {};
    const source = typeof req.body?.source === "string" ? req.body.source : "admin";
    if (!validUuid(userId) || !["pilot", "invite", "admin"].includes(source)) return res.status(400).json({ error: "Geçersiz enrollment isteği." });
    const endsAt = req.body?.endsAt ? new Date(req.body.endsAt) : null;
    if (endsAt && (!Number.isFinite(endsAt.getTime()) || endsAt <= new Date())) return res.status(400).json({ error: "Erişim bitiş tarihi gelecekte olmalıdır." });
    const [[membership], [edition]] = await Promise.all([
      db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.companyId, req.user.companyId))),
      db.select({ id: academyEditions.id }).from(academyEditions).innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId)).where(and(eq(academyProducts.code, "allplan-pro"), eq(academyProducts.isActive, true), eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION), eq(academyEditions.isActive, true))),
    ]);
    if (!membership) return res.status(404).json({ error: "Kullanıcı bu workspace üyesi değil." });
    if (!edition) return res.status(409).json({ error: "Aktif Allplan edition bulunamadı." });
    const [existing] = await db.select().from(academyEnrollments).where(and(eq(academyEnrollments.userId, userId), eq(academyEnrollments.companyId, req.user.companyId), eq(academyEnrollments.editionId, edition.id)));
    const now = new Date();
    const enrollment = await db.transaction(async tx => {
      const [saved] = existing
        ? await tx.update(academyEnrollments).set({ status: "active", source, startsAt: now, endsAt, updatedAt: now }).where(eq(academyEnrollments.id, existing.id)).returning()
        : await tx.insert(academyEnrollments).values({ editionId: edition.id, companyId: req.user.companyId, userId, status: "active", source, startsAt: now, endsAt }).returning();
      await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: saved.id, companyId: req.user.companyId, actorUserId: req.user.userId, action: existing ? (existing.status === "active" ? "extended" : "reactivated") : "granted", details: { source, endsAt: endsAt?.toISOString() ?? null } });
      return saved;
    });
    return res.status(existing ? 200 : 201).json({ enrollment });
  });

  route.post("/api/academy/allplan/admin/enrollments/:enrollmentId/status", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    if (!validUuid(req.params.enrollmentId) || !["revoked", "refunded"].includes(req.body?.status)) return res.status(400).json({ error: "Geçersiz enrollment statüsü." });
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : "";
    if (!reason) return res.status(400).json({ error: "Statü değişikliği nedeni zorunludur." });
    const [existing] = await db.select().from(academyEnrollments).where(and(eq(academyEnrollments.id, req.params.enrollmentId), eq(academyEnrollments.companyId, req.user.companyId)));
    if (!existing) return res.status(404).json({ error: "Enrollment bulunamadı." });
    if (existing.status === req.body.status) return res.status(409).json({ error: `Enrollment zaten ${req.body.status} statüsünde.` });
    const now = new Date();
    const [enrollment] = await db.transaction(async tx => {
      const updated = await tx.update(academyEnrollments).set({ status: req.body.status, updatedAt: now }).where(eq(academyEnrollments.id, existing.id)).returning();
      await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: existing.id, companyId: req.user.companyId, actorUserId: req.user.userId, action: req.body.status, reason, details: { previousStatus: existing.status } });
      return updated;
    });
    return res.json({ enrollment });
  });

  app.use("/api/academy/allplan", authenticate, requireAllplanEntitlement);

  route.get("/api/academy/allplan/entitlement", (_req, res) => {
    return res.json({ entitlement: res.locals.allplanEntitlement });
  });

  route.get("/api/academy/allplan/curriculum", authenticate, async (_req, res) => {
    return res.json({ curriculum: ALLPLAN_TRACK.nodes.map(toCurriculumNode), coverage: getAllplanCoverageReport() });
  });

  route.post("/api/academy/allplan/companion/query", authenticate, async (req, res) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (question.length < 3 || question.length > 500) return res.status(400).json({ error: "Soru 3 ile 500 karakter arasında olmalıdır." });
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const outcome = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`academy-companion:${req.user.companyId}:${req.user.userId}`}))`);
      const [usage] = await tx.select({ count: sql<number>`coalesce(sum(${usageLogs.count}), 0)` }).from(usageLogs).where(and(eq(usageLogs.companyId, req.user.companyId), eq(usageLogs.userId, req.user.userId), eq(usageLogs.feature, "ACADEMY_COMPANION_QUERY"), gte(usageLogs.date, since)));
      if (Number(usage?.count ?? 0) >= 30) return { rateLimited: true as const };
      const answer = answerFromAllplanLessons(question, ALLPLAN_DETAILED_LESSONS);
      await tx.insert(usageLogs).values({ companyId: req.user.companyId, userId: req.user.userId, feature: "ACADEMY_COMPANION_QUERY", count: 1, tokensUsed: 0, costEstimate: "0" });
      return answer;
    });
    if ("rateLimited" in outcome) return res.status(429).json({ error: "Companion saatlik 30 soru limitine ulaştı. Daha sonra tekrar deneyin." });
    return res.json(outcome);
  });

  route.get("/api/academy/allplan/lessons/:lessonSlug", authenticate, async (req, res) => {
    const lesson = findLesson(req.params.lessonSlug);
    if (!lesson) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    return res.json({ lesson });
  });

  route.get("/api/academy/allplan/lessons/:lessonSlug/activity", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const scope = and(eq(allplanLessonNotes.companyId, req.user.companyId), eq(allplanLessonNotes.userId, req.user.userId), eq(allplanLessonNotes.lessonSlug, req.params.lessonSlug));
    const [notes, [bookmark], [activity], [progress]] = await Promise.all([
      db.select().from(allplanLessonNotes).where(scope).orderBy(desc(allplanLessonNotes.createdAt)),
      db.select().from(allplanLessonBookmarks).where(and(eq(allplanLessonBookmarks.companyId, req.user.companyId), eq(allplanLessonBookmarks.userId, req.user.userId), eq(allplanLessonBookmarks.lessonSlug, req.params.lessonSlug))),
      db.select().from(allplanLessonActivity).where(and(eq(allplanLessonActivity.companyId, req.user.companyId), eq(allplanLessonActivity.userId, req.user.userId), eq(allplanLessonActivity.lessonSlug, req.params.lessonSlug))),
      db.select().from(allplanLessonProgress).where(and(eq(allplanLessonProgress.companyId, req.user.companyId), eq(allplanLessonProgress.userId, req.user.userId), eq(allplanLessonProgress.lessonSlug, req.params.lessonSlug))),
    ]);
    return res.json({ notes, bookmarked: Boolean(bookmark), activeSeconds: activity?.activeSeconds ?? 0, lastViewedAt: activity?.lastViewedAt ?? null, completed: Boolean(progress?.completedAt), checkpointCompleted: Boolean(progress?.checkpointCompletedAt && progress.checkpointVersion === "v1") });
  });

  route.post("/api/academy/allplan/lessons/:lessonSlug/notes", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const body = cleanNote(req.body?.body);
    if (!body) return res.status(400).json({ error: "Not metni boş olamaz." });
    const [note] = await db.insert(allplanLessonNotes).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, body }).returning();
    return res.status(201).json({ note });
  });

  route.delete("/api/academy/allplan/lessons/:lessonSlug/notes/:noteId", authenticate, async (req, res) => {
    await db.delete(allplanLessonNotes).where(and(eq(allplanLessonNotes.id, req.params.noteId), eq(allplanLessonNotes.companyId, req.user.companyId), eq(allplanLessonNotes.userId, req.user.userId), eq(allplanLessonNotes.lessonSlug, req.params.lessonSlug)));
    return res.status(204).send();
  });

  route.put("/api/academy/allplan/lessons/:lessonSlug/bookmark", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug) || typeof req.body?.bookmarked !== "boolean") return res.status(400).json({ error: "Geçersiz bookmark isteği." });
    const scope = and(eq(allplanLessonBookmarks.companyId, req.user.companyId), eq(allplanLessonBookmarks.userId, req.user.userId), eq(allplanLessonBookmarks.lessonSlug, req.params.lessonSlug));
    if (req.body.bookmarked) await db.insert(allplanLessonBookmarks).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug }).onConflictDoNothing();
    else await db.delete(allplanLessonBookmarks).where(scope);
    return res.json({ bookmarked: req.body.bookmarked });
  });

  route.put("/api/academy/allplan/lessons/:lessonSlug/time", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const deltaSeconds = Number(req.body?.deltaSeconds);
    if (!Number.isInteger(deltaSeconds) || deltaSeconds < 1 || deltaSeconds > 60) return res.status(400).json({ error: "Geçersiz çalışma süresi heartbeat'i." });
    const now = new Date();
    const scope = and(eq(allplanLessonActivity.companyId, req.user.companyId), eq(allplanLessonActivity.userId, req.user.userId), eq(allplanLessonActivity.lessonSlug, req.params.lessonSlug));
    const [current] = await db.select().from(allplanLessonActivity).where(scope);
    if (!current) {
      const [activity] = await db.insert(allplanLessonActivity).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, activeSeconds: 0, lastViewedAt: now, updatedAt: now }).onConflictDoNothing().returning();
      return res.json({ activeSeconds: activity?.activeSeconds ?? 0, lastViewedAt: activity?.lastViewedAt ?? now });
    }
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - current.lastViewedAt.getTime()) / 1000));
    const acceptedDelta = acceptedStudyDelta(deltaSeconds, elapsedSeconds);
    const activeSeconds = Math.min(604800, current.activeSeconds + acceptedDelta);
    const [activity] = await db.update(allplanLessonActivity).set({ activeSeconds, lastViewedAt: now, updatedAt: now }).where(scope).returning();
    return res.json({ activeSeconds: activity.activeSeconds, lastViewedAt: activity.lastViewedAt });
  });

  route.get("/api/academy/allplan/progress", authenticate, async (req, res) => {
    try {
      const rows = await db.select({ lessonSlug: allplanLessonProgress.lessonSlug, completedAt: allplanLessonProgress.completedAt })
        .from(allplanLessonProgress)
        .where(and(eq(allplanLessonProgress.companyId, req.user.companyId), eq(allplanLessonProgress.userId, req.user.userId), isNotNull(allplanLessonProgress.completedAt)))
        .orderBy(asc(allplanLessonProgress.lessonSlug));
      return res.json({ completedLessons: rows.map(row => row.lessonSlug), synced: true });
    } catch (error) {
      console.error("Allplan progress fetch error:", error);
      return res.status(500).json({ error: "Allplan ilerlemesi yüklenemedi." });
    }
  });

  route.put("/api/academy/allplan/progress/:lessonSlug", authenticate, async (req, res) => {
    const { lessonSlug } = req.params;
    if (!findLesson(lessonSlug) || typeof req.body?.completed !== "boolean") {
      return res.status(400).json({ error: "Geçersiz ders ilerleme verisi." });
    }
    try {
      const now = new Date();
      const completedAt = req.body.completed ? now : null;
      if (req.body.completed) {
        const lesson = findLesson(lessonSlug)!;
        const [[activity], [existingProgress]] = await Promise.all([
          db.select().from(allplanLessonActivity).where(and(eq(allplanLessonActivity.companyId, req.user.companyId), eq(allplanLessonActivity.userId, req.user.userId), eq(allplanLessonActivity.lessonSlug, lessonSlug))),
          db.select().from(allplanLessonProgress).where(and(eq(allplanLessonProgress.companyId, req.user.companyId), eq(allplanLessonProgress.userId, req.user.userId), eq(allplanLessonProgress.lessonSlug, lessonSlug))),
        ]);
        const requiredSeconds = requiredStudySeconds(lesson.estimatedMinutes);
        if (!activity || activity.activeSeconds < requiredSeconds) return res.status(409).json({ error: `Dersi tamamlamak için en az ${Math.ceil(requiredSeconds / 60)} dakika doğrulanmış çalışma süresi gerekir.`, requiredSeconds, activeSeconds: activity?.activeSeconds ?? 0 });
        if (lesson.interactiveTool && (!existingProgress?.checkpointCompletedAt || existingProgress.checkpointVersion !== "v1")) return res.status(409).json({ error: "Dersi tamamlamak için laboratuvar checkpoint'i doğrulanmalıdır." });
      }
      const [progress] = await db.insert(allplanLessonProgress).values({
        companyId: req.user.companyId,
        userId: req.user.userId,
        lessonSlug,
        completedAt,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [allplanLessonProgress.userId, allplanLessonProgress.companyId, allplanLessonProgress.lessonSlug],
        set: { completedAt, updatedAt: now },
      }).returning({ lessonSlug: allplanLessonProgress.lessonSlug, completedAt: allplanLessonProgress.completedAt });
      return res.json({ progress, synced: true });
    } catch (error) {
      console.error("Allplan progress update error:", error);
      return res.status(500).json({ error: "Allplan ilerlemesi kaydedilemedi." });
    }
  });

  route.post("/api/academy/allplan/lessons/:lessonSlug/checkpoint", authenticate, async (req, res) => {
    const lesson = findLesson(req.params.lessonSlug);
    if (!lesson) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    if (!lesson.interactiveTool) return res.status(400).json({ error: "Bu ders için laboratuvar checkpoint'i tanımlı değil." });
    const evidence = req.body?.evidence && typeof req.body.evidence === "object" ? req.body.evidence as Record<string, unknown> : {};
    if (JSON.stringify(evidence).length > 2000) return res.status(413).json({ error: "Checkpoint kanıtı izin verilen boyutu aşıyor." });
    const [activity] = await db.select().from(allplanLessonActivity).where(and(eq(allplanLessonActivity.companyId, req.user.companyId), eq(allplanLessonActivity.userId, req.user.userId), eq(allplanLessonActivity.lessonSlug, req.params.lessonSlug)));
    if (!activity || activity.activeSeconds < 30) return res.status(409).json({ error: "Checkpoint için önce doğrulanmış ders çalışma süresi gerekir." });
    const now = new Date();
    const outcome = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${req.user.companyId}:${req.user.userId}:${req.params.lessonSlug}:checkpoint`}))`);
      const [{ attempts }] = await tx.select({ attempts: count() }).from(allplanCheckpointAttempts).where(and(eq(allplanCheckpointAttempts.companyId, req.user.companyId), eq(allplanCheckpointAttempts.userId, req.user.userId), eq(allplanCheckpointAttempts.lessonSlug, req.params.lessonSlug), gte(allplanCheckpointAttempts.attemptedAt, new Date(now.getTime() - 15 * 60 * 1000))));
      if (attempts >= 10) return { rateLimited: true as const };
      const passed = validateCheckpointEvidence(lesson.interactiveTool!, evidence);
      await tx.insert(allplanCheckpointAttempts).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, tool: lesson.interactiveTool!, evidence, passed, attemptedAt: now });
      if (!passed) return { passed: false as const };
      const [progress] = await tx.insert(allplanLessonProgress).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, checkpointCompletedAt: now, checkpointEvidence: evidence, checkpointVersion: "v1", updatedAt: now }).onConflictDoUpdate({ target: [allplanLessonProgress.userId, allplanLessonProgress.companyId, allplanLessonProgress.lessonSlug], set: { checkpointCompletedAt: now, checkpointEvidence: evidence, checkpointVersion: "v1", updatedAt: now } }).returning({ lessonSlug: allplanLessonProgress.lessonSlug, checkpointCompletedAt: allplanLessonProgress.checkpointCompletedAt });
      return { passed: true as const, progress };
    });
    if ("rateLimited" in outcome) return res.status(429).json({ error: "Checkpoint deneme limiti doldu. 15 dakika sonra tekrar deneyin." });
    if (!outcome.passed) return res.status(400).json({ error: "Laboratuvar checkpoint kanıtı geçersiz." });
    const { progress } = outcome;
    return res.json({ progress, checkpointCompleted: true });
  });

  route.get("/api/academy/allplan/certification", authenticate, async (req, res) => {
    const [eligibility, [certificate], [{ attemptsToday }]] = await Promise.all([
      loadCertificationEligibility(req.user.companyId, req.user.userId),
      db.select({ certificateNumber: allplanCertificates.certificateNumber, status: allplanCertificates.status, issuedAt: allplanCertificates.issuedAt, expiresAt: allplanCertificates.expiresAt }).from(allplanCertificates).where(and(eq(allplanCertificates.companyId, req.user.companyId), eq(allplanCertificates.userId, req.user.userId), eq(allplanCertificates.programVersion, ALLPLAN_PROGRAM_VERSION))),
      db.select({ attemptsToday: count() }).from(allplanExamAttempts).where(and(eq(allplanExamAttempts.companyId, req.user.companyId), eq(allplanExamAttempts.userId, req.user.userId), gte(allplanExamAttempts.completedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))),
    ]);
    return res.json({ programVersion: ALLPLAN_PROGRAM_VERSION, passingScore: 80, maxDailyAttempts: ALLPLAN_MAX_DAILY_ATTEMPTS, attemptsToday, eligibility, assessment: publicAssessment(), certificate: certificate ? { ...certificate, status: effectiveCertificateStatus(certificate) } : null, entitlement: res.locals.allplanEntitlement });
  });

  route.post("/api/academy/allplan/certification/attempts", authenticate, async (req, res) => {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== ALLPLAN_ASSESSMENT.length || answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= ALLPLAN_ASSESSMENT[index].options.length)) return res.status(400).json({ error: "Geçersiz sınav yanıtları." });
    const eligibility = await loadCertificationEligibility(req.user.companyId, req.user.userId);
    if (!eligibility.eligible) return res.status(409).json({ error: "Sertifika sınavı için ders ve checkpoint koşulları tamamlanmadı.", eligibility });

    const result = scoreAssessment(answers, ALLPLAN_ASSESSMENT.map(question => question.answer));
    const outcome = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${req.user.companyId}:${req.user.userId}:${ALLPLAN_PROGRAM_VERSION}`}))`);
      const [{ attemptsToday }] = await tx.select({ attemptsToday: count() }).from(allplanExamAttempts).where(and(eq(allplanExamAttempts.companyId, req.user.companyId), eq(allplanExamAttempts.userId, req.user.userId), gte(allplanExamAttempts.completedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
      if (attemptsToday >= ALLPLAN_MAX_DAILY_ATTEMPTS) return { rateLimited: true as const };
      const [attempt] = await tx.insert(allplanExamAttempts).values({ companyId: req.user.companyId, userId: req.user.userId, programVersion: ALLPLAN_PROGRAM_VERSION, answers, score: result.score, passed: result.passed }).returning({ id: allplanExamAttempts.id, score: allplanExamAttempts.score, passed: allplanExamAttempts.passed, completedAt: allplanExamAttempts.completedAt });
      if (!result.passed) return { attempt, certificate: null };
      const [[user], [company]] = await Promise.all([
        tx.select({ fullName: users.fullName }).from(users).where(eq(users.id, req.user.userId)),
        tx.select({ name: companies.name }).from(companies).where(eq(companies.id, req.user.companyId)),
      ]);
      if (!user || !company) throw new Error("Certificate identity snapshot unavailable");
      const [created] = await tx.insert(allplanCertificates).values({ certificateNumber: certificateNumber(), companyId: req.user.companyId, userId: req.user.userId, examAttemptId: attempt.id, programVersion: ALLPLAN_PROGRAM_VERSION, holderName: user.fullName, companyName: company.name }).onConflictDoNothing({ target: [allplanCertificates.userId, allplanCertificates.companyId, allplanCertificates.programVersion] }).returning();
      const [certificate] = created ? [created] : await tx.select().from(allplanCertificates).where(and(eq(allplanCertificates.companyId, req.user.companyId), eq(allplanCertificates.userId, req.user.userId), eq(allplanCertificates.programVersion, ALLPLAN_PROGRAM_VERSION)));
      if (created) await tx.insert(allplanCertificateAuditLogs).values({ certificateId: created.id, companyId: req.user.companyId, actorUserId: req.user.userId, action: "issued" });
      return { attempt, certificate: certificate ? { certificateNumber: certificate.certificateNumber, status: certificate.status, issuedAt: certificate.issuedAt } : null };
    });
    if ("rateLimited" in outcome) return res.status(429).json({ error: "24 saatlik sınav deneme limiti doldu." });
    return res.status(201).json(outcome);
  });

  route.post("/api/academy/allplan/certificates/:certificateNumber/revoke", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : "";
    if (!reason) return res.status(400).json({ error: "İptal nedeni zorunludur." });
    const [certificate] = await db.select().from(allplanCertificates).where(and(eq(allplanCertificates.certificateNumber, req.params.certificateNumber.toUpperCase()), eq(allplanCertificates.companyId, req.user.companyId)));
    if (!certificate) return res.status(404).json({ error: "Sertifika bulunamadı." });
    if (certificate.status === "revoked") return res.status(409).json({ error: "Sertifika zaten iptal edilmiş." });
    const now = new Date();
    await db.transaction(async tx => {
      await tx.update(allplanCertificates).set({ status: "revoked", revokedAt: now, revokeReason: reason }).where(eq(allplanCertificates.id, certificate.id));
      await tx.insert(allplanCertificateAuditLogs).values({ certificateId: certificate.id, companyId: req.user.companyId, actorUserId: req.user.userId, action: "revoked", reason });
    });
    return res.json({ certificateNumber: certificate.certificateNumber, status: "revoked", revokedAt: now });
  });
}
