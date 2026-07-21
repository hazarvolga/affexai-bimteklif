import type { AllplanLesson } from './types';
import { fetchWithAuth } from '@/lib/api';

const STORAGE_KEY = 'bimplanacademy:allplan-progress:v1';

type ProgressStore = Record<string, string[]>;

const readStore = (): ProgressStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store: ProgressStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const userKey = (userId?: string, email?: string) => userId || email || 'anonymous';

export const getCompletedAllplanLessons = (userId?: string, email?: string): string[] => {
  return readStore()[userKey(userId, email)] ?? [];
};

export const isAllplanLessonCompleted = (lesson: AllplanLesson, userId?: string, email?: string) => {
  return getCompletedAllplanLessons(userId, email).includes(lesson.slug);
};

export const setAllplanLessonCompleted = (lesson: AllplanLesson, completed: boolean, userId?: string, email?: string) => {
  const store = readStore();
  const key = userKey(userId, email);
  const current = new Set(store[key] ?? []);
  completed ? current.add(lesson.slug) : current.delete(lesson.slug);
  store[key] = [...current];
  writeStore(store);
};

export const syncAllplanProgress = async () => {
  const response = await fetchWithAuth('/api/academy/allplan/progress');
  if (!response.ok) throw new Error('Progress sync failed');
  const data = await response.json() as { completedLessons?: string[] };
  return data.completedLessons ?? [];
};

export const syncAllplanLessonProgress = async (lesson: AllplanLesson, completed: boolean) => {
  const response = await fetchWithAuth(`/api/academy/allplan/progress/${encodeURIComponent(lesson.slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error ?? 'Progress update failed');
  }
  return response.json();
};

export const syncAllplanLessonTime = async (lesson: AllplanLesson, deltaSeconds: number) => {
  const response = await fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lesson.slug)}/time`, {
    method: 'PUT',
    body: JSON.stringify({ deltaSeconds }),
  });
  if (!response.ok) throw new Error('Study time update failed');
  const data = await response.json() as { activeSeconds: number };
  return data.activeSeconds;
};

export const syncAllplanLessonCheckpoint = async (lesson: AllplanLesson, evidence: unknown) => {
  const response = await fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lesson.slug)}/checkpoint`, { method: 'POST', body: JSON.stringify({ evidence }) });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error ?? 'Checkpoint update failed');
  }
};
