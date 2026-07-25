import React, { useState, useRef, useEffect } from 'react';
import { Layers, Crosshair, Cpu, HardDrive, Settings, Compass, Grid, Minimize2, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { getLessonDetail } from '../../data/lessonsContent';

interface CADDiagramViewerProps {
  lessonTitle: string;
}

export const CADDiagramViewer: React.FC<CADDiagramViewerProps> = ({ lessonTitle }) => {
  const [mouseCoords, setMouseCoords] = useState({ x: 250, y: 150 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'all' | 'structural' | 'dimensions'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [generatedDiagram, setGeneratedDiagram] = useState<any | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchDiagram = async () => {
      setLoading(true);
      setIsOfflineMode(false);
      setPipelineLogs([
        "SYSTEM: INITIALIZING AUTOMATED DIAGRAM PIPELINE...",
        `SYSTEM: LOADING ACTIVE LESSON CONTEXT: "${lessonTitle}"`
      ]);

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      try {
        const lesson = getLessonDetail(lessonTitle);
        const stepsText = lesson.steps?.map(s => `Step ${s.step}: ${s.title} - ${s.desc}`).join('\n') || '';

        if (active) {
          await delay(250);
          setPipelineLogs(prev => [...prev, "STUDY BUDDY: PARSING INSTRUCTIONAL METADATA..."]);
        }

        if (active) {
          await delay(350);
          setPipelineLogs(prev => [...prev, "GEMINI: COMPILING GEOMETRIC CAD LAYER ENTITIES..."]);
        }

        const res = await fetch('/api/lesson-diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonTitle: lesson.title,
            lessonSubtitle: lesson.subtitle,
            lessonIntroduction: lesson.introduction,
            lessonSteps: stepsText
          })
        });

        const data = await res.json();

        if (active) {
          if (data.success && !data.fallback) {
            setPipelineLogs(prev => [
              ...prev,
              "CAD CORE: SUCCESSFUL GEO-RENDER ARRAY RECEIVED!",
              `CAD VIEWPORT: MOUNTING "${data.viewportTitle}"`
            ]);
            await delay(250);
            if (active) {
              setGeneratedDiagram(data);
              setLoading(false);
            }
          } else {
            // Graceful offline fallback
            setPipelineLogs(prev => [
              ...prev,
              "PIPELINE: GEMINI_API_KEY NOT DETECTED IN ENVIRONMENT.",
              "SYSTEM: SEAMLESSLY ENGAGING HARDCODED HIGH-FIDELITY VECTOR WORKSPACE..."
            ]);
            await delay(500);
            if (active) {
              setGeneratedDiagram(null);
              setIsOfflineMode(true);
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Diagram pipeline error:", err);
        if (active) {
          setPipelineLogs(prev => [
            ...prev,
            "PIPELINE ERROR: RECOVERY TRACE EXHAUSTED.",
            "SYSTEM: ROUTING STABLE LOCAL RECONSTRUCTION ARRAYS..."
          ]);
          await delay(500);
          if (active) {
            setGeneratedDiagram(null);
            setIsOfflineMode(true);
            setLoading(false);
          }
        }
      }
    };

    fetchDiagram();
    return () => {
      active = false;
    };
  }, [lessonTitle, refreshCount]);

  // Mouse hover coordinate tracking to simulate a real CAD Crosshair and status bar
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    // Scale or offset to simulate CAD coordinates (e.g. millimeters)
    setMouseCoords({ x, y });
  };

  // Classify lessonTitle into categories to show relevant vector diagrams
  const getDiagramCategory = (title: string): 'architecture' | 'ui' | 'project' | 'coordinates' | 'modeling' | 'reinforcement' => {
    const lower = title.toLowerCase();
    if (lower.includes('overview') || lower.includes('basics') || lower.includes('openbim') || lower.includes('ifc')) {
      return 'architecture';
    }
    if (lower.includes('navigation') || lower.includes('toolbar') || lower.includes('palette') || lower.includes('layout') || lower.includes('customization')) {
      return 'ui';
    }
    if (lower.includes('project') || lower.includes('structure') || lower.includes('file') || lower.includes('backup')) {
      return 'project';
    }
    if (lower.includes('coordinate') || lower.includes('snap') || lower.includes('input') || lower.includes('precision')) {
      return 'coordinates';
    }
    if (lower.includes('wall') || lower.includes('door') || lower.includes('window') || lower.includes('slab') || lower.includes('roof')) {
      return 'modeling';
    }
    if (lower.includes('hook') || lower.includes('bend') || lower.includes('cover') || lower.includes('schedule') || lower.includes('rebar') || lower.includes('reinforcement')) {
      return 'reinforcement';
    }
    return 'coordinates'; // Default category
  };

  const category = getDiagramCategory(lessonTitle);

  // CAD coordinates simulator mapping (converts pixels to mock CAD millimeters)
  const cadX = (mouseCoords.x * 12.5 - 3000).toFixed(1);
  const cadY = ((300 - mouseCoords.y) * 12.5 - 1500).toFixed(1);

  return (
    <div className="bg-graphite-950 border border-graphite-500 rounded-[2px] overflow-hidden shadow-2xl flex flex-col font-mono text-xs select-none">
      {/* Title Bar simulating CAD viewport header */}
      <div className="bg-graphite-900 px-3 py-2 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center border-b border-graphite-500">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`size-2 rounded-full ${loading ? 'bg-tech-blue animate-pulse' : generatedDiagram ? 'bg-emerald-400' : 'bg-orange-400'}`} />
          <span className="text-[9px] font-bold text-graphite-300 tracking-wider">
            {generatedDiagram ? generatedDiagram.viewportTitle : `ALLPLAN VIEWPORT: ${lessonTitle.toUpperCase()}`}
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-[1px] font-bold uppercase tracking-wide bg-graphite-950 border border-graphite-800 flex items-center gap-1">
            {loading ? (
              <>
                <Cpu className="size-2 text-tech-blue animate-spin" />
                <span className="text-tech-blue">GEN PIPELINE RUNNING</span>
              </>
            ) : generatedDiagram ? (
              <>
                <Cpu className="size-2 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400">GEMINI AI GENERATED</span>
              </>
            ) : (
              <>
                <HardDrive className="size-2 text-orange-400" />
                <span className="text-orange-400">OFFLINE CAD MATRIX</span>
              </>
            )}
          </span>
          <button 
            onClick={() => setRefreshCount(prev => prev + 1)}
            disabled={loading}
            title="Force regenerate CAD viewport with Gemini"
            className="p-1 rounded-[1px] hover:bg-graphite-800 text-graphite-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-graphite-400">
          <button 
            onClick={() => setActiveLayer('all')}
            className={`px-1.5 py-0.5 rounded-[1px] border ${activeLayer === 'all' ? 'border-tech-blue text-tech-blue bg-tech-blue/10' : 'border-transparent hover:text-white'}`}
          >
            All Layers
          </button>
          <button 
            onClick={() => setActiveLayer('structural')}
            className={`px-1.5 py-0.5 rounded-[1px] border ${activeLayer === 'structural' ? 'border-tech-blue text-tech-blue bg-tech-blue/10' : 'border-transparent hover:text-white'}`}
          >
            Structural Only
          </button>
          <button 
            onClick={() => setActiveLayer('dimensions')}
            className={`px-1.5 py-0.5 rounded-[1px] border ${activeLayer === 'dimensions' ? 'border-tech-blue text-tech-blue bg-tech-blue/10' : 'border-transparent hover:text-white'}`}
          >
            Dims Only
          </button>
        </div>
      </div>

      {/* Main CAD Canvas with infinite grid background */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative bg-[#0d1013] h-[320px] w-full overflow-hidden cursor-crosshair border-b border-graphite-800"
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Animated CAD Command-Line Terminal Loading Screen */}
        {loading && (
          <div className="absolute inset-0 bg-[#0d1013]/90 backdrop-blur-[1px] z-50 flex flex-col justify-end p-6 font-mono text-[10px] text-tech-blue select-text">
            <div className="space-y-1.5 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="size-4 animate-spin" />
                <span className="text-white font-bold tracking-widest uppercase">AUTOMATED STUDY BUDDY GEOPOLYGON ENGINE</span>
              </div>
              <div className="border-t border-graphite-800 my-2" />
              {pipelineLogs.map((log, idx) => {
                let color = "text-graphite-400";
                if (log.startsWith("SYSTEM")) color = "text-tech-blue font-bold";
                if (log.startsWith("GEMINI")) color = "text-fuchsia-400 font-bold";
                if (log.startsWith("CAD CORE")) color = "text-emerald-400 font-bold";
                if (log.includes("PIPELINE ERROR")) color = "text-rose-400 font-bold";
                if (log.includes("NOT DETECTED")) color = "text-amber-400";

                return (
                  <div key={idx} className={`flex gap-2 ${color} animate-fade-in`}>
                    <span className="text-graphite-600 select-none">[{idx + 1}]</span>
                    <span className="break-all">{log}</span>
                  </div>
                );
              })}
              <div className="flex gap-2 text-white animate-pulse mt-2">
                <span className="text-graphite-600 select-none">[*]</span>
                <span>EXECUTION RUNNING... CURSOR TRACK ACTIVE.</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Vector CAD Renderer (Gemini Generated Schema) */}
        {!loading && generatedDiagram && (
          <svg className="absolute inset-0 w-full h-full p-4 animate-fade-in" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {generatedDiagram.elements.map((el: any, i: number) => {
              // Check activeLayer visibility
              if (activeLayer === 'structural' && el.layer === 'dimensions') return null;
              if (activeLayer === 'dimensions' && el.layer === 'structural') return null;

              switch (el.type) {
                case 'line':
                  return (
                    <line
                      key={i}
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke={el.stroke || '#475569'}
                      strokeWidth={el.strokeWidth !== undefined ? el.strokeWidth : 1}
                      strokeDasharray={el.strokeDasharray}
                    />
                  );
                case 'rect':
                  return (
                    <rect
                      key={i}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      rx={el.rx}
                      fill={el.fill || 'none'}
                      fillOpacity={el.fillOpacity !== undefined ? el.fillOpacity : 1}
                      stroke={el.stroke || '#475569'}
                      strokeWidth={el.strokeWidth !== undefined ? el.strokeWidth : 1}
                      strokeDasharray={el.strokeDasharray}
                    />
                  );
                case 'circle':
                  return (
                    <circle
                      key={i}
                      cx={el.cx}
                      cy={el.cy}
                      r={el.r}
                      fill={el.fill || 'none'}
                      fillOpacity={el.fillOpacity !== undefined ? el.fillOpacity : 1}
                      stroke={el.stroke || '#475569'}
                      strokeWidth={el.strokeWidth !== undefined ? el.strokeWidth : 1}
                    />
                  );
                case 'text':
                  return (
                    <text
                      key={i}
                      x={el.x}
                      y={el.y}
                      fill={el.stroke || '#e2e8f0'}
                      fontSize={el.fontSize || 9}
                      textAnchor={el.textAnchor || 'start'}
                      className="font-mono uppercase select-none pointer-events-none"
                    >
                      {el.text}
                    </text>
                  );
                default:
                  return null;
              }
            })}
          </svg>
        )}
        {/* Dynamic CAD Crosshairs following the mouse cursor */}
        {isHovered && (
          <>
            {/* Horizontal line */}
            <div 
              className="absolute left-0 right-0 border-t border-graphite-700/60 pointer-events-none transition-none"
              style={{ top: `${mouseCoords.y}px` }}
            />
            {/* Vertical line */}
            <div 
              className="absolute top-0 bottom-0 border-l border-graphite-700/60 pointer-events-none transition-none"
              style={{ left: `${mouseCoords.x}px` }}
            />
            {/* Tiny center circle */}
            <div 
              className="absolute size-4 rounded-full border border-tech-blue/80 pointer-events-none -ml-2 -mt-2 flex items-center justify-center transition-none"
              style={{ left: `${mouseCoords.x}px`, top: `${mouseCoords.y}px` }}
            >
              <div className="size-1 rounded-full bg-tech-blue" />
            </div>
          </>
        )}

        {/* ----------------- DIAGRAM 1: ARCHITECTURE & BIM SYSTEM ----------------- */}
        {!generatedDiagram && !loading && category === 'architecture' && (
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background structures / flowlines */}
            <g opacity="0.3">
              <path d="M 50,150 L 150,80 L 250,150 L 150,220 Z" stroke="#0099ff" strokeWidth="1" strokeDasharray="4,4" />
              <path d="M 150,80 L 150,10" stroke="#0099ff" strokeWidth="1" strokeDasharray="2,2" />
              <path d="M 350,150 L 450,80 L 550,150 L 450,220 Z" stroke="#10b981" strokeWidth="1" strokeDasharray="4,4" />
            </g>

            {/* Siemens Parasolid Modeling Kernel Node */}
            {activeLayer !== 'dimensions' && (
              <g className="translate-x-[60px] translate-y-[50px]">
                {/* 3D solid visual wireframe */}
                <path d="M 50,40 L 100,20 L 150,40 L 100,60 Z" fill="#0284c7" fillOpacity="0.1" stroke="#0284c7" strokeWidth="1.5" />
                <path d="M 50,40 L 50,80 L 100,100 L 100,60" stroke="#0284c7" strokeWidth="1.5" />
                <path d="M 150,40 L 150,80 L 100,100" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3,1" />
                <text x="100" y="115" textAnchor="middle" fill="#0284c7" className="text-[10px] font-bold">Parasolid Kernel</text>
                <text x="100" y="127" textAnchor="middle" fill="#94a3b8" className="text-[8px]">Precision Engine</text>
              </g>
            )}

            {/* Central Cloud sync interface */}
            {activeLayer !== 'dimensions' && (
              <g className="translate-x-[220px] translate-y-[30px]">
                <rect x="10" y="20" width="140" height="70" rx="3" fill="#1e293b" stroke="#0099ff" strokeWidth="1" />
                <path d="M 80,10 L 80,20" stroke="#0099ff" strokeWidth="1.5" />
                <circle cx="80" cy="45" r="14" fill="#0099ff" fillOpacity="0.2" stroke="#0099ff" strokeWidth="1.5" />
                <text x="80" y="48" textAnchor="middle" fill="#38bdf8" className="text-[11px] font-bold">BIMPLUS</text>
                <text x="80" y="80" textAnchor="middle" fill="#94a3b8" className="text-[8px] font-semibold">Common Data Cloud</text>
                {/* Animated pulsing rings */}
                <circle cx="80" cy="45" r="22" stroke="#0099ff" strokeWidth="0.5" strokeDasharray="4,4" className="animate-spin" style={{ transformOrigin: '80px 45px' }} />
              </g>
            )}

            {/* IFC 4 Structure Tree Node */}
            {activeLayer !== 'structural' && (
              <g className="translate-x-[400px] translate-y-[40px]">
                <rect x="0" y="0" width="160" height="110" rx="2" fill="#111827" stroke="#10b981" strokeWidth="1" />
                <text x="10" y="20" fill="#10b981" className="text-[9px] font-bold">IFC4 CLASSIFICATION TREE</text>
                <text x="15" y="40" fill="#e2e8f0" className="text-[8px]">IfcProject (Allplan Project)</text>
                <text x="25" y="55" fill="#e2e8f0" className="text-[8px]">└── IfcBuildingStorey</text>
                <text x="35" y="70" fill="#34d399" className="text-[8px]">    └── IfcWallStandardCase</text>
                {/* Attribute tags */}
                <rect x="45" y="82" width="105" height="18" rx="1" fill="#047857" fillOpacity="0.3" stroke="#10b981" strokeWidth="0.5" />
                <text x="50" y="93" fill="#10b981" className="text-[7px]">Pset_WallCommon [FireRating: EI90]</text>
              </g>
            )}

            {/* Linking Flowlines */}
            <path d="M 180,130 L 230,100" stroke="#0099ff" strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="2,2" />
            <path d="M 370,100 L 400,100" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrow)" />
          </svg>
        )}

        {/* ----------------- DIAGRAM 2: USER INTERFACE & PALETTES ----------------- */}
        {!generatedDiagram && !loading && category === 'ui' && (
          <svg className="absolute inset-0 w-full h-full p-3" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Top Toolbar (Actionbar Mockup) */}
            <rect x="10" y="10" width="580" height="32" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <text x="20" y="30" fill="#38bdf8" className="text-[10px] font-bold">ACTIONBAR:</text>
            <text x="100" y="29" fill="#e2e8f0" className="text-[9px]">Role: Engineering</text>
            {/* Active tool highlight button */}
            <rect x="230" y="15" width="50" height="22" fill="#0284c7" rx="1" />
            <text x="255" y="29" textAnchor="middle" fill="#ffffff" className="text-[8px] font-bold">Wall [F3]</text>
            
            <rect x="285" y="15" width="50" height="22" fill="#334155" rx="1" />
            <text x="310" y="29" textAnchor="middle" fill="#94a3b8" className="text-[8px]">Slab [F4]</text>

            <rect x="340" y="15" width="60" height="22" fill="#334155" rx="1" />
            <text x="370" y="29" textAnchor="middle" fill="#94a3b8" className="text-[8px]">Reinforcement</text>

            {/* Left Properties Panel */}
            <rect x="10" y="50" width="130" height="230" fill="#111827" stroke="#334155" strokeWidth="1" />
            <text x="18" y="68" fill="#38bdf8" className="text-[9px] font-bold">PROPERTIES PALETTE</text>
            <line x1="15" y1="75" x2="135" y2="75" stroke="#334155" />
            
            {/* Properties fields */}
            <text x="18" y="95" fill="#94a3b8" className="text-[8px]">Wall Thickness</text>
            <text x="18" y="108" fill="#e2e8f0" className="text-[9px] font-semibold">300.00 mm</text>
            
            <text x="18" y="130" fill="#94a3b8" className="text-[8px]">Priority Join</text>
            <text x="18" y="143" fill="#34d399" className="text-[9px] font-semibold">500 (Concrete Core)</text>

            <text x="18" y="165" fill="#94a3b8" className="text-[8px]">Drawing Layer</text>
            <text x="18" y="178" fill="#38bdf8" className="text-[9px] font-semibold">AR_WALL_EXT</text>

            {/* Main view split visualization */}
            <rect x="150" y="50" width="440" height="230" fill="#020617" stroke="#334155" strokeWidth="1" />
            {/* Quadrant borders (4 viewport layout) */}
            <line x1="370" y1="50" x2="370" y2="280" stroke="#334155" strokeDasharray="3,3" />
            <line x1="150" y1="165" x2="590" y2="165" stroke="#334155" strokeDasharray="3,3" />

            {/* Viewport label text */}
            <text x="160" y="65" fill="#64748b" className="text-[8px] font-bold">PLAN VIEW (XY)</text>
            <text x="380" y="65" fill="#64748b" className="text-[8px] font-bold">ISOMETRIC WIREFRAME (XYZ)</text>
            <text x="160" y="180" fill="#64748b" className="text-[8px] font-bold">FRONT ELEVATION (XZ)</text>
            <text x="380" y="180" fill="#34d399" className="text-[8px] font-bold">REAL-TIME F4 RENDER (OPENGL)</text>

            {/* Render concrete structure inside F4 view */}
            <g className="translate-x-[440px] translate-y-[210px] scale-[0.6]">
              {/* Isometric Column */}
              <path d="M 0,-40 L 40,-60 L 80,-40 L 40,-20 Z" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
              <path d="M 0,-40 L 0,20 L 40,40 L 40,-20 Z" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1" />
              <path d="M 80,-40 L 80,20 L 40,40" stroke="#10b981" strokeWidth="1" />
            </g>
          </svg>
        )}

        {/* ----------------- DIAGRAM 3: PROJECT STRUCTURE & BUILDING HEIGHT LEVELS ----------------- */}
        {!generatedDiagram && !loading && category === 'project' && (
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Left panel: Structural Tree Hierarchy */}
            <g className="translate-x-[10px] translate-y-[20px]">
              <rect x="0" y="0" width="220" height="230" rx="2" fill="#111827" stroke="#334155" strokeWidth="1" />
              <text x="12" y="20" fill="#38bdf8" className="text-[9px] font-bold">BUILDING STRUCTURE TREE</text>
              <line x1="10" y1="28" x2="210" y2="28" stroke="#334155" />
              
              <text x="15" y="50" fill="#e2e8f0" className="text-[8px]">🏢 Project: BIM Plan Academy Istanbul</text>
              <text x="25" y="70" fill="#e2e8f0" className="text-[8px]">└── 🏗️ Building Model A</text>
              <text x="35" y="90" fill="#e2e8f0" className="text-[8px]">    └── 🪜 Storey: Ground Floor</text>
              
              {/* Drawing files detail */}
              <text x="45" y="115" fill="#38bdf8" className="text-[8px] font-semibold">├── 📄 Teilbild 101: Concrete Frame [Active]</text>
              <text x="45" y="135" fill="#94a3b8" className="text-[8px]">├── 📄 Teilbild 102: Slab Reinforcement [Ref]</text>
              <text x="45" y="155" fill="#94a3b8" className="text-[8px]">└── 📄 Teilbild 110: SmartPart Windows [Ref]</text>

              {/* Status footer */}
              <rect x="10" y="195" width="200" height="24" rx="1" fill="#1e293b" />
              <text x="20" y="210" fill="#10b981" className="text-[7.5px] font-bold">STATUS: ALL CODES AUTO-BACKED UP (.BAK)</text>
            </g>

            {/* Right panel: Elevation Plane Levels */}
            <g className="translate-x-[260px] translate-y-[30px]">
              <text x="10" y="10" fill="#e2e8f0" className="text-[10px] font-bold">DYNAMIC LEVEL PLANE DEFINITION</text>
              <line x1="10" y1="20" x2="300" y2="20" stroke="#475569" />

              {/* Upper plane line */}
              <g className="translate-y-[50px]">
                <line x1="10" y1="0" x2="230" y2="0" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="230" cy="0" r="3" fill="#38bdf8" />
                <text x="240" y="4" fill="#38bdf8" className="text-[9px] font-bold">Hu: +3.200 m</text>
                <text x="15" y="-6" fill="#64748b" className="text-[8px]">Upper Constraint Plane</text>
              </g>

              {/* Lower plane line */}
              <g className="translate-y-[150px]">
                <line x1="10" y1="0" x2="230" y2="0" stroke="#0284c7" strokeWidth="2" strokeDasharray="4,2" />
                <circle cx="230" cy="0" r="3" fill="#0284c7" />
                <text x="240" y="4" fill="#0284c7" className="text-[9px] font-bold">Hl: 0.000 m (Ground Level)</text>
                <text x="15" y="-6" fill="#64748b" className="text-[8px]">Lower Reference Plane</text>
              </g>

              {/* Wall height projection indicators */}
              <path d="M 60,150 L 60,50 L 140,50 L 140,150 Z" fill="#1e293b" fillOpacity="0.4" stroke="#475569" strokeWidth="1" />
              <text x="100" y="105" textAnchor="middle" fill="#94a3b8" className="text-[9px]">Wall Element (H = 3.20m)</text>
              <text x="100" y="120" textAnchor="middle" fill="#38bdf8" className="text-[8px]">Constraint: Hu to Hl</text>

              {/* Dimensions line on the side */}
              {activeLayer !== 'structural' && (
                <g className="translate-x-[190px]">
                  <line x1="0" y1="50" x2="0" y2="150" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M -4,50 L 4,50" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M -4,150 L 4,150" stroke="#f59e0b" strokeWidth="1" />
                  {/* Extension tick lines */}
                  <text x="8" y="105" fill="#f59e0b" className="text-[9px] font-bold">3200 mm</text>
                </g>
              )}
            </g>
          </svg>
        )}

        {/* ----------------- DIAGRAM 4: COORDINATE SYSTEMS & ACCURATE SNAPPING ----------------- */}
        {!generatedDiagram && !loading && category === 'coordinates' && (
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main Axis System Grid */}
            <line x1="50" y1="150" x2="550" y2="150" stroke="#1e293b" strokeWidth="1.5" />
            <line x1="300" y1="30" x2="300" y2="270" stroke="#1e293b" strokeWidth="1.5" />
            
            {/* Global Origin */}
            <circle cx="300" cy="150" r="5" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="1.5" />
            <text x="310" y="165" fill="#ef4444" className="text-[8px] font-bold">GLOBAL ORIGIN (0.0, 0.0)</text>

            {/* Rotated User Coordinate System (UCS) */}
            <g className="translate-x-[300px] translate-y-[150px] rotate-[25]">
              <line x1="0" y1="0" x2="160" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="170" y="3" fill="#38bdf8" className="text-[8px] font-bold">Rotated U-Axis (25°)</text>
              <line x1="0" y1="0" x2="0" y2="-100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="5" y="-105" fill="#38bdf8" className="text-[8px] font-bold">V-Axis</text>
            </g>

            {/* active snapping test coordinate point */}
            <g className="translate-x-[420px] translate-y-[100px]">
              {/* snap anchor */}
              <circle cx="0" cy="0" r="4" stroke="#10b981" strokeWidth="2" fill="none" />
              <rect x="-4" y="-4" width="8" height="8" stroke="#10b981" strokeWidth="1" fill="none" />
              <text x="12" y="3" fill="#10b981" className="text-[9px] font-bold">ENDPOINT SNAP</text>
              <text x="12" y="14" fill="#94a3b8" className="text-[7.5px]">Reference CAD element edge</text>

              {/* Delta line coordinate values */}
              {activeLayer !== 'structural' && (
                <g className="translate-x-[-120px] translate-y-[50px]">
                  <path d="M 0,0 L 120,0 L 120,-50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="55" y="-5" fill="#f59e0b" className="text-[8px]" textAnchor="middle">dx = 1500 mm</text>
                  <text x="125" y="-25" fill="#f59e0b" className="text-[8px]">dy = 625 mm</text>
                </g>
              )}
            </g>

            {/* Grid lock configuration */}
            <g className="translate-x-[30px] translate-y-[40px]">
              <rect x="0" y="0" width="130" height="40" rx="1" fill="#111827" stroke="#334155" strokeWidth="1" />
              <text x="8" y="15" fill="#38bdf8" className="text-[8px] font-bold">COORDINATE TRACKER</text>
              <text x="8" y="28" fill="#e2e8f0" className="text-[8px]">Snap Interval: 50.0 mm</text>
            </g>
          </svg>
        )}

        {/* ----------------- DIAGRAM 5: ARCHITECTURAL WALL JOIN MODELING ----------------- */}
        {!generatedDiagram && !loading && category === 'modeling' && (
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* L-Shape Wall Joint detailing with Priority Intersections */}
            <g className="translate-x-[80px] translate-y-[40px]">
              {/* Composite exterior wall structure (horizontal run) */}
              
              {/* Outer Plaster Layer (20mm) */}
              {activeLayer !== 'structural' && (
                <rect x="0" y="0" width="300" height="15" fill="#334155" fillOpacity="0.3" stroke="#475569" strokeWidth="1" />
              )}
              {/* Insulation Layer (150mm) */}
              {activeLayer !== 'structural' && (
                <rect x="0" y="15" width="300" height="45" fill="#1e293b" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
              )}
              {/* Structural Concrete Core Layer (300mm) */}
              <rect x="0" y="60" width="300" height="80" fill="#111827" stroke="#38bdf8" strokeWidth="2" />
              {/* Hatching patterns on concrete core to represent structured core */}
              <line x1="20" y1="60" x2="100" y2="140" stroke="#1e293b" strokeWidth="1" />
              <line x1="80" y1="60" x2="160" y2="140" stroke="#1e293b" strokeWidth="1" />
              <line x1="140" y1="60" x2="220" y2="140" stroke="#1e293b" strokeWidth="1" />
              <line x1="200" y1="60" x2="280" y2="140" stroke="#1e293b" strokeWidth="1" />

              {/* L-Shape vertical leg corner join */}
              <rect x="180" y="140" width="120" height="100" fill="#111827" stroke="#38bdf8" strokeWidth="2" />
              
              {/* Flawless priority join interface */}
              <line x1="180" y1="140" x2="300" y2="140" stroke="#0d1013" strokeWidth="4" />
              
              {/* Structural markings & priority annotations */}
              <g className="translate-x-[40px] translate-y-[90px]">
                <rect x="0" y="0" width="120" height="24" rx="1" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="0.5" />
                <text x="60" y="15" textAnchor="middle" fill="#38bdf8" className="text-[9px] font-bold">C30/37 CORE: PRIORITY 500</text>
              </g>

              {activeLayer !== 'structural' && (
                <g className="translate-x-[20px] translate-y-[25px]">
                  <text x="0" y="12" fill="#94a3b8" className="text-[8px] font-bold">EPS INSULATION: PRIORITY 200</text>
                </g>
              )}

              {/* Dimension Chains */}
              {activeLayer !== 'structural' && (
                <g className="translate-x-[-50px] translate-y-[0px]">
                  {/* Extension lines */}
                  <line x1="0" y1="0" x2="40" y2="0" stroke="#f59e0b" strokeWidth="0.5" />
                  <line x1="0" y1="15" x2="40" y2="15" stroke="#f59e0b" strokeWidth="0.5" />
                  <line x1="0" y1="60" x2="40" y2="60" stroke="#f59e0b" strokeWidth="0.5" />
                  <line x1="0" y1="140" x2="40" y2="140" stroke="#f59e0b" strokeWidth="0.5" />
                  {/* Main dimension line */}
                  <line x1="15" y1="0" x2="15" y2="140" stroke="#f59e0b" strokeWidth="1" />
                  {/* Tick marks */}
                  <path d="M 10,0 L 20,5" stroke="#f59e0b" />
                  <path d="M 10,15 L 20,20" stroke="#f59e0b" />
                  <path d="M 10,60 L 20,65" stroke="#f59e0b" />
                  <path d="M 10,140 L 20,145" stroke="#f59e0b" />
                  
                  {/* Dimension text readings */}
                  <text x="22" y="11" fill="#f59e0b" className="text-[7.5px]">20</text>
                  <text x="22" y="42" fill="#f59e0b" className="text-[7.5px]">150</text>
                  <text x="22" y="105" fill="#f59e0b" className="text-[8px] font-bold">300 mm</text>
                </g>
              )}
            </g>
          </svg>
        )}

        {/* ----------------- DIAGRAM 6: STRUCTURAL REBAR REINFORCEMENT & CONCRETE COVER ----------------- */}
        {!generatedDiagram && !loading && category === 'reinforcement' && (
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Beam Cross Section detailing */}
            <g className="translate-x-[150px] translate-y-[30px]">
              {/* Outer Beam Boundary (Concrete cross section 300 x 500) */}
              <rect x="0" y="0" width="280" height="220" rx="1" fill="#1e293b" fillOpacity="0.2" stroke="#475569" strokeWidth="2" />
              <text x="140" y="-10" textAnchor="middle" fill="#e2e8f0" className="text-[10px] font-bold">BEAM DESIGN SECTION [300 x 500 mm]</text>

              {/* Outer stirrup reinforcement wrapping inside */}
              <rect x="35" y="35" width="210" height="150" rx="4" fill="none" stroke="#ef4444" strokeWidth="2.5" />
              <text x="140" y="110" textAnchor="middle" fill="#ef4444" className="text-[8.5px] font-bold">STIRRUP (ETRİYE): Φ10 @ 150 mm</text>

              {/* 135 Degree Anchor Seismic Hooks detail on the top left */}
              <path d="M 45,35 L 75,55" stroke="#ef4444" strokeWidth="2.5" />
              <path d="M 35,45 L 55,75" stroke="#ef4444" strokeWidth="2.5" />

              {/* Longitudinal bars bottom tension reinforcement (4 * Φ20) */}
              <circle cx="50" cy="170" r="10" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
              <circle cx="110" cy="170" r="10" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
              <circle cx="170" cy="170" r="10" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
              <circle cx="230" cy="170" r="10" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
              <text x="140" y="195" textAnchor="middle" fill="#10b981" className="text-[9px] font-bold">TENSION BARS: 4 Φ 20 [Grade B500B]</text>

              {/* Longitudinal compression bars at top (2 * Φ12) */}
              <circle cx="50" cy="50" r="7" fill="#10b981" stroke="#047857" strokeWidth="1" />
              <circle cx="230" cy="50" r="7" fill="#10b981" stroke="#047857" strokeWidth="1" />
              <text x="140" y="70" textAnchor="middle" fill="#10b981" className="text-[8px]">COMPRESSION BARS: 2 Φ 12</text>

              {/* Concrete Nominal Cover dimensions visualization */}
              {activeLayer !== 'structural' && (
                <g className="translate-x-[-35px] translate-y-[110px]">
                  {/* Horizontal dimension tag */}
                  <line x1="0" y1="0" x2="35" y2="0" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M 0,-4 L 0,4" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M 35,-4 L 35,4" stroke="#f59e0b" strokeWidth="1" />
                  <text x="-5" y="-12" fill="#f59e0b" className="text-[8px] font-bold">C_nom = 35 mm</text>
                  <text x="-5" y="-3" fill="#64748b" className="text-[6.5px]">EC2 Concrete Cover</text>
                </g>
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Dynamic Interactive CAD Status Bar */}
      <div className="bg-graphite-900 px-3 py-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-t border-graphite-800 text-[10px] text-graphite-400 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            <Compass size={11} className="text-tech-blue" />
            <span>GRID LOCK: <strong className="text-emerald-400">ON</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            <Grid size={11} className="text-tech-blue" />
            <span>UNIT: <strong className="text-white">MM (METRIC)</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            <Layers size={11} className="text-tech-blue" />
            <span>DISCIPLINE: <strong className="text-white uppercase">{category}</strong></span>
          </div>
        </div>

        {/* Dynamic Coordinates Readout */}
        <div className="flex items-center gap-2 font-bold text-graphite-200 self-stretch md:self-auto justify-end">
          <Crosshair size={11} className="text-tech-blue" />
          <span className="bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            X: <strong className="text-tech-blue font-bold">{isHovered ? cadX : "3750.0"}</strong>
          </span>
          <span className="bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            Y: <strong className="text-tech-blue font-bold">{isHovered ? cadY : "1250.0"}</strong>
          </span>
          <span className="bg-graphite-950 px-2 py-0.5 rounded-[1px] border border-graphite-800">
            Z: <strong className="text-tech-blue font-bold">0.000</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
