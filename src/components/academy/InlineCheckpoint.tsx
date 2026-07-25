import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, AlertTriangle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckpointQuestion {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

const CHECKPOINTS_DATA: Record<string, CheckpointQuestion> = {
  "Software overview": {
    question: "Which palette in the Allplan User Interface (UI) provides rapid access to the parameters and properties of active drawing tools?",
    options: [
      "Wizards Palette",
      "Properties Palette",
      "Layers Palette",
      "Library Palette"
    ],
    correctIdx: 1,
    explanation: "The Properties palette provides dynamic, real-time access to all parameters (thickness, material, priority joins, etc.) of any selected architectural or structural element, allowing you to edit them instantly."
  },
  "Drawing 2D elements": {
    question: "What feature in Allplan automatically locks the cursor onto existing grid lines or corners of other elements while drafting?",
    options: [
      "Axis Lock",
      "Point Snap / Coordinate Snap",
      "Drafting Grid Toggles",
      "Wizards Shortcut Snapping"
    ],
    correctIdx: 1,
    explanation: "The Point Snap / Coordinate Snap feature locks the cursor onto endpoints, intersections, and midpoints automatically to ensure high precision while drafting."
  },
  "Layer system overview": {
    question: "Unlike traditional CAD software, what is the primary advantage of utilizing 'Layers' in Allplan?",
    options: [
      "It only serves to change the display colors of vector lines.",
      "It automatically locks elements in the Allplan Wizards.",
      "It centrally and dynamically controls the visibility, pen weights, line styles, and material assignments of BIM elements.",
      "It makes it mandatory to limit the number of drawing files (Teilbilder) in a project."
    ],
    correctIdx: 2,
    explanation: "The Allplan layer structure centrally governs drawing standard assignments like pen weights, line styles, and hatch symbols, while controlling the layout visibility of BIM elements."
  },
  "Wall modeling techniques": {
    question: "What is the most critical rule in Allplan to achieve clean geometric joins in a multi-layer (composite) exterior wall (Structural Concrete Core + Thermal Insulation + Exterior Plaster)?",
    options: [
      "Keep the physical thicknesses of all layers completely equal",
      "Set the connection priority value of the structural concrete core higher than that of the insulation and plaster layers",
      "Keep the priority value of the thermal insulation layer higher than that of the concrete core",
      "Manually delete vector intersections after drafting using a CAD macro"
    ],
    correctIdx: 1,
    explanation: "For correct BIM modeling, structural elements (core concrete) must always have the highest priority value (e.g., 500). This allows the core to cleanly and continuously cut through finishes and insulation layers (priority join)."
  },
  "Rebar modeling & reinforcement": {
    question: "Under Eurocode 2 guidelines for calculating tensile reinforcement lap length (l_0) in concrete, which factor directly reduces bond quality (η1), leading to an increase in the required lap length?",
    options: [
      "Pouring concrete under Good Bond conditions",
      "Utilizing high-strength concrete (C35/45) instead of lower grades (C20/25)",
      "The occurrence of Poor Bond conditions due to challenging pouring states (e.g., upper sections of columns or thick, flat elements)",
      "Selecting a smaller bar diameter (e.g., Φ8 instead of Φ10)"
    ],
    correctIdx: 2,
    explanation: "According to Eurocode 2, the bond quality factor is reduced to η1 = 0.7 (Poor Bond) in sections where concrete quality might drop during pouring (such as top parts of columns). Since this weakens bond strength, it increases the minimum lap length (l_0) required to prevent slippage."
  }
};

const DEFAULT_CHECKPOINT: CheckpointQuestion = {
  question: "In the BIM (Building Information Modeling) workflow, which IFC export schema is considered the standard for error-free use of 3D parametric models in site excavation and fabrication phases?",
  options: [
    "IFC2x3 or IFC4 Standard Coordination View",
    "DWG CAD File Reference Export",
    "PDF 3D Static View Export",
    "XML Wizard Template Export"
  ],
  correctIdx: 0,
  explanation: "In BIM standards, openBIM IFC2x3 or modern IFC4 export schemas must be preferred to ensure error-free data exchange with other disciplines (SCIA Engineer, Revit, etc.)."
};

export const InlineCheckpoint: React.FC<{ lessonTitle: string }> = ({ lessonTitle }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [checkpoint, setCheckpoint] = useState<CheckpointQuestion>(DEFAULT_CHECKPOINT);

  // Sync with current lesson
  useEffect(() => {
    const matched = CHECKPOINTS_DATA[lessonTitle];
    if (matched) {
      setCheckpoint(matched);
    } else {
      // Create a fallback question that uses the lesson title dynamically
      setCheckpoint({
        question: `Considering the technical knowledge gained in the "${lessonTitle}" module, which of the following is the most critical workflow step to ensure a sustainable BIM delivery matching Allplan standards?`,
        options: [
          "Defining BIM elements with standardized layers and material attributes",
          "Drafting the design using only 2D lines and leaving parameter assignments empty",
          "Drafting elements with randomized connection priority values",
          "Relying on manual annotations instead of international standards (Eurocodes/IFC)"
        ],
        correctIdx: 0,
        explanation: `The core goal of the "${lessonTitle}" lesson is to fully define the real-world physical and structural characteristics (Attributes/LOD) of elements within Allplan, achieving total compliance with BIM standard models.`
      });
    }
    // Reset state
    setSelectedIdx(null);
    setIsSubmitted(false);
  }, [lessonTitle]);

  const handleSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedIdx(idx);
  };

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedIdx(null);
    setIsSubmitted(false);
  };

  const isCorrect = selectedIdx === checkpoint.correctIdx;

  return (
    <div className="bg-graphite-900 border border-graphite-500 rounded-[2px] p-6 space-y-4 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-tech-blue" />
      
      <div className="flex items-center justify-between border-b border-graphite-700 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-tech-blue animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-tech-blue uppercase">LESSON CHECKPOINT</span>
        </div>
        <div className="flex items-center gap-1 bg-tech-blue/10 px-2 py-0.5 rounded-[1px] border border-tech-blue/20">
          <Sparkles size={10} className="text-tech-blue" />
          <span className="text-[8px] font-mono text-tech-blue uppercase">Precision Check</span>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-graphite-50 leading-relaxed font-sans">
          {checkpoint.question}
        </h4>

        {/* Options */}
        <div className="space-y-2">
          {checkpoint.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            let btnStyle = "bg-graphite-950 border-graphite-800 text-graphite-300 hover:border-graphite-600";
            
            if (isSubmitted) {
              if (idx === checkpoint.correctIdx) {
                btnStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold";
              } else if (isSelected) {
                btnStyle = "bg-red-950/40 border-red-500 text-red-400 opacity-80";
              } else {
                btnStyle = "bg-graphite-950/50 border-graphite-850 text-graphite-500 opacity-60";
              }
            } else if (isSelected) {
              btnStyle = "bg-tech-blue/10 border-tech-blue text-tech-blue font-semibold";
            }

            return (
              <button
                key={idx}
                disabled={isSubmitted}
                onClick={() => handleSelect(idx)}
                className={`w-full p-3 border text-left rounded-[1px] transition-all flex items-center gap-3 font-mono text-xs cursor-pointer ${btnStyle}`}
              >
                <span className={`size-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold ${
                  isSelected 
                    ? "bg-tech-blue border-tech-blue text-white" 
                    : "bg-graphite-900 border-graphite-700 text-graphite-400"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-2">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedIdx === null}
              className="px-5 py-2.5 bg-tech-blue hover:bg-tech-blue/90 disabled:bg-graphite-800 disabled:text-graphite-500 disabled:border-graphite-700 disabled:cursor-not-allowed border border-tech-blue text-white font-mono text-xs uppercase tracking-wider rounded-[1px] transition-colors cursor-pointer"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-graphite-950 border border-graphite-700 hover:bg-graphite-800 text-graphite-300 font-mono text-[10px] uppercase tracking-wider rounded-[1px] transition-colors cursor-pointer flex items-center gap-2"
            >
              <RefreshCw size={12} /> Try Again
            </button>
          )}
        </div>

        {/* Explanations */}
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 border font-mono text-xs space-y-2 rounded-[1px] ${
              isCorrect 
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" 
                : "bg-amber-950/20 border-amber-500/30 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              {isCorrect ? (
                <>
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Excellent! Correct Answer.</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span>Incorrect. Engineering Verification Required.</span>
                </>
              )}
            </div>
            <p className="leading-relaxed text-graphite-200 pl-6 border-l border-graphite-700/60 mt-1">
              {checkpoint.explanation}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
