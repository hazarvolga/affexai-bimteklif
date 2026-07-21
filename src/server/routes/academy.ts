import type { Express } from "express";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { allplanLessonProgress } from "../../db/schema";
import { authenticate } from "../middleware/auth";
import { ALLPLAN_DETAILED_LESSONS, ALLPLAN_TRACK, getAllplanCoverageReport } from "../../academy/allplan/track";
import type { AllplanCurriculumNode, AllplanLesson, AllplanLessonSummary } from "../../academy/allplan/types";

const validSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);

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
    const lesson = validSlug(req.params.lessonSlug)
      ? ALLPLAN_DETAILED_LESSONS.find(item => item.slug === req.params.lessonSlug)
      : undefined;
    if (!lesson) return res.status(404).json({ error: "Allplan dersi bulunamadı." });
    return res.json({ lesson });
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
    if (!validSlug(lessonSlug) || typeof req.body?.completed !== "boolean") {
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
}
