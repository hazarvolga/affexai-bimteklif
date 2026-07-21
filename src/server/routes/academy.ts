import type { Express } from "express";
import crypto from "crypto";
import { and, asc, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { allplanCertificateAuditLogs, allplanCertificates, allplanExamAttempts, allplanLessonActivity, allplanLessonBookmarks, allplanLessonNotes, allplanLessonProgress, companies, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { requireAllplanEntitlement } from "../middleware/academyEntitlement";
import { ALLPLAN_DETAILED_LESSONS, ALLPLAN_TRACK, getAllplanCoverageReport } from "../../academy/allplan/track";
import type { AllplanCurriculumNode, AllplanLesson, AllplanLessonSummary } from "../../academy/allplan/types";
import { ALLPLAN_ASSESSMENT, ALLPLAN_MAX_DAILY_ATTEMPTS, ALLPLAN_PROGRAM_VERSION, evaluateCertificationEligibility, publicAssessment, scoreAssessment } from "../../academy/allplan/certification";

const validSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);
const findLesson = (slug: string) => validSlug(slug) ? ALLPLAN_DETAILED_LESSONS.find(item => item.slug === slug) : undefined;
const cleanNote = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 5000) : "";
const requiredLessonSlugs = ALLPLAN_DETAILED_LESSONS.map(lesson => lesson.slug);
const requiredCheckpointSlugs = ALLPLAN_DETAILED_LESSONS.filter(lesson => lesson.interactiveTool).map(lesson => lesson.slug);
const certificateNumber = () => `BPA-${new Date().getUTCFullYear()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const loadCertificationEligibility = async (companyId: string, userId: string) => {
  const rows = await db.select({
    lessonSlug: allplanLessonProgress.lessonSlug,
    completedAt: allplanLessonProgress.completedAt,
    checkpointCompletedAt: allplanLessonProgress.checkpointCompletedAt,
  }).from(allplanLessonProgress).where(and(eq(allplanLessonProgress.companyId, companyId), eq(allplanLessonProgress.userId, userId)));
  return evaluateCertificationEligibility({
    completedLessonSlugs: rows.filter(row => row.completedAt).map(row => row.lessonSlug),
    checkpointLessonSlugs: rows.filter(row => row.checkpointCompletedAt).map(row => row.lessonSlug),
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
  app.get("/api/academy/allplan/certificates/verify/:certificateNumber", async (req, res) => {
    const number = String(req.params.certificateNumber ?? "").trim().toUpperCase();
    if (!/^BPA-\d{4}-[A-F0-9]{12}$/.test(number)) return res.status(400).json({ error: "Geçersiz sertifika numarası." });
    const [certificate] = await db.select({ certificateNumber: allplanCertificates.certificateNumber, holderName: allplanCertificates.holderName, companyName: allplanCertificates.companyName, programVersion: allplanCertificates.programVersion, status: allplanCertificates.status, issuedAt: allplanCertificates.issuedAt, expiresAt: allplanCertificates.expiresAt, revokedAt: allplanCertificates.revokedAt }).from(allplanCertificates).where(eq(allplanCertificates.certificateNumber, number));
    if (!certificate) return res.status(404).json({ error: "Sertifika bulunamadı." });
    return res.json({ certificate });
  });

  app.use("/api/academy/allplan", authenticate, requireAllplanEntitlement);

  app.get("/api/academy/allplan/entitlement", (_req, res) => {
    return res.json({ entitlement: res.locals.allplanEntitlement });
  });

  app.get("/api/academy/allplan/curriculum", authenticate, async (_req, res) => {
    return res.json({ curriculum: ALLPLAN_TRACK.nodes.map(toCurriculumNode), coverage: getAllplanCoverageReport() });
  });

  app.get("/api/academy/allplan/lessons/:lessonSlug", authenticate, async (req, res) => {
    const lesson = findLesson(req.params.lessonSlug);
    if (!lesson) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    return res.json({ lesson });
  });

  app.get("/api/academy/allplan/lessons/:lessonSlug/activity", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const scope = and(eq(allplanLessonNotes.companyId, req.user.companyId), eq(allplanLessonNotes.userId, req.user.userId), eq(allplanLessonNotes.lessonSlug, req.params.lessonSlug));
    const [notes, [bookmark], [activity], [progress]] = await Promise.all([
      db.select().from(allplanLessonNotes).where(scope).orderBy(desc(allplanLessonNotes.createdAt)),
      db.select().from(allplanLessonBookmarks).where(and(eq(allplanLessonBookmarks.companyId, req.user.companyId), eq(allplanLessonBookmarks.userId, req.user.userId), eq(allplanLessonBookmarks.lessonSlug, req.params.lessonSlug))),
      db.select().from(allplanLessonActivity).where(and(eq(allplanLessonActivity.companyId, req.user.companyId), eq(allplanLessonActivity.userId, req.user.userId), eq(allplanLessonActivity.lessonSlug, req.params.lessonSlug))),
      db.select().from(allplanLessonProgress).where(and(eq(allplanLessonProgress.companyId, req.user.companyId), eq(allplanLessonProgress.userId, req.user.userId), eq(allplanLessonProgress.lessonSlug, req.params.lessonSlug))),
    ]);
    return res.json({ notes, bookmarked: Boolean(bookmark), activeSeconds: activity?.activeSeconds ?? 0, lastViewedAt: activity?.lastViewedAt ?? null, completed: Boolean(progress?.completedAt), checkpointCompleted: Boolean(progress?.checkpointCompletedAt) });
  });

  app.post("/api/academy/allplan/lessons/:lessonSlug/notes", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const body = cleanNote(req.body?.body);
    if (!body) return res.status(400).json({ error: "Not metni boş olamaz." });
    const [note] = await db.insert(allplanLessonNotes).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, body }).returning();
    return res.status(201).json({ note });
  });

  app.delete("/api/academy/allplan/lessons/:lessonSlug/notes/:noteId", authenticate, async (req, res) => {
    await db.delete(allplanLessonNotes).where(and(eq(allplanLessonNotes.id, req.params.noteId), eq(allplanLessonNotes.companyId, req.user.companyId), eq(allplanLessonNotes.userId, req.user.userId), eq(allplanLessonNotes.lessonSlug, req.params.lessonSlug)));
    return res.status(204).send();
  });

  app.put("/api/academy/allplan/lessons/:lessonSlug/bookmark", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug) || typeof req.body?.bookmarked !== "boolean") return res.status(400).json({ error: "Geçersiz bookmark isteği." });
    const scope = and(eq(allplanLessonBookmarks.companyId, req.user.companyId), eq(allplanLessonBookmarks.userId, req.user.userId), eq(allplanLessonBookmarks.lessonSlug, req.params.lessonSlug));
    if (req.body.bookmarked) await db.insert(allplanLessonBookmarks).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug }).onConflictDoNothing();
    else await db.delete(allplanLessonBookmarks).where(scope);
    return res.json({ bookmarked: req.body.bookmarked });
  });

  app.put("/api/academy/allplan/lessons/:lessonSlug/time", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const activeSeconds = Number(req.body?.activeSeconds);
    if (!Number.isInteger(activeSeconds) || activeSeconds < 0 || activeSeconds > 604800) return res.status(400).json({ error: "Geçersiz çalışma süresi." });
    const now = new Date();
    const [activity] = await db.insert(allplanLessonActivity).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, activeSeconds, lastViewedAt: now, updatedAt: now }).onConflictDoUpdate({ target: [allplanLessonActivity.userId, allplanLessonActivity.companyId, allplanLessonActivity.lessonSlug], set: { activeSeconds, lastViewedAt: now, updatedAt: now } }).returning();
    return res.json({ activeSeconds: activity.activeSeconds, lastViewedAt: activity.lastViewedAt });
  });

  app.get("/api/academy/allplan/progress", authenticate, async (req, res) => {
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

  app.put("/api/academy/allplan/progress/:lessonSlug", authenticate, async (req, res) => {
    const { lessonSlug } = req.params;
    if (!findLesson(lessonSlug) || typeof req.body?.completed !== "boolean") {
      return res.status(400).json({ error: "Geçersiz ders ilerleme verisi." });
    }
    try {
      const now = new Date();
      const completedAt = req.body.completed ? now : null;
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

  app.post("/api/academy/allplan/lessons/:lessonSlug/checkpoint", authenticate, async (req, res) => {
    if (!findLesson(req.params.lessonSlug)) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    const now = new Date();
    const [progress] = await db.insert(allplanLessonProgress).values({ companyId: req.user.companyId, userId: req.user.userId, lessonSlug: req.params.lessonSlug, checkpointCompletedAt: now, updatedAt: now }).onConflictDoUpdate({ target: [allplanLessonProgress.userId, allplanLessonProgress.companyId, allplanLessonProgress.lessonSlug], set: { checkpointCompletedAt: now, updatedAt: now } }).returning({ lessonSlug: allplanLessonProgress.lessonSlug, checkpointCompletedAt: allplanLessonProgress.checkpointCompletedAt });
    return res.json({ progress, checkpointCompleted: true });
  });

  app.get("/api/academy/allplan/certification", authenticate, async (req, res) => {
    const [eligibility, [certificate], [{ attemptsToday }]] = await Promise.all([
      loadCertificationEligibility(req.user.companyId, req.user.userId),
      db.select({ certificateNumber: allplanCertificates.certificateNumber, status: allplanCertificates.status, issuedAt: allplanCertificates.issuedAt }).from(allplanCertificates).where(and(eq(allplanCertificates.companyId, req.user.companyId), eq(allplanCertificates.userId, req.user.userId), eq(allplanCertificates.programVersion, ALLPLAN_PROGRAM_VERSION))),
      db.select({ attemptsToday: count() }).from(allplanExamAttempts).where(and(eq(allplanExamAttempts.companyId, req.user.companyId), eq(allplanExamAttempts.userId, req.user.userId), gte(allplanExamAttempts.completedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))),
    ]);
    return res.json({ programVersion: ALLPLAN_PROGRAM_VERSION, passingScore: 80, maxDailyAttempts: ALLPLAN_MAX_DAILY_ATTEMPTS, attemptsToday, eligibility, assessment: publicAssessment(), certificate: certificate ?? null, entitlement: res.locals.allplanEntitlement });
  });

  app.post("/api/academy/allplan/certification/attempts", authenticate, async (req, res) => {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== ALLPLAN_ASSESSMENT.length || answers.some(answer => !Number.isInteger(answer))) return res.status(400).json({ error: "Geçersiz sınav yanıtları." });
    const eligibility = await loadCertificationEligibility(req.user.companyId, req.user.userId);
    if (!eligibility.eligible) return res.status(409).json({ error: "Sertifika sınavı için ders ve checkpoint koşulları tamamlanmadı.", eligibility });
    const [{ attemptsToday }] = await db.select({ attemptsToday: count() }).from(allplanExamAttempts).where(and(eq(allplanExamAttempts.companyId, req.user.companyId), eq(allplanExamAttempts.userId, req.user.userId), gte(allplanExamAttempts.completedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
    if (attemptsToday >= ALLPLAN_MAX_DAILY_ATTEMPTS) return res.status(429).json({ error: "24 saatlik sınav deneme limiti doldu." });

    const result = scoreAssessment(answers, ALLPLAN_ASSESSMENT.map(question => question.answer));
    const outcome = await db.transaction(async tx => {
      const [attempt] = await tx.insert(allplanExamAttempts).values({ companyId: req.user.companyId, userId: req.user.userId, programVersion: ALLPLAN_PROGRAM_VERSION, answers, score: result.score, passed: result.passed }).returning({ id: allplanExamAttempts.id, score: allplanExamAttempts.score, passed: allplanExamAttempts.passed, completedAt: allplanExamAttempts.completedAt });
      if (!result.passed) return { attempt, certificate: null };
      const [[user], [company]] = await Promise.all([
        tx.select({ fullName: users.fullName }).from(users).where(eq(users.id, req.user.userId)),
        tx.select({ name: companies.name }).from(companies).where(eq(companies.id, req.user.companyId)),
      ]);
      if (!user || !company) throw new Error("Certificate identity snapshot unavailable");
      const [created] = await tx.insert(allplanCertificates).values({ certificateNumber: certificateNumber(), companyId: req.user.companyId, userId: req.user.userId, examAttemptId: attempt.id, programVersion: ALLPLAN_PROGRAM_VERSION, holderName: user.fullName, companyName: company.name }).onConflictDoNothing().returning();
      const [certificate] = created ? [created] : await tx.select().from(allplanCertificates).where(and(eq(allplanCertificates.companyId, req.user.companyId), eq(allplanCertificates.userId, req.user.userId), eq(allplanCertificates.programVersion, ALLPLAN_PROGRAM_VERSION)));
      if (created) await tx.insert(allplanCertificateAuditLogs).values({ certificateId: created.id, companyId: req.user.companyId, actorUserId: req.user.userId, action: "issued" });
      return { attempt, certificate: certificate ? { certificateNumber: certificate.certificateNumber, status: certificate.status, issuedAt: certificate.issuedAt } : null };
    });
    return res.status(201).json(outcome);
  });

  app.post("/api/academy/allplan/certificates/:certificateNumber/revoke", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
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
