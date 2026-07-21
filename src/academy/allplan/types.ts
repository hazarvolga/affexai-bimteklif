export type AllplanContentStatus = 'verified' | 'needs-review';

export type AllplanInteractiveTool =
  | 'wall-simulator'
  | 'coordinate-calculator'
  | 'shortcut-trainer'
  | 'reinforcement-estimator';

export interface AllplanLessonStep {
  step: number;
  title: string;
  desc: string;
}

export interface AllplanLesson {
  sourceId: string;
  slug: string;
  title: string;
  subtitle: string;
  introduction: string;
  steps: AllplanLessonStep[];
  recommendation: string;
  estimatedMinutes: number;
  seed: string;
  interactiveTool?: AllplanInteractiveTool;
  attachments: { name: string; size: string }[];
  contentStatus: AllplanContentStatus;
}

export interface AllplanModuleNode {
  sourceId: string;
  title: string;
  type: 'path' | 'course' | 'module' | 'lesson';
  status: 'completed' | 'in-progress' | 'locked';
  lessonsCount?: string;
  children: AllplanModuleNode[];
  lesson?: AllplanLesson;
  contentStatus: AllplanContentStatus;
}

export interface AllplanTrack {
  id: 'allplan-pro';
  title: string;
  description: string;
  sourceProject: string;
  nodes: AllplanModuleNode[];
}

export interface AllplanCoverageReport {
  pathCount: number;
  courseCount: number;
  moduleCount: number;
  detailedLessonCount: number;
  coveredModuleCount: number;
  reviewRequiredModuleCount: number;
  coveragePercent: number;
  missingLessonTitles: string[];
}
