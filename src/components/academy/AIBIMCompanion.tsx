import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, MessageSquare, Bot, User, Loader2, ArrowRight, 
  X, Maximize2, Minimize2, RefreshCw, HelpCircle, FileText, 
  Check, AlertCircle, Pin, PinOff, Keyboard, BookOpen, GraduationCap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLessonDetail } from '../../data/lessonsContent';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AIBIMCompanionProps {
  lessonTitle: string;
  courseTitle: string;
}

export const AIBIMCompanion: React.FC<AIBIMCompanionProps> = ({ lessonTitle, courseTitle }) => {
  // Sidebar states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const drawerChatEndRef = useRef<HTMLDivElement>(null);

  // Active lesson content
  const lesson = getLessonDetail(lessonTitle);

  // Initialize welcome message
  const getWelcomeMessage = (title: string) => ({
    role: 'assistant' as const,
    text: `Hello! I am your AI Study Buddy. 🎓\n\nI have analyzed all the technical specifications for your active module, **"${title}"**.\n\n**How can I assist you today?**\n- 📖 Ask me about any specific steps, definitions, or CAD workflows.\n- 📝 Click the quick actions below to summarize the lesson material.\n- 🧠 Click **"Quiz Me"** to test your knowledge with interactive, technical multiple-choice questions!`
  });

  // Load welcome message on mount and lesson switch
  useEffect(() => {
    setMessages([getWelcomeMessage(lessonTitle)]);
  }, [lessonTitle]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    drawerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isDrawerOpen]);

  // Handle send message
  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || inputValue.trim();
    if (!messageText || isLoading) return;

    if (!textToSend) {
      setInputValue('');
    }

    const updatedMessages = [...messages, { role: 'user', text: messageText } as Message];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Structure conversation history for server-side Gemini API
      const historyPayload = updatedMessages.slice(1, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));

      // Fetch from our server-side API (safe, credentials hidden)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: { 
            lessonTitle, 
            courseTitle,
            subtitle: lesson.subtitle,
            introduction: lesson.introduction,
            steps: lesson.steps,
            recommendation: lesson.recommendation,
            attachments: lesson.attachments
          },
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error('Could not establish a connection with the AI assistant service.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (error: any) {
      console.error("Study Buddy API Error:", error);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: `⚠️ **Connection Error:** The Gemini API could not respond. Please ensure a valid \`GEMINI_API_KEY\` is configured in your platform settings (Settings > Secrets).\n\n_Details:_ ${error.message}` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([getWelcomeMessage(lessonTitle)]);
  };

  // Custom visual inline parser for basic Markdown (*bold*, `code`, lists, and tables)
  const parseInlineText = (text: string) => {
    const parsedParts: { type: 'text' | 'bold' | 'code'; text: string }[] = [];
    const tokens: { start: number; end: number; type: 'bold' | 'code'; content: string }[] = [];
    
    // Find bold matches **text**
    let boldMatch;
    const boldRegex = /\*\*(.*?)\*\*/g;
    while ((boldMatch = boldRegex.exec(text)) !== null) {
      tokens.push({
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        type: 'bold',
        content: boldMatch[1]
      });
    }

    // Find code matches `code`
    let codeMatch;
    const codeRegex = /`(.*?)`/g;
    while ((codeMatch = codeRegex.exec(text)) !== null) {
      tokens.push({
        start: codeMatch.index,
        end: codeMatch.index + codeMatch[0].length,
        type: 'code',
        content: codeMatch[1]
      });
    }

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Resolve non-overlapping tokens
    let lastIndex = 0;
    for (const token of tokens) {
      if (token.start < lastIndex) continue; // Skip overlapping tokens
      if (token.start > lastIndex) {
        parsedParts.push({ type: 'text', text: text.substring(lastIndex, token.start) });
      }
      parsedParts.push({ type: token.type, text: token.content });
      lastIndex = token.end;
    }
    if (lastIndex < text.length) {
      parsedParts.push({ type: 'text', text: text.substring(lastIndex) });
    }

    if (parsedParts.length === 0) {
      return text;
    }

    return parsedParts.map((p, idx) => {
      if (p.type === 'bold') {
        return <strong key={idx} className="text-tech-blue font-bold">{p.text}</strong>;
      }
      if (p.type === 'code') {
        return <code key={idx} className="bg-graphite-950 px-1 py-0.5 border border-graphite-800 text-[10px] text-amber-400 font-mono rounded-[2px]">{p.text}</code>;
      }
      return p.text;
    });
  };

  // Custom paragraph & block level markdown renderer
  const renderFormattedMarkdown = (rawText: string) => {
    const lines = rawText.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    let isInsideTable = false;
    let isInsideCode = false;
    let currentCodeLines: string[] = [];

    const flushTable = (keyId: number) => {
      if (currentTable.length > 0) {
        const headers = currentTable[0];
        const rows = currentTable.slice(1);
        elements.push(
          <div key={`table-block-${keyId}`} className="overflow-x-auto my-3 border border-graphite-800 rounded-[2px]">
            <table className="w-full text-left border-collapse font-mono text-[10px]">
              <thead>
                <tr className="bg-graphite-900 border-b border-graphite-700">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 text-graphite-300 font-bold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-graphite-850 hover:bg-graphite-900/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 text-graphite-200">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Code Block check
      if (line.startsWith('```')) {
        flushTable(i);
        isInsideTable = false;
        if (isInsideCode) {
          isInsideCode = false;
          elements.push(
            <pre key={`code-block-${i}`} className="bg-graphite-950 border border-graphite-800 p-3 my-2 text-tech-blue font-mono text-[10px] overflow-x-auto rounded-[2px] leading-relaxed select-all">
              <code>{currentCodeLines.join('\n')}</code>
            </pre>
          );
          currentCodeLines = [];
        } else {
          isInsideCode = true;
        }
        continue;
      }

      if (isInsideCode) {
        currentCodeLines.push(lines[i]); // Keep original indent
        continue;
      }

      // Table Row check
      if (line.startsWith('|')) {
        isInsideTable = true;
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        // Skip table division lines: |---|---|
        if (!cells.every(c => /^[-:]+$/.test(c))) {
          currentTable.push(cells);
        }
        continue;
      } else if (isInsideTable) {
        flushTable(i);
        isInsideTable = false;
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={`bullet-${i}`} className="flex gap-2 ml-2 my-1 align-top font-mono text-xs">
            <span className="text-tech-blue mt-1 shrink-0 text-[10px]">■</span>
            <span className="text-graphite-300">{parseInlineText(line.substring(2))}</span>
          </div>
        );
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(<h4 key={`h3-${i}`} className="text-xs font-bold text-graphite-50 mt-3 mb-1 font-sans uppercase tracking-wider text-tech-blue">{parseInlineText(line.substring(4))}</h4>);
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(<h3 key={`h2-${i}`} className="text-sm font-bold text-graphite-100 mt-4 mb-2 font-sans uppercase tracking-wider text-tech-blue border-b border-graphite-800 pb-1">{parseInlineText(line.substring(3))}</h3>);
        continue;
      }

      // Plain paragraphs
      if (line) {
        elements.push(<p key={`p-${i}`} className="my-1.5 text-xs text-graphite-300 font-mono leading-relaxed">{parseInlineText(line)}</p>);
      }
    }

    // Final table flush
    flushTable(lines.length);

    return elements;
  };

  const QUICK_ACTIONS = [
    { 
      label: '📖 Summarize Lesson', 
      prompt: 'Could you summarize the core technical steps, practical Allplan recommendations, and key values of this lesson?',
      icon: BookOpen,
      color: 'hover:border-tech-blue hover:text-tech-blue'
    },
    { 
      label: '🧠 Quiz Me', 
      prompt: 'Quiz me on the active lesson content with a challenging technical question! Please provide a multiple-choice question and do not reveal the correct answer until I respond.',
      icon: GraduationCap,
      color: 'hover:border-emerald-500 hover:text-emerald-400'
    },
    { 
      label: '⌨️ Shortcuts', 
      prompt: 'Can you list the practical keyboard shortcuts in the Allplan interface that will speed up my workflow for this specific topic?',
      icon: Keyboard,
      color: 'hover:border-amber-500 hover:text-amber-400'
    }
  ];

  return (
    <>
      {/* 1. Standard Docked Card (Renders inline in Right Rail) */}
      <div className="bg-graphite-900 border border-graphite-500 rounded-[2px] overflow-hidden flex flex-col h-[400px] shadow-lg relative">
        {/* Header */}
        <div className="bg-graphite-800 px-3.5 py-2.5 border-b border-graphite-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="text-tech-blue animate-pulse" size={14} />
            <span className="tech-label text-graphite-50">AI Study Buddy</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="text-graphite-400 hover:text-white transition-colors p-1 hover:bg-graphite-700 rounded-[1px]"
              title="Open Fullscreen Sidebar"
            >
              <Maximize2 size={12} />
            </button>
            <button 
              onClick={handleResetChat}
              className="text-graphite-400 hover:text-white transition-colors p-1 hover:bg-graphite-700 rounded-[1px]"
              title="Reset Chat"
            >
              <RefreshCw size={12} />
            </button>
            <span className="size-1.5 rounded-full bg-signal-green" />
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin bg-graphite-950/40">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-2 p-2.5 rounded-[1px] leading-relaxed transition-all border ${
                msg.role === 'user' 
                  ? 'bg-tech-blue/10 border-tech-blue/30 text-graphite-200' 
                  : 'bg-graphite-950/90 border-graphite-800 text-graphite-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {msg.role === 'user' ? (
                  <User size={11} className="text-tech-blue" />
                ) : (
                  <Bot size={11} className="text-emerald-400" />
                )}
              </div>
              <div className="flex-1 overflow-hidden space-y-1">
                {renderFormattedMarkdown(msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 p-2 bg-graphite-950/50 text-graphite-500 font-mono text-[9px] border border-graphite-900">
              <Loader2 size={10} className="animate-spin text-tech-blue" />
              <span>Study Buddy is analyzing the lesson content...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Docked Inline Quick Prompts */}
        <div className="px-2 py-1.5 bg-graphite-950 border-t border-graphite-800 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(action.prompt)}
                disabled={isLoading}
                className={`px-2 py-1 bg-graphite-900 text-graphite-400 text-[8px] font-mono border border-graphite-800 rounded-[1px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${action.color}`}
              >
                <Icon size={9} />
                <span>{action.label.split(' ').slice(1).join(' ')}</span>
                <ArrowRight size={8} />
              </button>
            );
          })}
        </div>

        {/* Input area */}
        <div className="p-2 bg-graphite-950 border-t border-graphite-800 flex gap-1.5 shrink-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={isLoading}
            placeholder="Ask your assistant a technical question..."
            className="flex-1 bg-graphite-900 border border-graphite-800 px-2.5 py-1.5 text-[11px] font-mono text-graphite-100 placeholder-graphite-600 focus:outline-none focus:border-tech-blue disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="px-3 bg-tech-blue hover:bg-tech-blue/80 text-white rounded-[1px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={11} />
          </button>
        </div>
      </div>

      {/* Floating Sparkle Toggle Trigger */}
      <div className="fixed right-4 bottom-20 z-40">
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="bg-tech-blue text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-tech-blue/30 group relative"
          title="Open AI Study Buddy"
        >
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-3 bg-emerald-500"></span>
          </span>
          <Sparkles size={20} className="group-hover:rotate-12 transition-transform text-white" />
        </button>
      </div>

      {/* 2. Expanded Sidebar Drawer (Slides in on request) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Sliding Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-[460px] z-50 bg-graphite-950 border-l border-graphite-800 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="bg-graphite-900 px-5 py-4 border-b border-graphite-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-tech-blue/10 border border-tech-blue/30 rounded-[2px]">
                    <Sparkles className="text-tech-blue animate-pulse" size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-sans text-graphite-50 uppercase tracking-wider">AI Study Buddy</h3>
                    <p className="text-[9px] text-emerald-400 font-mono tracking-wider mt-0.5 uppercase">Allplan Expert System Live</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleResetChat}
                    className="text-graphite-400 hover:text-white transition-colors p-2 hover:bg-graphite-800 rounded-[1px]"
                    title="Reset Chat History"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-graphite-400 hover:text-signal-red transition-colors p-2 hover:bg-graphite-800 rounded-[1px]"
                    title="Close Sidebar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Interactive Technical Quick Actions Dashboard */}
              <div className="bg-graphite-900/60 px-5 py-3 border-b border-graphite-800 shrink-0">
                <p className="text-[9px] font-mono text-graphite-400 uppercase tracking-widest mb-2.5">Smart Module Shortcuts</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(action.prompt)}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-2.5 bg-graphite-950 hover:bg-graphite-900 border border-graphite-800 hover:border-graphite-700 rounded-[2px] text-center cursor-pointer transition-all group disabled:opacity-50"
                      >
                        <Icon className="text-tech-blue group-hover:scale-110 transition-transform mb-1.5" size={16} />
                        <span className="text-[9px] font-mono text-graphite-300 font-bold tracking-tight">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Active Lesson Badge Context Panel */}
              <div className="px-5 py-2.5 bg-graphite-950 border-b border-graphite-850 flex items-center justify-between text-[10px] font-mono shrink-0">
                <span className="text-graphite-500 uppercase">Active Context:</span>
                <span className="text-tech-blue font-bold truncate max-w-[280px]" title={lessonTitle}>{lessonTitle}</span>
              </div>

              {/* Drawer Messages list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin bg-graphite-950/20">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-3.5 p-3.5 rounded-[1px] leading-relaxed transition-all border ${
                      msg.role === 'user' 
                        ? 'bg-tech-blue/10 border-tech-blue/30 text-graphite-200 ml-4 shadow-sm shadow-tech-blue/5' 
                        : 'bg-graphite-900 border-graphite-800 text-graphite-300 mr-4 shadow-md'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {msg.role === 'user' ? (
                        <div className="size-6 rounded-full bg-tech-blue/15 flex items-center justify-center border border-tech-blue/30">
                          <User size={12} className="text-tech-blue" />
                        </div>
                      ) : (
                        <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Bot size={12} className="text-emerald-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-1.5">
                      {renderFormattedMarkdown(msg.text)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-3 p-3 bg-graphite-900 border border-graphite-800 text-graphite-400 font-mono text-xs shadow-md rounded-[1px]">
                    <Loader2 size={14} className="animate-spin text-tech-blue shrink-0" />
                    <span>AI Study Buddy is interpreting Allplan attributes...</span>
                  </div>
                )}
                <div ref={drawerChatEndRef} />
              </div>

              {/* Drawer Input Area */}
              <div className="p-4 bg-graphite-900 border-t border-graphite-800 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    disabled={isLoading}
                    placeholder="Ask a technical question about Allplan or Eurocodes..."
                    className="flex-1 bg-graphite-950 border border-graphite-800 px-3.5 py-2.5 text-xs font-mono text-graphite-100 placeholder-graphite-600 focus:outline-none focus:border-tech-blue disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !inputValue.trim()}
                    className="px-5 bg-tech-blue hover:bg-tech-blue/80 text-white rounded-[1px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2.5 px-1">
                  <span className="text-[8px] font-mono text-graphite-500 tracking-wider">GEMINI 3.5 API PROXIED SECURELY</span>
                  <span className="text-[8px] font-mono text-graphite-500 hover:text-graphite-300 cursor-pointer" onClick={() => setIsDrawerOpen(false)}>CLOSE SIDEBAR</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
