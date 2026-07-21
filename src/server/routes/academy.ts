import type { Express } from "express";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { allplanLessonActivity, allplanLessonBookmarks, allplanLessonNotes, allplanLessonProgress } from "../../db/schema";
import { authenticate } from "../middleware/auth";
import { ALLPLAN_DETAILED_LESSONS, ALLPLAN_TRACK, getAllplanCoverageReport } from "../../academy/allplan/track";
import type { AllplanCurriculumNode, AllplanLesson, AllplanLessonSummary } from "../../academy/allplan/types";

const validSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);
const findLesson = (slug: string) => validSlug(slug) ? ALLPLAN_DETAILED_LESSONS.find(item => item.slug === slug) : undefined;
const cleanNote = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 5000) : "";

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
}
