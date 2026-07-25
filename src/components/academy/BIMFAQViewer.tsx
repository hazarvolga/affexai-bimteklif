import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, RefreshCw, Layers, Cpu, FileSpreadsheet, Activity, BookOpen } from 'lucide-react';
import { TechnicalPanel, TechnicalButton } from './TechnicalUI';

interface FAQItem {
  question: string;
  answer: string;
}

const TOPICS = [
  { id: 'walls', label: 'Wall Modeling & Priority Intersections', icon: Layers, defaultQuery: 'composite walls and priority layers' },
  { id: 'rebar', label: 'Eurocode 2 Reinforcement & Covers', icon: Cpu, defaultQuery: 'Eurocode 2 rebar cover calculation' },
  { id: 'openbim', label: 'openBIM, IFC4 Export & Bimplus', icon: Activity, defaultQuery: 'openBIM IFC4 export standards' },
  { id: 'schedules', label: 'Bending Schedules & Quantity Takeoffs', icon: FileSpreadsheet, defaultQuery: 'bending schedule and QTO excel output' },
  { id: 'general', label: 'General Layer Structures & Pen Sets', icon: BookOpen, defaultQuery: 'CAD layer standards and pen color sets' }
];

export const BIMFAQViewer: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isFallback, setIsFallback] = useState(false);

  // Load baseline FAQs for the selected topic on initial render or topic change
  useEffect(() => {
    fetchFAQs(selectedTopic, false);
  }, [selectedTopic]);

  const fetchFAQs = async (topicObj: typeof TOPICS[0], forceGenerate = false) => {
    setIsLoading(true);
    setExpandedIndex(null);
    try {
      const response = await fetch('/api/faq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topicObj.label,
          context: {
            defaultQuery: topicObj.defaultQuery,
            requestType: forceGenerate ? 'gemini_generation' : 'initial_load'
          }
        })
      });

      const data = await response.json();
      if (data.success && data.faqs && data.faqs.length > 0) {
        setFaqs(data.faqs);
        setIsFallback(!!data.fallback);
      } else {
        throw new Error("Invalid FAQ response format");
      }
    } catch (error) {
      console.error("Failed to load FAQs:", error);
      // Hard fallback in case server or network fails
      setFaqs([
        {
          question: `How do I optimize workflows for ${topicObj.label}?`,
          answer: `Ensure you strictly follow the official BIM Plan Academy standards. Use standard templates, keep layers organized according to standard classifications, and verify all dimensions prior to concrete casting or final IFC export.`
        },
        {
          question: `What are the critical parameters for ${topicObj.label}?`,
          answer: `Key parameters include proper object associations, accurate material assignments (e.g. Concrete C30/37), and standard export options configured for structural frame analysis solvers.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Topic selector bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {TOPICS.map((topic) => {
          const isSelected = selectedTopic.id === topic.id;
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className={`p-3 border text-left flex flex-col justify-between transition-all rounded-[1px] h-20 ${
                isSelected
                  ? 'bg-tech-blue/10 border-tech-blue text-white shadow-md shadow-tech-blue/5'
                  : 'bg-graphite-900/60 border-graphite-800 text-graphite-400 hover:border-graphite-600 hover:text-white'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-tech-blue' : 'text-graphite-500'} />
              <span className="text-[10px] font-mono leading-tight font-bold uppercase block mt-1">
                {topic.label.split(' & ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      <TechnicalPanel
        title={`Live FAQ Portal: ${selectedTopic.label}`}
        accentColor="#38bdf8"
        headerRight={
          <div className="flex items-center gap-2">
            {isFallback && (
              <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/20 uppercase">
                DEMO MODE
              </span>
            )}
            <TechnicalButton
              variant="primary"
              size="sm"
              onClick={() => fetchFAQs(selectedTopic, true)}
              disabled={isLoading}
              icon={isLoading ? RefreshCw : Sparkles}
              className="font-mono text-[9px] py-1"
            >
              {isLoading ? 'GENERATING...' : 'ASK GEMINI'}
            </TechnicalButton>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between border-b border-graphite-800 pb-3">
            <div>
              <p className="text-[10px] font-mono text-tech-blue uppercase tracking-wider">
                Reduce Trainee Friction — Real-Time Expert Guidance
              </p>
              <p className="text-[11px] text-graphite-400">
                Click a question to view detailed step-by-step technical answers or trigger Gemini to re-analyze.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-4 bg-graphite-950/40 border border-graphite-900 rounded-[2px] relative overflow-hidden">
              {/* Spinning Loader */}
              <div className="relative">
                <div className="size-10 border-4 border-tech-blue/20 border-t-tech-blue rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 text-tech-blue animate-pulse" />
              </div>
              <div className="text-center space-y-1 z-10">
                <p className="text-xs font-mono text-white animate-pulse uppercase tracking-widest">
                  Gemini API is drafting solutions...
                </p>
                <p className="text-[9px] font-mono text-graphite-500 uppercase tracking-widest">
                  Consulting openBIM & Eurocode 2 engineering databases
                </p>
              </div>
              {/* Blueprint Grid background in loader */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1d1f_1px,transparent_1px),linear-gradient(to_bottom,#1b1d1f_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-30 pointer-events-none" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {faqs.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div
                    key={index}
                    className={`border transition-all rounded-[1px] overflow-hidden ${
                      isExpanded
                        ? 'bg-graphite-900/90 border-tech-blue/50 shadow-lg shadow-tech-blue/5'
                        : 'bg-graphite-950/60 border-graphite-800 hover:border-graphite-700'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpand(index)}
                      className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-graphite-900/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle size={15} className={isExpanded ? 'text-tech-blue' : 'text-graphite-500'} />
                        <h4 className={`text-xs sm:text-sm font-bold tracking-tight uppercase ${isExpanded ? 'text-white' : 'text-graphite-300'}`}>
                          {faq.question}
                        </h4>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-tech-blue shrink-0 ml-4" />
                      ) : (
                        <ChevronDown size={16} className="text-graphite-500 shrink-0 ml-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-11 pb-4 pt-1 animate-fadeIn border-t border-graphite-900">
                        <p className="text-xs text-graphite-400 font-sans leading-relaxed whitespace-pre-wrap select-text">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[8px] font-mono text-graphite-500 uppercase border-t border-graphite-900 pt-3">
            <span>Powered by Gemini-3.5-flash AI Model</span>
            <span>Allplan Integrated Helper Framework</span>
          </div>
        </div>
      </TechnicalPanel>
    </div>
  );
};
