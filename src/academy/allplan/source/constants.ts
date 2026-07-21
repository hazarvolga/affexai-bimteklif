// Generated from allplanAkademi-main. Do not edit manually; rerun scripts/import-allplan-source.mjs.

export type ScreenType = 'LANDING' | 'DASHBOARD' | 'LESSON' | 'EXAM' | 'KNOWLEDGE_BASE' | 'ADMIN' | 'CERTIFICATES' | 'PROFILE';

export interface NavItem {
  id: ScreenType;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'LESSON', label: 'Lesson Viewer', icon: 'BookOpen' },
  { id: 'KNOWLEDGE_BASE', label: 'Knowledge Base', icon: 'Library' },
  { id: 'EXAM', label: 'Certification Exam', icon: 'GraduationCap' },
  { id: 'CERTIFICATES', label: 'My Certificates', icon: 'Award' },
  { id: 'ADMIN', label: 'Admin Panel', icon: 'ShieldCheck' },
];

export interface LessonNode {
  id: string;
  title: string;
  type: 'path' | 'course' | 'module' | 'lesson';
  status: 'completed' | 'in-progress' | 'locked';
  lessonsCount?: string;
  children?: LessonNode[];
}

export const COURSE_TREE: LessonNode[] = [
  {
    id: 'p1',
    title: '1. Allplan Fundamentals',
    type: 'path',
    status: 'in-progress',
    lessonsCount: '120 Lessons',
    children: [
      {
        id: 'p1-c1',
        title: 'Course 1 — Introduction to Allplan',
        type: 'course',
        status: 'completed',
        lessonsCount: '20 Lessons',
        children: [
          { id: 'p1-c1-m1', title: 'Software overview', type: 'module', status: 'completed' },
          { id: 'p1-c1-m2', title: 'BIM basics', type: 'module', status: 'completed' },
          { id: 'p1-c1-m3', title: 'Interface navigation', type: 'module', status: 'completed' },
          { id: 'p1-c1-m4', title: 'Workspace configuration', type: 'module', status: 'completed' },
        ],
      },
      {
        id: 'p1-c2',
        title: 'Course 2 — Interface Mastery',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '25 Lessons',
        children: [
          { id: 'p1-c2-m1', title: 'Toolbars', type: 'module', status: 'in-progress' },
          { id: 'p1-c2-m2', title: 'Smart palettes', type: 'module', status: 'locked' },
          { id: 'p1-c2-m3', title: 'Workspace layouts', type: 'module', status: 'locked' },
          { id: 'p1-c2-m4', title: 'UI customization', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p1-c3',
        title: 'Course 3 — File & Project Management',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '20 Lessons',
        children: [
          { id: 'p1-c3-m1', title: 'Project creation', type: 'module', status: 'in-progress' },
          { id: 'p1-c3-m2', title: 'Structure management', type: 'module', status: 'in-progress' },
          { id: 'p1-c3-m3', title: 'Drawing files', type: 'module', status: 'in-progress' },
          { id: 'p1-c3-m4', title: 'Backup systems', type: 'module', status: 'in-progress' },
        ],
      },
      {
        id: 'p1-c4',
        title: 'Course 4 — Coordinate Systems',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '15 Lessons',
        children: [
          { id: 'p1-c4-m1', title: 'Global coordinates', type: 'module', status: 'in-progress' },
          { id: 'p1-c4-m2', title: 'Local coordinates', type: 'module', status: 'in-progress' },
          { id: 'p1-c4-m3', title: 'Reference points', type: 'module', status: 'in-progress' },
        ],
      },
      {
        id: 'p1-c5',
        title: 'Course 5 — Productivity Essentials',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p1-c5-m1', title: 'Snapping systems', type: 'module', status: 'in-progress' },
          { id: 'p1-c5-m2', title: 'Input methods', type: 'module', status: 'in-progress' },
          { id: 'p1-c5-m3', title: 'Keyboard workflows', type: 'module', status: 'in-progress' },
          { id: 'p1-c5-m4', title: 'Precision drawing', type: 'module', status: 'in-progress' },
        ],
      },
    ],
  },
  {
    id: 'p2',
    title: '2. Allplan Architecture',
    type: 'path',
    status: 'in-progress',
    lessonsCount: '150 Lessons',
    children: [
      {
        id: 'p2-c1',
        title: 'Course 1 — 2D Drafting',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p2-c1-m1', title: 'Line tools', type: 'module', status: 'locked' },
          { id: 'p2-c1-m2', title: 'Hatch & fills', type: 'module', status: 'locked' },
          { id: 'p2-c1-m3', title: 'Dimensions', type: 'module', status: 'locked' },
          { id: 'p2-c1-m4', title: 'Annotation', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p2-c2',
        title: 'Course 2 — Architectural Modeling',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '50 Lessons',
        children: [
          { id: 'p2-c2-m1', title: 'Walls', type: 'module', status: 'in-progress' },
          { id: 'p2-c2-m2', title: 'Doors', type: 'module', status: 'in-progress' },
          { id: 'p2-c2-m3', title: 'Windows', type: 'module', status: 'in-progress' },
          { id: 'p2-c2-m4', title: 'Slabs', type: 'module', status: 'in-progress' },
          { id: 'p2-c2-m5', title: 'Roofs', type: 'module', status: 'in-progress' },
        ],
      },
      {
        id: 'p2-c3',
        title: 'Course 3 — Building Components',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p2-c3-m1', title: 'Stairs', type: 'module', status: 'locked' },
          { id: 'p2-c3-m2', title: 'Railings', type: 'module', status: 'locked' },
          { id: 'p2-c3-m3', title: 'Curtain walls', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p2-c4',
        title: 'Course 4 — Parametric Objects',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p2-c4-m1', title: 'Smart objects', type: 'module', status: 'locked' },
          { id: 'p2-c4-m2', title: 'Parametric editing', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p3',
    title: '3. Allplan Structural Engineering',
    type: 'path',
    status: 'locked',
    lessonsCount: '160 Lessons',
    children: [
      {
        id: 'p3-c1',
        title: 'Course 1 — Structural Modeling',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p3-c1-m1', title: 'Columns', type: 'module', status: 'locked' },
          { id: 'p3-c1-m2', title: 'Beams', type: 'module', status: 'locked' },
          { id: 'p3-c1-m3', title: 'Structural walls', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p3-c2',
        title: 'Course 2 — Structural Systems',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p3-c2-m1', title: 'Load-bearing structures', type: 'module', status: 'locked' },
          { id: 'p3-c2-m2', title: 'Structural grids', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p3-c3',
        title: 'Course 3 — Analysis Preparation',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p3-c3-m1', title: 'Structural export', type: 'module', status: 'locked' },
          { id: 'p3-c3-m2', title: 'FEM preparation', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p3-c4',
        title: 'Course 4 — Detailing',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p3-c4-m1', title: 'Structural drawings', type: 'module', status: 'locked' },
          { id: 'p3-c4-m2', title: 'Sections', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p4',
    title: '4. BIM & OpenBIM Workflows',
    type: 'path',
    status: 'locked',
    lessonsCount: '120 Lessons',
    children: [
      {
        id: 'p4-c1',
        title: 'Course 1 — BIM Fundamentals',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p4-c1-m1', title: 'BIM execution plan', type: 'module', status: 'locked' },
          { id: 'p4-c1-m2', title: 'Level of Detail (LOD)', type: 'module', status: 'locked' },
          { id: 'p4-c1-m3', title: 'Information delivery manual', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p4-c2',
        title: 'Course 2 — IFC Exchange',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p4-c2-m1', title: 'IFC schema import/export', type: 'module', status: 'locked' },
          { id: 'p4-c2-m2', title: 'Property mapping', type: 'module', status: 'locked' },
          { id: 'p4-c2-m3', title: 'IFC attributes', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p4-c3',
        title: 'Course 3 — Model Coordination',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p4-c3-m1', title: 'Collision detection', type: 'module', status: 'locked' },
          { id: 'p4-c3-m2', title: 'Solibri integration', type: 'module', status: 'locked' },
          { id: 'p4-c3-m3', title: 'Model comparison', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p4-c4',
        title: 'Course 4 — BIM Collaboration',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p4-c4-m1', title: 'BCF workflows', type: 'module', status: 'locked' },
          { id: 'p4-c4-m2', title: 'Bimplus setup', type: 'module', status: 'locked' },
          { id: 'p4-c4-m3', title: 'Cloud task management', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p5',
    title: '5. Reinforcement & Detailing',
    type: 'path',
    status: 'in-progress',
    lessonsCount: '140 Lessons',
    children: [
      {
        id: 'p5-c1',
        title: 'Course 1 — Rebar Basics',
        type: 'course',
        status: 'in-progress',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p5-c1-m1', title: 'Standard hooks & bends', type: 'module', status: 'in-progress' },
          { id: 'p5-c1-m2', title: 'Cover requirements', type: 'module', status: 'in-progress' },
          { id: 'p5-c1-m3', title: 'Bar schedules', type: 'module', status: 'in-progress' },
        ],
      },
      {
        id: 'p5-c2',
        title: 'Course 2 — Reinforcement Modeling',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p5-c2-m1', title: 'Single bar placement', type: 'module', status: 'locked' },
          { id: 'p5-c2-m2', title: 'Linear placement', type: 'module', status: 'locked' },
          { id: 'p5-c2-m3', title: 'Mesh reinforcement', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p5-c3',
        title: 'Course 3 — Advanced Reinforcement',
        type: 'course',
        status: 'locked',
        lessonsCount: '40 Lessons',
        children: [
          { id: 'p5-c3-m1', title: 'BAMTEC carpets', type: 'module', status: 'locked' },
          { id: 'p5-c3-m2', title: 'Circular columns detailing', type: 'module', status: 'locked' },
          { id: 'p5-c3-m3', title: '3D reinforcement cage', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p5-c4',
        title: 'Course 4 — Reinforcement Documentation',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p5-c4-m1', title: 'Bar shape details', type: 'module', status: 'locked' },
          { id: 'p5-c4-m2', title: 'Legend generation', type: 'module', status: 'locked' },
          { id: 'p5-c4-m3', title: 'Export to fabrication', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p6',
    title: '6. Infrastructure & Civil',
    type: 'path',
    status: 'locked',
    lessonsCount: '90 Lessons',
    children: [
      {
        id: 'p6-c1',
        title: 'Course 1 — Terrain Modeling',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p6-c1-m1', title: 'DTM (Digital Terrain Model)', type: 'module', status: 'locked' },
          { id: 'p6-c1-m2', title: 'Earthwork calculations', type: 'module', status: 'locked' },
          { id: 'p6-c1-m3', title: 'Contour lines', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p6-c2',
        title: 'Course 2 — Roads & Infrastructure',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p6-c2-m1', title: 'Road alignment', type: 'module', status: 'locked' },
          { id: 'p6-c2-m2', title: 'Profile drawing', type: 'module', status: 'locked' },
          { id: 'p6-c2-m3', title: 'Cross sections', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p6-c3',
        title: 'Course 3 — Site Planning',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p6-c3-m1', title: 'Urban planning assets', type: 'module', status: 'locked' },
          { id: 'p6-c3-m2', title: 'Excavation pits', type: 'module', status: 'locked' },
          { id: 'p6-c3-m3', title: 'Retaining structures', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p7',
    title: '7. Visualization & Presentation',
    type: 'path',
    status: 'locked',
    lessonsCount: '80 Lessons',
    children: [
      {
        id: 'p7-c1',
        title: 'Course 1 — Rendering',
        type: 'course',
        status: 'locked',
        lessonsCount: '25 Lessons',
        children: [
          { id: 'p7-c1-m1', title: 'CineRender setup', type: 'module', status: 'locked' },
          { id: 'p7-c1-m2', title: 'Real-time rendering', type: 'module', status: 'locked' },
          { id: 'p7-c1-m3', title: 'Panorama views', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p7-c2',
        title: 'Course 2 — Materials & Lighting',
        type: 'course',
        status: 'locked',
        lessonsCount: '25 Lessons',
        children: [
          { id: 'p7-c2-m1', title: 'Physical sky', type: 'module', status: 'locked' },
          { id: 'p7-c2-m2', title: 'Artificial light fixtures', type: 'module', status: 'locked' },
          { id: 'p7-c2-m3', title: 'Material mapping', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p7-c3',
        title: 'Course 3 — Presentation Layouts',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p7-c3-m1', title: 'Title blocks', type: 'module', status: 'locked' },
          { id: 'p7-c3-m2', title: 'Plot set preparation', type: 'module', status: 'locked' },
          { id: 'p7-c3-m3', title: 'PDF/DWG export', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p8',
    title: '8. Automation & Parametric Design',
    type: 'path',
    status: 'locked',
    lessonsCount: '80 Lessons',
    children: [
      {
        id: 'p8-c1',
        title: 'Course 1 — Smart Components',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p8-c1-m1', title: 'SmartPart editor', type: 'module', status: 'locked' },
          { id: 'p8-c1-m2', title: 'PythonPart basics', type: 'module', status: 'locked' },
          { id: 'p8-c1-m3', title: 'Parametric windows', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p8-c2',
        title: 'Course 2 — Parametric workflows',
        type: 'course',
        status: 'locked',
        lessonsCount: '25 Lessons',
        children: [
          { id: 'p8-c2-m1', title: 'Visual scripting', type: 'module', status: 'locked' },
          { id: 'p8-c2-m2', title: 'Custom node creation', type: 'module', status: 'locked' },
          { id: 'p8-c2-m3', title: 'Automated attributes', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p8-c3',
        title: 'Course 3 — Automation tools',
        type: 'course',
        status: 'locked',
        lessonsCount: '25 Lessons',
        children: [
          { id: 'p8-c3-m1', title: 'Report generator', type: 'module', status: 'locked' },
          { id: 'p8-c3-m2', title: 'Batch rendering', type: 'module', status: 'locked' },
          { id: 'p8-c3-m3', title: 'Macro placement', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p9',
    title: '9. Collaboration & Office Standards',
    type: 'path',
    status: 'locked',
    lessonsCount: '90 Lessons',
    children: [
      {
        id: 'p9-c1',
        title: 'Course 1 — Team workflows',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p9-c1-m1', title: 'Workgroup Manager', type: 'module', status: 'locked' },
          { id: 'p9-c1-m2', title: 'Allplan Share workflows', type: 'module', status: 'locked' },
          { id: 'p9-c1-m3', title: 'Multi-user editing', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p9-c2',
        title: 'Course 2 — Office templates',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p9-c2-m1', title: 'Layer structure standards', type: 'module', status: 'locked' },
          { id: 'p9-c2-m2', title: 'Pen & color configurations', type: 'module', status: 'locked' },
          { id: 'p9-c2-m3', title: 'Custom library paths', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p9-c3',
        title: 'Course 3 — Version control',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p9-c3-m1', title: 'Project archives', type: 'module', status: 'locked' },
          { id: 'p9-c3-m2', title: 'Attribute history', type: 'module', status: 'locked' },
          { id: 'p9-c3-m3', title: 'Revision clouds', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
  {
    id: 'p10',
    title: '10. Enterprise Project Management',
    type: 'path',
    status: 'locked',
    lessonsCount: '100 Lessons',
    children: [
      {
        id: 'p10-c1',
        title: 'Course 1 — Large Project Setup',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p10-c1-m1', title: 'Campus planning structures', type: 'module', status: 'locked' },
          { id: 'p10-c1-m2', title: 'Multi-level reference planes', type: 'module', status: 'locked' },
          { id: 'p10-c1-m3', title: 'WAN optimization', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p10-c2',
        title: 'Course 2 — Model Coordination',
        type: 'course',
        status: 'locked',
        lessonsCount: '30 Lessons',
        children: [
          { id: 'p10-c2-m1', title: 'Clash management', type: 'module', status: 'locked' },
          { id: 'p10-c2-m2', title: 'Model splitting', type: 'module', status: 'locked' },
          { id: 'p10-c2-m3', title: 'Master project linking', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p10-c3',
        title: 'Course 3 — Documentation pipelines',
        type: 'course',
        status: 'locked',
        lessonsCount: '20 Lessons',
        children: [
          { id: 'p10-c3-m1', title: 'Automatic layout series', type: 'module', status: 'locked' },
          { id: 'p10-c3-m2', title: 'Project reports', type: 'module', status: 'locked' },
          { id: 'p10-c3-m3', title: 'Delivery standards', type: 'module', status: 'locked' },
        ],
      },
      {
        id: 'p10-c4',
        title: 'Course 4 — BIM delivery standards',
        type: 'course',
        status: 'locked',
        lessonsCount: '20 Lessons',
        children: [
          { id: 'p10-c4-m1', title: 'Quality assurance audits', type: 'module', status: 'locked' },
          { id: 'p10-c4-m2', title: 'Level of Information (LOI) validation', type: 'module', status: 'locked' },
          { id: 'p10-c4-m3', title: 'Handover models', type: 'module', status: 'locked' },
        ],
      },
    ],
  },
];

