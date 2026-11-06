// Academy profile and certificate view models. Moved out of the removed Firebase
// data layer (2026-11-06); data now lives in PostgreSQL behind the Academy APIs.

export interface NoteData {
  id?: string;
  moduleId: string;
  moduleTitle: string;
  text: string;
  createdAt: number;
}

export interface BookmarkData {
  moduleId: string;
  moduleTitle: string;
  bookmarkedAt: number;
}

export interface ExamAttemptData {
  id?: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  timestamp: number;
}

export interface TraineeUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  completedCount: number;
  totalCount: number;
  highestExamScore: number | null;
  certStatus: 'earned' | 'pending' | 'revoked';
  certHash?: string;
  updatedAt?: number;
  /** lessonTitle -> seconds spent */
  lessonTimes?: Record<string, number>;
  /** Weekly study hour goal */
  weeklyStudyGoal?: number;
  /** Manually logged additional hours */
  extraStudyHours?: number;
}
