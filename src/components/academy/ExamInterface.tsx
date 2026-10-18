import React, { useState, useEffect } from 'react';
import { TechnicalPanel, TechnicalBadge, TechnicalButton, TechnicalProgressBar } from './TechnicalUI';
import { Clock, HelpCircle, ChevronLeft, ChevronRight, Flag, BookOpen, Calculator, Sigma, Award, FileText, CheckCircle, XCircle } from 'lucide-react';

interface ExamInterfaceProps {
  onFinishExam: (score: number, total: number, percentage: number, passed: boolean) => void;
  onClose: () => void;
}

const QUESTIONS = [
  {
    id: 1,
    subject: "REINFORCEMENT MODELING STANDARDS",
    text: "In Allplan 2024, when defining a circular reinforcement pattern for a column section, which parameter strictly dictates the lap length calculation according to Eurocode 2 standards within the automated scheduling tool?",
    options: [
      { id: 'A', text: 'The diameter-to-mandrel ratio defined in the global project settings.' },
      { id: 'B', text: 'The specific steel grade yield strength combined with the anchorage coefficient (alpha).' },
      { id: 'C', text: 'The effective concrete cover depth as measured from the outer stirrup edge.' },
      { id: 'D', text: 'The cross-sectional area of the longitudinal bars regardless of the bond conditions.' }
    ],
    correctAnswer: 'B',
    explanation: "Under Eurocode 2 (EN 1992-1-1), Section 8.7.3, design lap length depends on yield strength, specific bond conditions, and anchorage coefficients. Changing diameter affects basic anchorage length, but steel grade combined with bond factors determines ultimate bond strength (f_bd) and lap coefficients."
  },
  {
    id: 2,
    subject: "OPENBIM & COLLABORATION",
    text: "Which cloud-based tool is utilized for multi-user collaboration, model coordination, and comparison in the Allplan OpenBIM workspace?",
    options: [
      { id: 'A', text: 'Allplan Bimplus Cloud Coordinator' },
      { id: 'B', text: 'Local Network Server' },
      { id: 'C', text: 'Solibri Model Viewer Lite' },
      { id: 'D', text: 'AutoCAD Civil 3D Sync' }
    ],
    correctAnswer: 'A',
    explanation: "Allplan Bimplus is the official cloud-based platform for coordinate models, clash detection, and teamwork, facilitating real-time OpenBIM communication."
  },
  {
    id: 3,
    subject: "WALL MODELING TECHNIQUES",
    text: "What is the primary function of Priority Values when configuring composite, multi-layer wall elements in Allplan?",
    options: [
      { id: 'A', text: 'It dictates the drawing order in the 2D layout editor.' },
      { id: 'B', text: 'It determines layer intersections and material precedence in composite walls.' },
      { id: 'C', text: 'It assigns the structural design load limit.' },
      { id: 'D', text: 'It sets the export hierarchy for IFC4 models.' }
    ],
    correctAnswer: 'B',
    explanation: "Allplan uses priority numbers (0-1000) to control automatic intersections. If Concrete has priority 500 and Insulation has 300, the concrete layer cuts through the insulation layer cleanly at intersection points."
  },
  {
    id: 4,
    subject: "REBAR AUTOMATION",
    text: "When detailing slab reinforcement in Allplan, what does a BAMTEC carpet represent?",
    options: [
      { id: 'A', text: 'A pre-fabricated reinforcement mesh rolled out on-site.' },
      { id: 'B', text: 'A protective concrete cover layer.' },
      { id: 'C', text: 'A 3D circular stirrup cage.' },
      { id: 'D', text: 'A foundation soil stabilization membrane.' }
    ],
    correctAnswer: 'A',
    explanation: "BAMTEC is an automated reinforcement technology. Rebar is welded onto steel bands to create carpets that can be rolled out directly on formwork, significantly cutting construction times."
  },
  {
    id: 5,
    subject: "LEVEL OF DETAIL (LOD)",
    text: "Which Level of Detail (LOD) is typically expected for construction-ready structural reinforcement detailing and rebar schedules?",
    options: [
      { id: 'A', text: 'LOD 100' },
      { id: 'B', text: 'LOD 200' },
      { id: 'C', text: 'LOD 300' },
      { id: 'D', text: 'LOD 400' }
    ],
    correctAnswer: 'D',
    explanation: "LOD 400 represents elements that are detailed as specific assemblies with complete fabrication, assembly, and detail information (including precise bar diameters, hooks, and laps)."
  }
];

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ onFinishExam, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number; percentage: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = QUESTIONS[currentIdx];

  const handleSelectOption = (optId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optId
    }));
  };

  const handleNext = () => {
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    let score = 0;
    QUESTIONS.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        score += 1;
      }
    });

    const total = QUESTIONS.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 60;

    const result = { score, total, percentage, passed };
    setExamResult(result);
    setIsSubmitted(true);
    onFinishExam(score, total, percentage, passed);
  };

  if (isSubmitted && examResult) {
    return (
      <div className="fixed inset-0 bg-graphite-950 z-[100] flex flex-col overflow-y-auto p-6 md:p-12">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
          {/* Left Column: Evaluation stats */}
          <div className="lg:col-span-4 bg-graphite-900 border-2 border-graphite-500 p-6 space-y-6 shadow-2xl rounded-[2px]">
            <div className="flex justify-center">
              {examResult.passed ? (
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="text-signal-green size-10" />
                </div>
              ) : (
                <div className="size-16 rounded-full bg-signal-red/10 border border-signal-red/30 flex items-center justify-center">
                  <XCircle className="text-signal-red size-10" />
                </div>
              )}
            </div>

            <div className="space-y-1 text-center">
              <h2 className="text-lg font-black uppercase tracking-tight text-foreground">Evaluation Completed</h2>
              <p className="tech-label text-graphite-400">Allplan BIM Specialist II Exam</p>
            </div>

            <div className="p-4 bg-graphite-950 border border-graphite-700 font-mono text-[11px] space-y-3">
              <div className="flex justify-between">
                <span className="text-graphite-500">TOTAL QUESTIONS:</span>
                <span className="text-graphite-50 font-bold">{examResult.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-graphite-500">CORRECT ANSWERS:</span>
                <span className="text-graphite-50 font-bold">{examResult.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-graphite-500">SUCCESS RATE:</span>
                <span className={examResult.passed ? 'text-signal-green font-bold' : 'text-signal-red font-bold'}>
                  {examResult.percentage}%
                </span>
              </div>
              <div className="flex justify-between border-t border-graphite-800 pt-3 mt-3">
                <span className="text-graphite-500">STATUS:</span>
                <span className={examResult.passed ? 'text-signal-green font-bold' : 'text-signal-red font-bold'}>
                  {examResult.passed ? 'PASSED / ELIGIBLE' : 'FAILED / RE-TRY'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!examResult.passed && (
                <TechnicalButton 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => {
                    setIsSubmitted(false);
                    setExamResult(null);
                    setCurrentIdx(0);
                    setSelectedAnswers({});
                    setTimeLeft(600);
                  }}
                >
                  Retry Exam
                </TechnicalButton>
              )}
              <TechnicalButton className="w-full" onClick={onClose}>
                Back to Dashboard
              </TechnicalButton>
            </div>
          </div>

          {/* Right Column: Detailed review with explanations (GAP 3 - EXAM REVIEW AND EXPLANATIONS) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-graphite-900 border border-graphite-700 p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold text-graphite-100 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} className="text-tech-blue" />
                Detailed Question-by-Question Review
              </h3>
              <span className="text-[10px] font-mono bg-tech-blue/15 text-tech-blue border border-tech-blue/20 px-2 py-0.5">EXPERT CITATIONS</span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {QUESTIONS.map((q, idx) => {
                const userAns = selectedAnswers[q.id];
                const isCorrect = userAns === q.correctAnswer;
                return (
                  <div key={q.id} className={`p-4 border font-mono text-[11px] space-y-3 rounded-[1px] ${
                    isCorrect ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'
                  }`}>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-bold text-graphite-200">
                        Q{idx + 1}: {q.subject}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-[1px] uppercase shrink-0 ${
                        isCorrect 
                          ? 'bg-signal-green/10 border-signal-green/30 text-signal-green' 
                          : 'bg-signal-red/10 border-signal-red/30 text-signal-red'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <p className="text-graphite-300 font-sans leading-relaxed text-xs">
                      {q.text}
                    </p>

                    <div className="grid grid-cols-1 gap-1 pl-2 border-l border-graphite-800">
                      <p className="text-graphite-500">
                        YOUR ANSWER: <span className={isCorrect ? 'text-signal-green font-bold' : 'text-signal-red font-bold'}>
                          ({userAns || 'None'}) {q.options.find(o => o.id === userAns)?.text || 'NOT ANSWERED'}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-graphite-500">
                          CORRECT ANSWER: <span className="text-signal-green font-bold">
                            ({q.correctAnswer}) {q.options.find(o => o.id === q.correctAnswer)?.text}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="bg-graphite-950 p-3 border border-graphite-800 space-y-1">
                      <p className="text-tech-blue text-[10px] font-bold uppercase tracking-wider">ACADEMIC EXPLANATION & STANDARDS CITATION:</p>
                      <p className="text-graphite-400 text-[10px] leading-relaxed font-sans">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-graphite-950 z-[100] flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-graphite-500 bg-graphite-900 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-tech-blue">
            <Award size={24} />
            <h2 className="tech-label text-graphite-50">Certification Exam: BIM Specialist II</h2>
          </div>
          <div className="h-8 w-px bg-graphite-700" />
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="tech-label text-graphite-500">Question</p>
              <p className="font-mono text-sm text-graphite-50">{currentIdx + 1} / {QUESTIONS.length}</p>
            </div>
            <div className="text-center">
              <p className="tech-label text-graphite-500">Subject</p>
              <p className="font-mono text-sm text-tech-blue uppercase">{currentQuestion.subject}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <p className="tech-label text-signal-red">Time Remaining</p>
            <p className="font-mono text-2xl font-black text-signal-red">{formatTime(timeLeft)}</p>
          </div>
          <TechnicalButton variant="danger" size="lg" onClick={handleSubmit}>Finish Exam</TechnicalButton>
        </div>
      </header>

      {/* Progress Strip */}
      <div className="h-1 w-full bg-graphite-800">
        <div 
          className="h-full bg-tech-blue transition-all duration-300" 
          style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }} 
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Questions status */}
        <aside className="w-64 border-r border-graphite-500 bg-graphite-900 p-6 space-y-6">
          <div className="space-y-2">
            <p className="tech-label text-graphite-500">Exam Overview</p>
            <div className="space-y-1">
              <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[2px] bg-tech-blue text-foreground">
                <BookOpen size={16} />
                <span className="text-xs font-bold">Active Test</span>
              </div>
            </div>
          </div>

          <div className="machined-groove pt-6 space-y-4">
            <p className="tech-label text-graphite-500">Question Status</p>
            <div className="grid grid-cols-5 gap-2">
              {QUESTIONS.map((q, i) => {
                const isCurrent = i === currentIdx;
                const isAnswered = selectedAnswers[q.id] !== undefined;
                return (
                  <div 
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`size-8 flex items-center justify-center font-mono text-[10px] border rounded-[1px] cursor-pointer transition-all ${
                      isCurrent 
                        ? 'bg-tech-blue border-tech-blue text-foreground' 
                        : isAnswered 
                        ? 'bg-graphite-700 border-graphite-500 text-graphite-50' 
                        : 'bg-graphite-900 border-graphite-700 text-graphite-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content: Question */}
        <main className="flex-1 overflow-y-auto p-12 bg-graphite-950">
          <div className="max-w-[800px] mx-auto space-y-12">
            <div className="space-y-6">
              <h3 className="tech-label text-tech-blue">Question {currentQuestion.id}: {currentQuestion.subject}</h3>
              <p className="text-2xl font-bold text-graphite-50 leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            <div className="space-y-4">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                return (
                  <div 
                    key={opt.id} 
                    onClick={() => handleSelectOption(opt.id)}
                    className={`flex items-center gap-6 p-6 border-2 cursor-pointer transition-all group ${
                      isSelected 
                        ? 'bg-tech-blue/10 border-tech-blue' 
                        : 'bg-graphite-900 border-graphite-700 hover:border-graphite-500'
                    }`}
                  >
                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'border-tech-blue bg-tech-blue' 
                        : 'border-graphite-500 group-hover:border-graphite-300'
                    }`}>
                      {isSelected && <div className="size-2 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-1">
                      <span className={`tech-label ${isSelected ? 'text-tech-blue' : 'text-graphite-500'}`}>OPTION {opt.id}</span>
                      <p className="text-lg text-graphite-200">{opt.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-12 border-t border-graphite-700">
              <TechnicalButton 
                variant="ghost" 
                icon={ChevronLeft} 
                onClick={handlePrev}
                disabled={currentIdx === 0}
              >
                Previous Question
              </TechnicalButton>
              <div className="flex gap-4">
                {currentIdx < QUESTIONS.length - 1 ? (
                  <TechnicalButton 
                    size="lg" 
                    icon={ChevronRight} 
                    iconPosition="right"
                    onClick={handleNext}
                  >
                    Next Question
                  </TechnicalButton>
                ) : (
                  <TechnicalButton 
                    variant="primary"
                    size="lg" 
                    icon={CheckCircle} 
                    iconPosition="right"
                    onClick={handleSubmit}
                  >
                    Finish Exam
                  </TechnicalButton>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-graphite-900 border-t border-graphite-500 px-8 flex items-center justify-between text-[10px] font-mono text-graphite-500 uppercase tracking-widest">
        <div className="flex gap-6">
          <span>CONNECTION: SECURE</span>
          <span>SERVER: CLOUD-RUN-FIREBASE</span>
          <span>VERSION: 24.1.08</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-signal-green animate-pulse" />
          <span>AUTO-SAVE ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};
