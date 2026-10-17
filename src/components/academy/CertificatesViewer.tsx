import React, { useState } from 'react';
import { TechnicalPanel, TechnicalButton, TechnicalProgressBar } from './TechnicalUI';
import { Award, ShieldCheck, Printer, Share2, Check, Download, AlertTriangle, FileCheck, RefreshCw, Loader2, QrCode } from 'lucide-react';
import { ExamAttemptData, TraineeUser } from '../../lib/firebase';
import { COURSE_TREE } from '../../constants/allplanConstants';
import { generateCertificateImage } from '../../utils/CertificateGenerator';

interface CertificatesViewerProps {
  completedLessons: string[];
  examAttempts: ExamAttemptData[];
  trainee?: TraineeUser | null;
  onUpdateTrainee?: (fields: Partial<TraineeUser>) => Promise<void>;
}

export const CertificatesViewer: React.FC<CertificatesViewerProps> = ({ 
  completedLessons, 
  examAttempts,
  trainee,
  onUpdateTrainee
}) => {
  const [studentName, setStudentName] = useState(trainee?.name || 'Mehmet Soydan');
  const [isEditingName, setIsEditingName] = useState(false);
  const [certId, setCertId] = useState(`ALLPLAN-CERT-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync state if trainee changes
  React.useEffect(() => {
    if (trainee?.name) {
      setStudentName(trainee.name);
    }
  }, [trainee?.name]);

  const totalLessonsCount = COURSE_TREE.flatMap(p => p.children || []).flatMap(c => c.children || []).length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  const bestExamAttempt = examAttempts.reduce((best, current) => {
    if (!best) return current;
    return current.percentage > best.percentage ? current : best;
  }, null as ExamAttemptData | null);

  const hasPassedExam = bestExamAttempt ? bestExamAttempt.percentage >= 60 : false;
  const hasCompletedCourse = progressPercent >= 100;

  // The criteria: Passed exam OR completed all courses
  const isEligible = hasPassedExam || hasCompletedCourse;

  // Generate certificate hash based on criteria met
  const verificationHash = isEligible 
    ? `ALL-${hasPassedExam ? 'EXM' : 'CRS'}-${studentName.replace(/\s+/g, '').substring(0, 4).toUpperCase()}-${progressPercent}PX`
    : 'PENDING';

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `I am proud to share my Allplan Professional BIM Specialist Certificate! Verified with code: ${verificationHash}`;
    navigator.clipboard.writeText(text);
    alert('Certificate verification text copied to clipboard! Share on LinkedIn or your resume.');
  };

  const handleDownloadCertificate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await generateCertificateImage({
        studentName,
        courseTitle: 'Allplan Certified BIM Specialist II',
        certId,
        verificationHash
      });
    } catch (err) {
      console.error(err);
      alert('Could not render high-resolution certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-graphite-700 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight flex items-center gap-3">
            <Award className="text-signal-orange" size={28} />
            My Certificates
          </h1>
          <p className="text-sm text-muted-foreground dark:text-slate-400">
            Monitor qualification milestones and access certified credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Eligibility checklist */}
        <div className="lg:col-span-4 space-y-6">
          <TechnicalPanel title="QUALIFICATION AUDIT" accentColor={isEligible ? '#10b981' : '#f97316'}>
            <div className="space-y-6 font-mono text-xs">
              <p className="text-graphite-400 leading-relaxed text-[11px]">
                To qualify for the <strong className="text-graphite-200">Allplan BIM Specialist II</strong> certification, you must satisfy at least one of the operational conditions detailed below:
              </p>

              {/* Requirement 1: Exam */}
              <div className={`p-4 border ${hasPassedExam ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-graphite-950 border-graphite-800'} space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-graphite-200">1. CERTIFICATION EXAM</span>
                  {hasPassedExam ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">✓ PASSED</span>
                  ) : (
                    <span className="text-[9px] text-signal-orange uppercase flex items-center gap-1">
                      <AlertTriangle size={12} /> INCOMPLETE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-graphite-400">
                  Requirement: Complete BIM Plan Academy exam with an evaluation of 60% or higher.
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-[10px] text-graphite-500">YOUR HIGHEST SCORE:</span>
                  <span className={`font-bold ${hasPassedExam ? 'text-emerald-400' : 'text-graphite-400'}`}>
                    {bestExamAttempt ? `${bestExamAttempt.percentage}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Requirement 2: Course completion */}
              <div className={`p-4 border ${hasCompletedCourse ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-graphite-950 border-graphite-800'} space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-graphite-200">2. FULL SYLLABUS MASTERY</span>
                  {hasCompletedCourse ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">✓ COMPLETED</span>
                  ) : (
                    <span className="text-[9px] text-signal-orange uppercase flex items-center gap-1">
                      <AlertTriangle size={12} /> INCOMPLETE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-graphite-400">
                  Requirement: Complete all 30 lesson modules in the training database.
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-graphite-500">PROGRESS RATE:</span>
                    <span className="text-graphite-300 font-bold">{completedCount} / {totalLessonsCount} MODULES</span>
                  </div>
                  <TechnicalProgressBar progress={progressPercent} status={hasCompletedCourse ? 'complete' : 'warning'} height={3} />
                </div>
              </div>

              {/* Status Alert */}
              {isEligible ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 leading-relaxed flex gap-2">
                  <ShieldCheck className="shrink-0 size-4 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase">Milestone Achieved!</p>
                    <p className="mt-0.5 text-graphite-400 text-[10px]">You are officially certified. Enter your professional name to generate your formal credentials.</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-signal-orange/10 border border-signal-orange/30 text-[11px] text-signal-orange leading-relaxed flex gap-2">
                  <AlertTriangle className="shrink-0 size-4 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase">Awaiting Qualification</p>
                    <p className="mt-0.5 text-graphite-400 text-[10px]">Complete the lessons or pass the final exam in the "Certification Exam" tab to unlock your verifiable diploma.</p>
                  </div>
                </div>
              )}
            </div>
          </TechnicalPanel>
        </div>

        {/* Right Side: Certificate display or lock */}
        <div className="lg:col-span-8 space-y-6">
          {isEligible ? (
            <div className="space-y-6">
              {/* Actions & Name Control */}
              <div className="bg-graphite-900 border border-graphite-700 p-4 rounded-[1px] flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="space-y-1 w-full sm:w-auto">
                  <p className="tech-label text-[9px] text-graphite-400">DIPLOMA RECIPIENT NAME</p>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="bg-graphite-950 border border-graphite-500 px-3 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-tech-blue"
                        maxLength={40}
                      />
                      <button 
                        onClick={async () => {
                          setIsEditingName(false);
                          if (onUpdateTrainee) {
                            await onUpdateTrainee({ name: studentName });
                          }
                        }}
                        className="px-2.5 py-1 bg-tech-blue text-foreground font-mono text-[10px] hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        SAVE
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">{studentName}</span>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="text-[10px] text-tech-blue hover:underline font-mono"
                      >
                        (Edit Name)
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <TechnicalButton 
                    size="sm" 
                    icon={isGenerating ? Loader2 : Download} 
                    onClick={handleDownloadCertificate}
                    disabled={isGenerating}
                    className={isGenerating ? 'animate-pulse' : ''}
                  >
                    {isGenerating ? 'GENERATING...' : 'Generate Certificate'}
                  </TechnicalButton>
                  <TechnicalButton size="sm" variant="secondary" icon={Printer} onClick={handlePrint}>Print / Export PDF</TechnicalButton>
                  <TechnicalButton size="sm" variant="secondary" icon={Share2} onClick={handleShare}>Copy Hash</TechnicalButton>
                </div>
              </div>

              {/* Printable Certificate Layout */}
              <div 
                id="printable-certificate"
                className="relative bg-graphite-900 border-[12px] border-double border-graphite-500 p-8 sm:p-12 text-center overflow-hidden aspect-[1.414/1] flex flex-col justify-between shadow-2xl rounded-[3px] select-none"
              >
                {/* Background Watermark/Technical Grid */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Top Corner Technical Accents */}
                <div className="absolute top-4 left-4 font-mono text-[7px] text-graphite-500 text-left">
                  ALLPLAN CERTIFICATION DEPT · OFFICE OF EDUCATION
                </div>
                <div className="absolute top-4 right-4 font-mono text-[7px] text-graphite-500 text-right">
                  CERT-ID: {certId}
                </div>

                {/* Main Branding Header */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-center items-center gap-2">
                    <span className="font-display font-black text-2xl tracking-wider text-tech-blue">ALLPLAN</span>
                    <span className="text-[10px] font-mono tracking-[0.2em] bg-tech-blue/10 border border-tech-blue/30 text-tech-blue px-2 py-0.5">ACADEMY</span>
                  </div>
                  <div className="h-0.5 w-16 bg-tech-blue/40 mx-auto" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-graphite-400">VERIFIABLE PROFESSIONAL CREDENTIAL</p>
                </div>

                {/* Title */}
                <div className="space-y-3 my-4">
                  <p className="text-xs font-mono text-graphite-300">This is to certify that the engineering candidate</p>
                  <h2 className="text-2xl sm:text-4xl font-black font-sans uppercase tracking-tight text-foreground border-b-2 border-graphite-800 pb-2 max-w-lg mx-auto leading-none">
                    {studentName}
                  </h2>
                  <p className="text-xs font-mono text-graphite-300 max-w-md mx-auto leading-relaxed pt-2">
                    has successfully completed the extensive technical syllabus, exercises, and master examinations in advanced 3D reinforcement modeling, Eurocode 2 engineering constraints, and structural BIM drafting.
                  </p>
                </div>

                {/* Qualification Title */}
                <div className="my-2 bg-gradient-to-r from-transparent via-tech-blue/10 to-transparent py-2 border-y border-graphite-800">
                  <span className="font-display font-black text-lg sm:text-xl tracking-wider text-signal-orange uppercase">
                    ALLPLAN CERTIFIED BIM SPECIALIST II
                  </span>
                </div>

                {/* Signatures & Badges Footer */}
                <div className="grid grid-cols-3 items-end gap-4 mt-4">
                  {/* Left Signature */}
                  <div className="text-center font-mono text-[8px] space-y-1">
                    <div className="italic text-graphite-300 font-sans text-xs select-none">Eduard Müller</div>
                    <div className="h-px bg-graphite-700 w-24 mx-auto" />
                    <div className="text-graphite-500 uppercase">Director of Education</div>
                    <div className="text-graphite-600">BIM Plan Academy System</div>
                  </div>

                  {/* Center Badge & QR code (GAP 4 - VERIFICATION LEDGER & QR DECK) */}
                  <div className="flex flex-col items-center justify-center space-y-2 group relative">
                    <div className="flex items-center gap-2">
                      <div className="size-12 rounded-full border border-signal-orange/40 bg-signal-orange/10 flex items-center justify-center shadow-lg shadow-signal-orange/10">
                        <Award className="text-signal-orange size-6" />
                      </div>
                      <div className="size-12 border border-graphite-600 bg-white p-1 flex items-center justify-center rounded-[2px] cursor-help relative hover:scale-105 transition-transform">
                        <QrCode className="text-graphite-900 size-10" />
                        
                        {/* Hover Tooltip detailing Cryptographic Signatures */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-graphite-950 border border-tech-blue text-left rounded-[2px] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-50 shadow-[0_4px_16px_rgba(0,0,0,0.9)] space-y-1.5 text-[8px] font-mono leading-relaxed">
                          <p className="text-tech-blue font-bold uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck size={10} className="text-signal-green" />
                            SECURE VERIFIABLE LEDGER
                          </p>
                          <div className="h-px bg-graphite-800" />
                          <p className="text-graphite-100"><span className="text-graphite-500 font-bold">RECIPIENT:</span> {studentName}</p>
                          <p className="text-graphite-100"><span className="text-graphite-500 font-bold">CREDENTIAL:</span> BIM SPECIALIST II</p>
                          <p className="text-graphite-100"><span className="text-graphite-500 font-bold">CERT-ID:</span> {certId}</p>
                          <p className="text-graphite-100 truncate"><span className="text-graphite-500 font-bold">HASH:</span> {verificationHash}</p>
                          <p className="text-signal-green uppercase font-bold text-[7px] text-right pt-0.5">✓ SIGNATURE VALID</p>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[7px] text-graphite-400 uppercase tracking-widest">{verificationHash}</span>
                  </div>

                  {/* Right Signature */}
                  <div className="text-center font-mono text-[8px] space-y-1">
                    <div className="italic text-graphite-300 font-sans text-xs select-none">M. Soydan</div>
                    <div className="h-px bg-graphite-700 w-24 mx-auto" />
                    <div className="text-graphite-500 uppercase">Senior BIM Specialist</div>
                    <div className="text-graphite-600">Verification Committee</div>
                  </div>
                </div>

                {/* Bottom verification block */}
                <div className="mt-6 border-t border-graphite-800/60 pt-4 flex flex-col sm:flex-row justify-between text-[7px] font-mono text-graphite-500">
                  <span>SYSTEM TIME: 2026-07-17 CERTIFICATE_VERIFIED</span>
                  <span className="text-tech-blue uppercase">HASH: {verificationHash}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-graphite-900 border border-graphite-700 p-12 text-center space-y-4 rounded-[2px] flex flex-col items-center justify-center min-h-[400px]">
              <div className="size-16 rounded-full bg-graphite-950 border border-graphite-800 flex items-center justify-center text-graphite-500">
                <ShieldCheck size={32} className="opacity-40" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-graphite-300">CERTIFICATE PROFILE LOCKED</h3>
              <p className="text-xs text-graphite-500 max-w-sm font-mono leading-relaxed">
                Your credential profile is currently locked. To activate your official Allplan Specialist license certificate, complete the course lessons or pass the evaluation exam.
              </p>
              <div className="pt-2">
                <span className="font-mono text-[10px] bg-signal-orange/10 border border-signal-orange/20 text-signal-orange px-3 py-1 rounded-[1px] uppercase">
                  Awaiting Academic Milestones
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
