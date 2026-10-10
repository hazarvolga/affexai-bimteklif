// Generated from allplanAkademi-main. Do not edit manually; rerun scripts/import-allplan-source.mjs.

export interface LessonDetail {
  title: string;
  subtitle: string;
  introduction: string;
  steps: { step: number; title: string; desc: string }[];
  recommendation: string;
  estimatedTime: string;
  seed: string;
  interactiveTool?: 'wall-simulator' | 'coordinate-calculator' | 'shortcut-trainer' | 'reinforcement-estimator';
  attachments: { name: string; size: string }[];
}

export const LESSONS_CONTENT: Record<string, LessonDetail> = {
  'Software overview': {
    title: 'Software Overview',
    subtitle: 'Comprehensive analysis of the Allplan CAD/BIM engine, hybrid modeling technology, and system architecture.',
    introduction: 'Allplan is a high-performance BIM platform that combines the power of traditional 2D drafting with modern 3D parametric object modeling. Built on the Siemens Parasolid modeling kernel, Allplan delivers seamless data integrity across architectural, structural engineering, and quantity takeoff workflows.',
    steps: [
      { step: 1, title: 'Explore the Parasolid Modeling Kernel', desc: 'Understand how Allplan calculates complex curved solids and geometric intersections with millimeter precision without distortion.' },
      { step: 2, title: 'Grasp the Hybrid Drafting Philosophy', desc: 'Learn how drawing files (Teilbild) simultaneously accommodate both 2D details and 3D structural volumes with intelligent BIM attributes.' },
      { step: 3, title: 'Bimplus Cloud Integration', desc: 'Configure project settings to test real-time interdisciplinary data synchronization via the Bimplus cloud platform.' }
    ],
    recommendation: 'The Allplan 3D graphics engine heavily utilizes Vulkan and OpenGL libraries to fluidly render Parasolid geometries on screen. Always ensure your graphics card drivers are up to date.',
    estimatedTime: '20 MIN',
    seed: 'software_overview',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Allplan_Architecture_and_Engineering_Software_Architecture.pdf', size: '3.8 MB' },
      { name: 'Hardware_Requirements_and_Graphics_Card_Configuration.pdf', size: '240 KB' }
    ]
  },
  'BIM basics': {
    title: 'BIM Basics & openBIM',
    subtitle: 'OpenBIM philosophy, IFC 4 schema, smart attribute management, and LOD/LOI standards.',
    introduction: 'Building Information Modeling (BIM) is not just about 3D drafting; it is information management. In this lesson, we will examine international openBIM standards, the IFC4 (Industry Foundation Classes) schema, and engineering attributes assigned to objects.',
    steps: [
      { step: 1, title: 'Analyze the IFC 4 Classification Schema', desc: 'Examine the hierarchical differences between IfcWall, IfcSlab, and IfcColumn, and their associated standard data sets like Pset_WallCommon.' },
      { step: 2, title: 'Smart Attribute Management', desc: 'Assign fire resistance, acoustic values, material classes, and carbon footprint data to elements using the Allplan Attribute Manager.' },
      { step: 3, title: 'LOD (Level of Development) Configuration', desc: 'Configure scale-dependent representation styles so that an element appearing schematic at 1:100 scale is fully reinforced and layered at a 1:20 detail scale.' }
    ],
    recommendation: 'Before exporting IFC, verify the data mapping (attribute mapping) settings. Assigning attributes matching buildingSMART standards ensures zero errors in Solibri clash detection tests.',
    estimatedTime: '30 MIN',
    seed: 'bim_basics',
    interactiveTool: 'reinforcement-estimator',
    attachments: [
      { name: 'buildingSMART_IFC4_PropertySets_Guide.pdf', size: '5.2 MB' },
      { name: 'LOD_LOI_BIM_Standards_Guide.pdf', size: '1.4 MB' }
    ]
  },
  'Interface navigation': {
    title: 'Interface Navigation',
    subtitle: 'Role-based Actionbar, smart palette systems, and multi-viewport management.',
    introduction: 'A fast CAD operator saves time and reduces costs. Allplan\'s role-based modular interface dynamically shapes itself to your active discipline (Architecture, Engineering, Precast). In this lesson, you will learn how to use the screen most efficiently.',
    steps: [
      { step: 1, title: 'Change Your Actionbar Profile', desc: 'Switch your profile from "Architecture" to "Engineering" mode to dynamically place reinforced concrete reinforcement tools onto the toolbar.' },
      { step: 2, title: 'Set Up Multi-Viewport (Viewport Split)', desc: 'Split the screen into four views: Plan (2D), Isometric, Section, and Real-Time F4 Animation viewports simultaneously.' },
      { step: 3, title: 'Fast Mouse and Keyboard Navigation', desc: 'Hold down the mouse wheel to run the dynamic orbit command and transition rapidly between active viewports.' }
    ],
    recommendation: 'Save window layouts optimized for your workflow via the "Layout Configurations" menu. This lets you restore your custom interface in a single click if the viewport resets.',
    estimatedTime: '15 MIN',
    seed: 'interface_nav',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Allplan_Keyboard_Shortcuts_CheatSheet.png', size: '890 KB' }
    ]
  },
  'Workspace configuration': {
    title: 'Workspace Configuration',
    subtitle: 'Project parameters, units, ISO pen weights, and line type standardization.',
    introduction: 'Corporate drawing standards determine the legibility of sheets read on-site. In this lesson, we will configure pen weights (0.13mm to 1.40mm), layer-based line styles, and metric units in compliance with DIN and ISO engineering standards.',
    steps: [
      { step: 1, title: 'Configure Pen and Color Relationships', desc: 'Map screen-drawn lines to physical plotter print weights. Assign 0.50mm to structural outer boundaries and 0.13mm to hatches.' },
      { step: 2, title: 'Load Layer Standards', desc: 'Import the layer dictionary matching DIN 4000 standards into Allplan; establish the layer hierarchy for concrete, reinforcement, and insulation.' },
      { step: 3, title: 'Coordinate Scale and Font Sizes', desc: 'Enable automatic scaling of annotations, text, and hatch intervals when the global drawing scale is adjusted (e.g., 1:50, 1:100).' }
    ],
    recommendation: 'Keep "Color on Screen Reflects Pen Weight" active in the workspace. This helps you catch drawing density issues directly on screen prior to plotting.',
    estimatedTime: '25 MIN',
    seed: 'workspace_config',
    attachments: [
      { name: 'DIN_Standards_Layer_Template.xml', size: '412 KB' },
      { name: 'Office_Standard_Pen_Mapping.cfg', size: '12 KB' }
    ]
  },
  'Toolbars': {
    title: 'Toolbars Customization',
    subtitle: 'Grouping frequently used commands and managing context-sensitive menus.',
    introduction: 'Quick access to your most frequently used reinforcement, wall, and slab commands in Allplan can halve your cumulative drafting time. In this lesson, we will build personalized toolbars.',
    steps: [
      { step: 1, title: 'Launch the Actionbar Editor', desc: 'Double-click any empty space on the toolbar to open the customization menu and create a "Quick Access" tab with your favorite commands.' },
      { step: 2, title: 'Configure Right-Click Context Menus', desc: 'Ensure that commands like "Properties", "Copy", and "Mirror" occupy the top spots when right-clicking any model object.' },
      { step: 3, title: 'Dock Floating Palettes', desc: 'Anchor the Properties and Layer palettes to the right or left edge of the screen as auto-hiding panels.' }
    ],
    recommendation: 'Avoid cluttering your viewport with unnecessary toolbars. A clean drawing area maximizes Parasolid render performance and reduces eye strain.',
    estimatedTime: '15 MIN',
    seed: 'toolbars',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Office_Quick_Access_Bar_Preset.ubf', size: '65 KB' }
    ]
  },
  'Smart palettes': {
    title: 'Smart Palettes & Wizards',
    subtitle: 'Properties, Layers, Objects, and Wizards palettes for ultra-fast object cloning and editing.',
    introduction: 'Palettes are Allplan\'s data management centers. Wizards are smart libraries containing pre-configured attributes, layers, and material properties. In this lesson, you will master library and palette coordination.',
    steps: [
      { step: 1, title: 'Launch Wizards', desc: 'Open the wall or reinforcement wizard from the office library. Double-right-click an element to clone it with all properties (priority, layer, concrete class) into your active drawing.' },
      { step: 2, title: 'Apply Layer Palette Filters', desc: 'Lock or background-reference the concrete formwork while reinforcement modeling by altering layer visibility sets in seconds.' },
      { step: 3, title: 'Query the Model Tree with Objects Palette', desc: 'Group and mass-edit elements in your drawing file based on material classes, IFC types, or active layer assignments.' }
    ],
    recommendation: 'Store your customized office wizards (.wdg) on a shared network drive. This ensures the entire design team drafts using a unified attribute pool.',
    estimatedTime: '20 MIN',
    seed: 'smart_palettes',
    attachments: [
      { name: 'Allplan_Standard_Office_Wizards.wdg', size: '18.4 MB' }
    ]
  },
  'Workspace layouts': {
    title: 'Workspace Layouts & Rendering',
    subtitle: 'Multi-screen configuration, viewport splitting, and the real-time F4 animation window.',
    introduction: 'Receiving instantaneous visual feedback while modeling in BIM reduces errors to zero. Allplan features a dynamic screen layout that automatically updates 3D animations and sections while you draft 2D plans.',
    steps: [
      { step: 1, title: 'Activate Viewport Splits', desc: 'Use split-screen icons at the bottom of the workspace to divide the screen into 3 views: Plan, Isometric, and Cross-Section.' },
      { step: 2, title: 'Utilize the F4 Animation Window', desc: 'Press F4 to invoke the hardware-accelerated real-time rendering window, and drag this viewport to your secondary monitor for continuous 3D inspection.' },
      { step: 3, title: 'Apply Viewport-Specific Layer Filtering', desc: 'Keep your viewports uncluttered by filtering out annotations in 3D views while displaying only structural concrete solids and reinforcement.' }
    ],
    recommendation: 'To prevent graphics lag in massive reinforcement models, keep the bar roundness quality set to "Medium" in the Animation Viewport settings.',
    estimatedTime: '20 MIN',
    seed: 'workspace_layouts',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Dual_Monitor_Design_Layout_Templates.pdf', size: '1.1 MB' }
    ]
  },
  'UI customization': {
    title: 'UI Customization',
    subtitle: 'Custom hotkey assignments, personal Actionbar design, and exporting .ubf profiles.',
    introduction: 'Optimize Allplan to match your custom drafting reflexes. In this lesson, we will map frequently used commands to custom keyboard hotkeys and back up these preferences.',
    steps: [
      { step: 1, title: 'Open the Hotkeys Editor', desc: 'Navigate to Options -> Customize -> Keyboard Shortcuts to assign custom key binds like "D" for reinforcement and "A" for axis drafting.' },
      { step: 2, title: 'Build a Custom Wizard Tab', desc: 'Customize an empty tab on the Actionbar with our custom office logo and your go-to reinforced concrete bending tools.' },
      { step: 3, title: 'Export Profile as .ubf', desc: 'Save your custom user profile, containing all your hotkeys and interface layouts, as a backup .ubf file on your disk.' }
    ],
    recommendation: 'Store your custom .ubf profile in the cloud. You can restore your complete CAD environment in a single click via Allmenu if your machine changes.',
    estimatedTime: '15 MIN',
    seed: 'ui_customization',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Office_Engineering_Shared_Keyboard_Profile.ubf', size: '112 KB' }
    ]
  },
  'Project creation': {
    title: 'Project Creation',
    subtitle: 'Creating new project templates matching Allplan standards and integrating office preferences.',
    introduction: 'A successful BIM project in Allplan starts with correct project configuration. In this lesson, we will study how to create local and cloud-based (Bimplus) projects, map attributes, and load office templates.',
    steps: [
      { step: 1, title: 'Project Properties and Template Selection', desc: 'Launch the new project wizard, then load the layer and line type template matching office guidelines.' },
      { step: 2, title: 'Define Attribute Sets', desc: 'Assign structural and architectural data templates (IFC4) at the project level.' },
      { step: 3, title: 'Bimplus Cloud Synchronization', desc: 'Link your project to the Bimplus common data environment to activate interdisciplinary collaboration.' }
    ],
    recommendation: 'For every new project, select the "Associated Path" office standard. This guarantees the entire design team draws with matching line types and layer structures.',
    estimatedTime: '20 MIN',
    seed: 'project_creation',
    attachments: [
      { name: 'New_Project_Setup_Protocol.pdf', size: '1.2 MB' },
      { name: 'Office_BIM_Standards_Template.xml', size: '320 KB' }
    ]
  },
  'Structure management': {
    title: 'Structure Management',
    subtitle: 'Creating the Allplan Building Structure hierarchy and assigning elevation plane limits to levels.',
    introduction: 'In Allplan, the core backbone dividing buildings into storeys, grids, and model elements is the Building Structure. This system integrates directly with elevation planes to govern object heights.',
    steps: [
      { step: 1, title: 'Define Building Hierarchy', desc: 'Build the project building structure tree including Terrain, Foundation, Storeys (Ground, 1st Floor, etc.), and Roof nodes.' },
      { step: 2, title: 'Assign Elevation Plane Models', desc: 'Configure the pairs of upper and lower elevation planes that constrain the height boundaries of each building level.' },
      { step: 3, title: 'Associate Drawing Files (Teilbild)', desc: 'Link corresponding architectural and structural drawing files (Teilbild) to each storey node in the structure tree.' }
    ],
    recommendation: 'Maintain the exact IfcBuildingStorey node hierarchy matching IFC standards when building your structure. This ensures seamless storey matching during openBIM exports into Solibri or Revit.',
    estimatedTime: '25 MIN',
    seed: 'structure_management',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Allplan_BIM_Building_Structure_Guide.pdf', size: '2.4 MB' },
      { name: 'Building_Structure_Standard_Template.xml', size: '120 KB' }
    ]
  },
  'Drawing files': {
    title: 'Drawing Files (Teilbilder)',
    subtitle: 'Allplan\'s unique Teilbild system, managing active vs. background drawing files, and reference modeling.',
    introduction: 'Beyond traditional CAD layer hierarchies, Allplan uses modular drawing files called "Teilbild". Each file hosts a specific model component (e.g., Grids, Columns, Reinforcement) for lightning-fast memory handling.',
    steps: [
      { step: 1, title: 'Master the Drawing Files Selection Dialogue (Ctrl+T)', desc: 'Configure the three drawing file states: Active (Yellow), Background-Editable (Green), and Background-Read-Only (Grey).' },
      { step: 2, title: 'Distribute Model Objects to Drawing Files', desc: 'Allocate structural concrete elements, partitions, and reinforcement steel into separate drawing files to ease clash-detection workflows.' },
      { step: 3, title: 'Set Up Drawing File Numbering Conventions', desc: 'Establish file numbering blocks matching office protocols (e.g., 100-199 Level 1 Architecture, 200-299 Level 1 Structural).' }
    ],
    recommendation: 'Set your concrete formwork drawing file to "Read-Only (Grey)" and select an empty file as "Active (Yellow)" to model reinforcement. This prevents data contamination and accidental deletion of formwork.',
    estimatedTime: '20 MIN',
    seed: 'drawing_files',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Teilbild_System_Architecture_and_Hierarchy.pdf', size: '1.5 MB' }
    ]
  },
  'Backup systems': {
    title: 'Backup Systems',
    subtitle: 'Project archiving (.zip), drawing file backups, and automatic recovery via Allmenu.',
    introduction: 'Data loss is unacceptable in engineering practices. Allplan embeds project-level archiving tools and features Allmenu, the backbone of administrative recovery.',
    steps: [
      { step: 1, title: 'Project Archiving with Allmenu', desc: 'Launch Allmenu to back up projects as compressed archives (.zip) or raw data folders and export them safely to external disks.' },
      { step: 2, title: 'Auto-Save and Temp File Recovery', desc: 'Learn to restore corrupted drawing files from temporary auto-saved files (.bak) generated during active runtime sessions.' },
      { step: 3, title: 'Bimplus Cloud Version Control', desc: 'Leverage cloud backup histories to compare and roll back structural models to previous revision states.' }
    ],
    recommendation: 'Back up your entire project weekly as a "Compressed Project Archive" using Allmenu. This represents the fastest recovery method during hardware failures.',
    estimatedTime: '15 MIN',
    seed: 'backup_systems',
    attachments: [
      { name: 'Allplan_Data_Recovery_Protocol.pdf', size: '980 KB' }
    ]
  },
  'Global coordinates': {
    title: 'Global Coordinates',
    subtitle: 'UTM, Gauss-Kruger, and national geodetic grids for real-world project georeferencing.',
    introduction: 'Correct georeferencing is vital for site excavation and geodetic surveying. Allplan embeds a coordinate offset engine that maps large projects to global coordinate grids with millimeter precision.',
    steps: [
      { step: 1, title: 'Define Project Origin and Coordinate Offset', desc: 'Enter the global geodetic offset values (X, Y, Z) into Project Properties to keep the CAD workspace close to the internal modeling origin.' },
      { step: 2, title: 'Prevent Distant Coordinate Distortion', desc: 'Enable the "Optimization for distant coordinates" option to bypass Parasolid geometric artifacts and floating-point errors.' },
      { step: 3, title: 'Import Land Surveying Data', desc: 'Import survey point clouds or LandXML datasets directly into their true geographic coordinates inside the workspace.' }
    ],
    recommendation: 'Never locate your building millions of meters away from the modeling origin. Use Project Offset instead; otherwise, you will encounter line fracturing and render distortion during zoom operations.',
    estimatedTime: '20 MIN',
    seed: 'global_coords',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Global_Coordinates_and_Survey_Integration.pdf', size: '1.6 MB' }
    ]
  },
  'Local coordinates': {
    title: 'Local Coordinates (UCS)',
    subtitle: 'Defining custom User Coordinate Systems (UCS) for diagonal alignments and structural rotation.',
    introduction: 'Drafting on angled or circular structures is notoriously slow. Allplan resolves this with User Coordinate Systems (UCS) to rotate grids and assign temporary local origins.',
    steps: [
      { step: 1, title: 'Define Custom UCS', desc: 'Invoke the UCS command to map an angled beam or wall segment as your active alignment coordinate axis.' },
      { step: 2, title: 'Rotate Viewport Plane', desc: 'Adjust the system angle at the bottom of your screen to match your crosshairs and interface orientation directly with the rotated grid.' },
      { step: 3, title: 'Reinforce Along Angled Grids', desc: 'Place linear reinforcement bars in the rotated plane exactly as if working in standard orthogonal viewports; Allplan handles 3D calculations in the background.' }
    ],
    recommendation: 'Bear in mind that coordinate tracker values match the active UCS grid. Click the UCS reset icon to switch back to global coordinate parameters.',
    estimatedTime: '15 MIN',
    seed: 'local_coords',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Local_UCS_Application_Methods.pdf', size: '1.1 MB' }
    ]
  },
  'Reference points': {
    title: 'Reference Points',
    subtitle: 'Intelligent snap anchors and coordinate offsets for parametric library objects.',
    introduction: 'Placing smart objects (SmartParts, windows, columns) in Allplan depends on anchor offsets. In this lesson, you will learn to snap and place objects from corners, centers, or custom offsets.',
    steps: [
      { step: 1, title: 'Assign Insertion Anchor Point', desc: 'Define the cursor insertion point (e.g., lower-left, center, upper-right) in the Properties palette before placing columns or door openings.' },
      { step: 2, title: 'Relative Referencing for Offset Placements', desc: 'Lock a relative reference coordinate to a structural wall corner to position a window at a precise 50cm clear offset distance.' },
      { step: 3, title: 'Define Smart Connect Snap Points', desc: 'Establish custom connection snap points at beam-column junctions to route reinforcement tangentially inside the concrete cover boundaries.' }
    ],
    recommendation: 'Always lock your insertion reference points to structural core boundaries, never to finish layers (such as plaster), to avoid shifts during wall revisions.',
    estimatedTime: '20 MIN',
    seed: 'reference_points',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Reference_Points_and_Offset_Calculations.pdf', size: '1.4 MB' }
    ]
  },
  'Snapping systems': {
    title: 'Snapping Systems',
    subtitle: 'Cursor snap settings, intelligent trace lines, coordinate locking, and tangent snaps.',
    introduction: 'Precision is the hallmark of a structural BIM model. Allplan\'s advanced snap engine identifies intersections, perpendiculars, tangents, and midpoints dynamically without needing auxiliary guides.',
    steps: [
      { step: 1, title: 'Configure Snap Settings', desc: 'Right-click in the viewport to open the Snap Point Options. Enable Point Snap, Grid, Trace Lines, and Tangent snaps.' },
      { step: 2, title: 'Utilize Smart Trace Lines', desc: 'Hover the crosshairs over any corner vertex for 1 second to trigger intelligent projection trace lines, allowing precise offset inputs along coordinates.' },
      { step: 3, title: 'Master Coordinate Constraint Shortcuts', desc: 'Constrain cursor movement along standard horizontal or vertical axes by holding down Shift, or toggle F3 (X lock) and F4 (Y lock).' }
    ],
    recommendation: 'Keep "Concrete Cover Snap" checked while reinforcement detailing to lock automatically onto inner concrete boundaries.',
    estimatedTime: '25 MIN',
    seed: 'snapping_systems',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Allplan_Precision_Drafting_and_Snapping_Tips.pdf', size: '2.1 MB' }
    ]
  },
  'Input methods': {
    title: 'Input Methods',
    subtitle: 'Cartesian vs. polar coordinate input panels for high-accuracy parametric drafting.',
    introduction: 'The Coordinate Tracker is Allplan\'s primary input control interface. In this lesson, you will work with Cartesian (dx, dy, dz delta step inputs) and Polar (angle and vector length) input modes.',
    steps: [
      { step: 1, title: 'Utilize the Coordinate Tracker Panel', desc: 'Press TAB to focus active cursor entry inside the dynamic tracker panel; navigate between dx, dy, and dz coordinate cells using keyboard arrows.' },
      { step: 2, title: 'Relative Coordinate Deltas', desc: 'Assign relative "dx" and "dy" values referencing your previous node as coordinate origin to place columns at uniform distances.' },
      { step: 3, title: 'Polar Coordinates for Rotated Features', desc: 'Switch the input tracker to polar mode; enter precise vector lengths and rotation angles in degrees to outline curved ramps or angled retaining structures.' }
    ],
    recommendation: 'Double-click the lock symbol on delta values in the tracker when copy-duplicating recurring structures like prefabricated purlin grids.',
    estimatedTime: '20 MIN',
    seed: 'input_methods',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Allplan_Data_Entry_and_Coordinate_Tracker_Manual.pdf', size: '1.4 MB' }
    ]
  },
  'Keyboard workflows': {
    title: 'Keyboard Workflows',
    subtitle: 'F3/F4 axis locks, toggling wall offsets with the spacebar, and master keyboard shortcut integration.',
    introduction: 'Professional BIM modelers keep their eyes locked on viewports. In this lesson, you will practice master keyboard hotkeys, axis locks, and sub-command transitions.',
    steps: [
      { step: 1, title: 'Toggle Object Offsets with Spacebar', desc: 'Press the spacebar while drawing walls or placing reinforcement bars to instantly cycle the object offset side (Left, Center, Right) relative to the cursor.' },
      { step: 2, title: 'Constrain Axes via F3 & F4', desc: 'Resolve complex angular alignments by binding cursor trails along F3 (X lock) or F4 (Y lock) during active commands.' },
      { step: 3, title: 'Recall Palettes Instantly', desc: 'Summon the Drawing Files panel with Ctrl+T and the Wizards dashboard with Ctrl+W in seconds without manual cursor searching.' }
    ],
    recommendation: 'Press ESC once to exit sub-commands; clicking it repeatedly exits the active tool entirely, resetting your toolbar focus.',
    estimatedTime: '15 MIN',
    seed: 'keyboard_workflows',
    interactiveTool: 'shortcut-trainer',
    attachments: [
      { name: 'Keyboard_Driven_Allplan_Workflow_Sheet.png', size: '540 KB' }
    ]
  },
  'Precision drawing': {
    title: 'Precision Drawing',
    subtitle: 'Millimeter-level dimensioning, offset curves, and delta coordinates for zero-tolerance modeling.',
    introduction: 'Millimeter precision is vital for concrete formwork and reinforcement layout. In this lesson, you will combine tracking controls with smart alignment trails to outline zero-tolerance slabs.',
    steps: [
      { step: 1, title: 'Draft with Offset Curves', desc: 'Generate parallel alignments at specific offsets directly off existing structural walls using the "Offset Curve" command without duplicating lines.' },
      { step: 2, title: 'Perform Geometric Alignment Verification', desc: 'Resolve virtual intersections between mismatched axes and enter offset delta steps from that intersection to position a column.' },
      { step: 3, title: 'Debug Drawing Anomalies', desc: 'Scan drawing file geometry statistics to inspect exact millimeter lengths, adjusting any decimal fractions back to perfect integers.' }
    ],
    recommendation: 'Never utilize rough rounded values. Allplan calculations function strictly at millimeter scale, requiring absolute integers to prevent downstream IFC alignment shifts.',
    estimatedTime: '25 MIN',
    seed: 'precision_drawing',
    interactiveTool: 'coordinate-calculator',
    attachments: [
      { name: 'Zero_Tolerance_BIM_Modeling_Methodology.pdf', size: '1.8 MB' }
    ]
  },
  'Walls': {
    title: 'Wall Modeling',
    subtitle: 'Multi-layer architectural walls, axis offsets, and priority-based connection joins.',
    introduction: 'Multi-layer wall assemblies represent some of Allplan\'s most powerful architectural objects. In this lesson, we will study how core concrete, thermal insulation, and external finishes join automatically based on priority ratings (0 to 1000).',
    steps: [
      { step: 1, title: 'Position Wall Drawing Axis', desc: 'Locate your wall axis line on the outer edge of the structural core rather than the exterior finish layer to prevent alignment shifts during wall updates.' },
      { step: 2, title: 'Assign Layer Connection Priorities', desc: 'Assign a priority value of 500 to structural concrete, 200 to insulation, and 100 to plaster. Observe how columns automatically punch through finish layers.' },
      { step: 3, title: 'Bind Wall Heights to Level Planes', desc: 'Link upper and lower wall limits to the building level model. When elevation heights adjust, wall heights update dynamically.' }
    ],
    recommendation: 'To maintain flawless mitered joins in multi-layer corners, always draw walls sequentially following the structural core alignment.',
    estimatedTime: '25 MIN',
    seed: 'walls',
    interactiveTool: 'wall-simulator',
    attachments: [
      { name: 'Wall_Intersection_and_Priority_Matrix.pdf', size: '1.2 MB' },
      { name: 'Multi_Layer_Wall_Details.ndw', size: '3.1 MB' }
    ]
  },
  'Doors': {
    title: 'Door Openings & SmartParts',
    subtitle: 'Parametric door openings, frame and leaf configuration, and quantity takeoff attributes.',
    introduction: 'Doors in BIM are not merely drawings; they contain fire ratings, opening directions, and subframe dimensions. In this lesson, we will explore parametric door objects and automatic wall punches.',
    steps: [
      { step: 1, title: 'Punch Door Openings in Walls', desc: 'Select the Door tool, hover over a wall, and enter sill height and clear opening dimensions to automatically punch the structural aperture.' },
      { step: 2, title: 'Configure Parametric Frame and Leaf', desc: 'Adjust frame thickness, leaf opening angles (e.g., 90° or 45° in 2D layouts), and casing trims in the Properties palette.' },
      { step: 3, title: 'Populate Door Schedule Attributes', desc: 'Assign fire ratings (e.g., EI30) and acoustic values (dB) as metadata attributes to prepare accurate schedules for quantity takeoff.' }
    ],
    recommendation: 'Always lock door insertion references to the nearest concrete column or structural corner. This preserves clear distances if wall lengths change.',
    estimatedTime: '20 MIN',
    seed: 'doors',
    attachments: [
      { name: 'Door_Schedules_and_Specification_Criteria.pdf', size: '1.1 MB' }
    ]
  },
  'Windows': {
    title: 'Window Openings & SmartParts',
    subtitle: 'Parametric window openings, sill and subframe details, and SmartPart glazing programming.',
    introduction: 'Windows in Allplan are driven by "SmartPart" scripting, making them fully parametric and formula-governed. In this lesson, you will learn to open window structural apertures and program custom glazing.',
    steps: [
      { step: 1, title: 'Set Up Structural Apertures and Sills', desc: 'Punch a window opening in a wall; key in exact sill heights and subframe clearance allowances in millimeters.' },
      { step: 2, title: 'Shape SmartPart Frames and Glazing', desc: 'Open the SmartPart editor to configure horizontal/vertical mullions, tilt/turn opening direction, and glazing thickness visually.' },
      { step: 3, title: 'Assign Thermal Transmittance (U-Value) Attributes', desc: 'Assign Uw and Ug thermal values to feed data sets directly into green building evaluation schemes (such as LEED/BREEAM).' }
    ],
    recommendation: 'Utilize the "Radial Window" tool in curved walls. The Parasolid kernel will bend the window frame geometry to match the curve perfectly.',
    estimatedTime: '20 MIN',
    seed: 'windows',
    attachments: [
      { name: 'Window_Details_and_Thermal_Insulation_Parameters.pdf', size: '1.3 MB' }
    ]
  },
  'Slabs': {
    title: 'Slabs & Openings',
    subtitle: 'Slab geometries, sloped floor modeling, slab openings, and layer priority setups.',
    introduction: 'Slabs represent the primary structural diaphragms initiating gravity load-paths. In this lesson, we will cover multi-layer slab configurations (screed, insulation, concrete structural core) and shaft openings.',
    steps: [
      { step: 1, title: 'Configure Multi-Layer Slab Assemblies', desc: 'Define your load-bearing concrete slab (e.g., 25cm C30/37), insulation, screed, and finish layers with matching connection priorities.' },
      { step: 2, title: 'Punch Slab Openings and Shafts', desc: 'Outline circular or rectangular floor openings to accommodate elevator cores or mechanical duct shafts.' },
      { step: 3, title: 'Sloped Slabs and Ramps', desc: 'Constrain floor boundaries to 3D inclination reference planes to model sloped otopark ramps or roof slabs.' }
    ],
    recommendation: 'Trace slab edges along beam and wall outer boundaries rather than grid centerlines. This guarantees precise volume calculations in quantities takeoff.',
    estimatedTime: '25 MIN',
    seed: 'slabs',
    attachments: [
      { name: 'Slab_Structure_and_Opening_Detail_Drawings.pdf', size: '1.9 MB' }
    ]
  },
  'Roofs': {
    title: 'Roofs & Plane Models',
    subtitle: 'Creating roof planes, slope configurations, skylights, and timber roof framing.',
    introduction: 'Roofs in Allplan are modeled using the robust "Roof Plane" elevation engine. In this lesson, you will master hip, gable, and mansard roof profiles and auto-cut walls to slope.',
    steps: [
      { step: 1, title: 'Establish Roof Plane Boundaries', desc: 'Trace exterior roof edges and input pitch percentages (e.g., 33%), eaves projections, and ridge heights for each face.' },
      { step: 2, title: 'Auto-Trim Wall Boundaries', desc: 'Bind upper wall limits to the roof plane. Watch Allplan automatically trim walls to matching triangular gables.' },
      { step: 3, title: 'Design Timber Framing', desc: 'Use the Timber Work module to dynamically place rafters, purlins, and collar ties using the roof plane as host.' }
    ],
    recommendation: 'Always use the Roof Plane tool for sloped profiles. Drawing triangular gables manually breaks model coordination when floor elevations are updated.',
    estimatedTime: '25 MIN',
    seed: 'roofs',
    attachments: [
      { name: 'Timber_Roof_Framing_Systems_Guide.pdf', size: '2.5 MB' }
    ]
  },
  'Standard hooks & bends': {
    title: 'Standard Hooks & Bends',
    subtitle: 'Eurocode 2 (EN 1992-1-1) bar bending radii, hook extensions, and minimum mandrel diameters.',
    introduction: 'In reinforced concrete modeling, steel bars cannot be bent sharply to avoid cracking the steel or crushing the concrete. In this lesson, we cover minimum mandrel diameters (4\u03a6 for \u03a6 <= 16mm, 7\u03a6 for \u03a6 > 16mm) and standard hook geometries matching Eurocode 2 (EN 1992-1-1:2004 Table 8.1N).',
    steps: [
      { step: 1, title: 'Calculate Minimum Mandrel Diameters', desc: 'Determine the minimum bending pin diameter matching Eurocode 2 standards based on steel grades and active bar diameters.' },
      { step: 2, title: 'Model Standard Hooks (90\u00b0, 135\u00b0, 180\u00b0)', desc: 'Define hooks in Allplan bar attributes. Enforce the max(10\u03a6, 100mm) extension rules for 135\u00b0 stirrups.' },
      { step: 3, title: 'Extract Bar Bending Schedules', desc: 'Generate 2D bending shape schemas, angles, and segment lengths dynamically from the 3D reinforcement elements.' }
    ],
    recommendation: 'Full Eurocode 2 compliance enables seamless fabrication export from Allplan straight to bending machinery via BVBS formats.',
    estimatedTime: '25 MIN',
    seed: 'hooks_and_bends',
    interactiveTool: 'reinforcement-estimator',
    attachments: [
      { name: 'Eurocode_2_Bar_Bending_and_Mandrel_Tables.pdf', size: '1.3 MB' }
    ]
  },
  'Cover requirements': {
    title: 'Concrete Cover Requirements',
    subtitle: 'Calculating nominal concrete cover (Cnom) based on environmental exposure classes (XC, XD, XS) and bond.',
    introduction: 'Concrete cover is the primary defense protecting reinforcement steel from corrosion and fire. Under Eurocode 2, nominal cover (Cnom) is the sum of minimum cover (Cmin) and allowance for deviation (\u0394Cdev - typically 10mm). In this lesson, we will configure the Allplan Cover Palette.',
    steps: [
      { step: 1, title: 'Evaluate Exposure Classes (EN 206)', desc: 'Analyze the environment host. Assign XC3/XC4 (carbonation) for standard exteriors or XD3 (de-icing chlorides) for bridge decks.' },
      { step: 2, title: 'Calculate Nominal Concrete Cover (Cnom)', desc: 'Determine minimum cover based on bond and durability (Cmin,b vs Cmin,dur) and add the 10mm deviation margin.' },
      { step: 3, title: 'Configure the Cover Palette', desc: 'Open the global "Concrete Cover" palette and apply calculated values (e.g., 35mm) to lock modeled bars within structural solids.' }
    ],
    recommendation: 'Never compromise on cover in aggressive chemical or marine conditions. Setting Cnom to 40-45mm extends the structural life cycle dramatically.',
    estimatedTime: '20 MIN',
    seed: 'cover_requirements',
    interactiveTool: 'reinforcement-estimator',
    attachments: [
      { name: 'EN_1992_Concrete_Cover_Durability_Parameters.pdf', size: '1.7 MB' },
      { name: 'Environmental_Exposure_Classes_XC_XD_XS_Reference.pdf', size: '620 KB' }
    ]
  },
  'Bar schedules': {
    title: 'Bar Schedules & Takeoffs',
    subtitle: 'Generating Eurocode 2 compliant reinforcement schedules (Stahlliste) using the automated reporting engine.',
    introduction: 'Accurate fabrication and shipping bar schedules are as critical as the drawing itself. Allplan dynamically extracts weights, diameters, and shape codes from 3D reinforcement models to generate clean, compliant reports.',
    steps: [
      { step: 1, title: 'Select Reinforcement Report Templates', desc: 'Navigate the Reports catalogue to choose the "Reinforcement Schedule" or "Biegeliste" (Bending Schedule) formats.' },
      { step: 2, title: 'Extract Drawing File Datasets', desc: 'Select active drawing files to parse structural reinforcement diameters, grades, and cumulative tonnages automatically.' },
      { step: 3, title: 'Export Schedules to PDF, Excel, or BVBS', desc: 'Export the generated schedules as PDFs for on-site checking, or BVBS files (.abs) to drive automated bending machinery.' }
    ],
    recommendation: 'Run the "Renumber Bars" utility before exporting reports. This consolidates identical geometries into uniform bar marks to prevent assembly confusion.',
    estimatedTime: '25 MIN',
    seed: 'bar_schedules',
    interactiveTool: 'reinforcement-estimator',
    attachments: [
      { name: 'Reinforcement_Takeoffs_and_Quantity_Template.pdf', size: '1.8 MB' },
      { name: 'BVBS_Fabrication_Data_Communication_Standard.pdf', size: '850 KB' }
    ]
  }
};

export function getLessonDetail(lessonTitle: string): LessonDetail {
  const match = LESSONS_CONTENT[lessonTitle];
  if (match) return match;

  return {
    title: lessonTitle,
    subtitle: `BIM engineering module covering practical strategies, calculations, and standards for Allplan.`,
    introduction: `In this professional training module, you will cover the core principles of ${lessonTitle}. This lesson combines theoretical structural knowledge with step-by-step CAD configurations designed to optimize your building information modeling efficiency.`,
    steps: [
      { step: 1, title: `Analyze ${lessonTitle} Parameters`, desc: 'Open the Allplan Properties palette to inspect key structural and physical properties of the selected element.' },
      { step: 2, title: 'Execute Standard Calculations', desc: 'Calculate the required cross-sectional dimensions, spacing, or coordinates matching Eurocode or DIN specifications.' },
      { step: 3, title: 'Apply and Coordinate Drawings', desc: 'Draft the 3D parametric object and verify that standard IFC classification variables are accurately assigned for quantities takeoff.' }
    ],
    recommendation: 'Review your local office standards and IFC coordination parameters before concluding this chapter.',
    estimatedTime: '25 MIN',
    seed: 'fallback_seed',
    attachments: [
      { name: `${lessonTitle.replace(/\s+/g, '_')}_QuickGuide.pdf`, size: '1.5 MB' }
    ]
  };
}
