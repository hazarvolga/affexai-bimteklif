export const ALLPLAN_PROGRAM_VERSION = "2026.1";
export const ALLPLAN_PASSING_SCORE = 80;
export const ALLPLAN_MAX_DAILY_ATTEMPTS = 3;

export const ALLPLAN_ASSESSMENT = [
  { id: "q1", prompt: "Bir Allplan dersinin tamamlanması sertifika için tek başına yeterli midir?", options: ["Evet", "Hayır; gerekli checkpoint ve sınav da tamamlanmalıdır"], answer: 1 },
  { id: "q2", prompt: "Model tabanlı metraj çıktısı nasıl değerlendirilmelidir?", options: ["Doğrudan onaylı sonuç", "Kaynak model ve kurallarla doğrulanması gereken çıktı"], answer: 1 },
  { id: "q3", prompt: "Native laboratuvar sonucu neyi temsil eder?", options: ["Öğrenme checkpoint'ini", "Resmi mühendislik onayını"], answer: 0 },
  { id: "q4", prompt: "Eksik içerikli bir Structural modülü hangi durumda açılmalıdır?", options: ["Başlığı varsa", "Kaynak, teknik review ve doğrulanabilir çıktı sözleşmesini geçerse"], answer: 1 },
  { id: "q5", prompt: "Allplan ders içeriği hangi erişim katmanında sunulur?", options: ["Public sayfada", "Authenticated Academy alanında"], answer: 1 },
] as const;

export const publicAssessment = () => ALLPLAN_ASSESSMENT.map(({ answer: _answer, ...question }) => question);

export type CertificationProgress = {
  completedLessonSlugs: string[];
  checkpointLessonSlugs: string[];
};

export type CertificationEligibility = {
  eligible: boolean;
  completedLessons: number;
  requiredLessons: number;
  completedCheckpoints: number;
  requiredCheckpoints: number;
};

export function evaluateCertificationEligibility(
  progress: CertificationProgress,
  requiredLessonSlugs: string[],
  requiredCheckpointSlugs: string[],
): CertificationEligibility {
  const completed = new Set(progress.completedLessonSlugs);
  const checkpoints = new Set(progress.checkpointLessonSlugs);
  const completedLessons = requiredLessonSlugs.filter(slug => completed.has(slug)).length;
  const completedCheckpoints = requiredCheckpointSlugs.filter(slug => checkpoints.has(slug)).length;

  return {
    eligible: completedLessons === requiredLessonSlugs.length && completedCheckpoints === requiredCheckpointSlugs.length,
    completedLessons,
    requiredLessons: requiredLessonSlugs.length,
    completedCheckpoints,
    requiredCheckpoints: requiredCheckpointSlugs.length,
  };
}

export function scoreAssessment(answers: number[], answerKey: number[]) {
  if (answers.length !== answerKey.length || answerKey.length === 0) return { score: 0, passed: false };
  const correct = answerKey.reduce((total, answer, index) => total + (answers[index] === answer ? 1 : 0), 0);
  const score = Math.round((correct / answerKey.length) * 100);
  return { score, passed: score >= ALLPLAN_PASSING_SCORE };
}
