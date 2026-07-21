import { COURSE_TREE, type LessonNode } from './source/constants';
import { LESSONS_CONTENT, type LessonDetail } from './source/lessonsContent';
import type { AllplanCoverageReport, AllplanLesson, AllplanModuleNode, AllplanTrack } from './types';

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const parseMinutes = (value: string) => Number(value.match(/\d+/)?.[0] ?? 25);

const normalizeLesson = (sourceId: string, detail: LessonDetail): AllplanLesson => ({
  sourceId,
  slug: slugify(detail.title),
  title: detail.title,
  subtitle: detail.subtitle,
  introduction: detail.introduction,
  steps: detail.steps,
  recommendation: detail.recommendation,
  estimatedMinutes: parseMinutes(detail.estimatedTime),
  seed: detail.seed,
  interactiveTool: detail.interactiveTool,
  attachments: detail.attachments,
  contentStatus: 'verified',
});

const normalizeNode = (node: LessonNode): AllplanModuleNode => {
  const detail = LESSONS_CONTENT[node.title];
  const children = (node.children ?? []).map(normalizeNode);
  return {
    sourceId: node.id,
    title: node.title,
    type: node.type,
    status: node.status,
    lessonsCount: node.lessonsCount,
    children,
    lesson: detail ? normalizeLesson(node.id, detail) : undefined,
    contentStatus: detail ? 'verified' : 'needs-review',
  };
};

export const ALLPLAN_TRACK: AllplanTrack = {
  id: 'allplan-pro',
  title: 'Allplan Pro Track',
  description: 'Allplan modelleme, reinforcement, openBIM ve üretim odaklı BIM iş akışları.',
  sourceProject: 'allplanAkademi-main',
  nodes: COURSE_TREE.map(normalizeNode),
};

const walk = (nodes: AllplanModuleNode[], result: AllplanModuleNode[] = []) => {
  nodes.forEach(node => {
    result.push(node);
    walk(node.children, result);
  });
  return result;
};

export const ALLPLAN_NODES = walk(ALLPLAN_TRACK.nodes);
export const ALLPLAN_DETAILED_LESSONS = ALLPLAN_NODES.filter(node => node.lesson).map(node => node.lesson!);

export const getAllplanCoverageReport = (): AllplanCoverageReport => {
  const paths = ALLPLAN_NODES.filter(node => node.type === 'path');
  const courses = ALLPLAN_NODES.filter(node => node.type === 'course');
  const modules = ALLPLAN_NODES.filter(node => node.type === 'module');
  const reviewRequired = modules.filter(node => node.contentStatus === 'needs-review');
  const detailedLessonTitles = new Set(Object.keys(LESSONS_CONTENT));
  return {
    pathCount: paths.length,
    courseCount: courses.length,
    moduleCount: modules.length,
    detailedLessonCount: detailedLessonTitles.size,
    coveredModuleCount: modules.length - reviewRequired.length,
    reviewRequiredModuleCount: reviewRequired.length,
    coveragePercent: modules.length ? Math.round(((modules.length - reviewRequired.length) / modules.length) * 100) : 0,
    missingLessonTitles: reviewRequired.map(node => node.title),
  };
};
