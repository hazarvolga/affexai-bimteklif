import type { Express } from "express";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { allplanLessonProgress } from "../../db/schema";
import { authenticate } from "../middleware/auth";

const validSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);

export function registerAcademyRoutes(app: Express) {
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
