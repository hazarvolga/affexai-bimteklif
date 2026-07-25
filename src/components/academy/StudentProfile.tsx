import React, { useState } from 'react';
import { TechnicalPanel, TechnicalBadge, TechnicalProgressBar, TechnicalButton } from './TechnicalUI';
import { 
  User, Mail, Shield, Calendar, Award, Clock, Edit2, CheckCircle, 
  BookOpen, Bookmark, FileText, Trophy, RefreshCw, AlertTriangle, 
  Download, Share2, Clipboard, Loader2, Check, Activity, TrendingUp, Target
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TraineeUser, ExamAttemptData, NoteData, BookmarkData } from '../lib/firebase';
import { COURSE_TREE } from '../../constants/allplanConstants';
import { generateCertificateImage } from '../../utils/CertificateGenerator';

interface StudentProfileProps {
  trainee: TraineeUser | null;
  onUpdateTrainee: (fields: Partial<TraineeUser>) => Promise<void>;
  completedLessons: string[];
  examAttempts: ExamAttemptData[];
  bookmarks: BookmarkData[];
  notes: NoteData[];
  lessonTimes: Record<string, number>;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  trainee,
  onUpdateTrainee,
  completedLessons,
  examAttempts,
  bookmarks,
  notes,
  lessonTimes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(trainee?.name || 'Mehmet Soydan');
  const [editedRole, setEditedRole] = useState(trainee?.role || 'BIM Specialist');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hardcoded or fetched registration timestamp
  const registrationDate = "Oct 24, 2025";

  // Calculate dynamic metrics
  const totalLessonsCount = COURSE_TREE.flatMap(p => p.children || []).flatMap(c => c.children || []).length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  // Best exam details
  const bestExamAttempt = examAttempts.reduce((best, current) => {
    if (!best) return current;
    return current.percentage > best.percentage ? current : best;
  }, null as ExamAttemptData | null);

  const highestScore = bestExamAttempt ? bestExamAttempt.percentage : (trainee?.highestExamScore ?? null);
  const hasPassedExam = highestScore !== null ? highestScore >= 60 : false;
  const hasCompletedCourse = progressPercent >= 100;
  const isEligibleForCert = hasPassedExam || hasCompletedCourse;

  // Calculate total study time
  const totalSeconds = (Object.values(lessonTimes) as number[]).reduce((sum: number, val: number) => sum + val, 0);
  const formatTotalTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    if (m > 0) {
      return `${m}m`;
    }
    return `${sec}s`;
  };

  // Dynamic study analytics (GAP 1)
  const getPathStudyTimes = () => {
    return COURSE_TREE.map(path => {
      let pathSeconds = 0;
      let totalLessonsInPath = 0;
      let completedLessonsInPath = 0;
      path.children?.forEach(course => {
        course.children?.forEach(lesson => {
          totalLessonsInPath++;
          if (completedLessons.includes(lesson.title)) {
            completedLessonsInPath++;
          }
          if (lessonTimes[lesson.title]) {
            pathSeconds += lessonTimes[lesson.title];
          }
        });
      });
      return {
        id: path.id,
        title: path.title,
        seconds: pathSeconds,
        formatted: formatTotalTime(pathSeconds),
        totalLessonsInPath,
        completedLessonsInPath,
        percent: totalLessonsInPath > 0 ? Math.round((completedLessonsInPath / totalLessonsInPath) * 100) : 0
      };
    });
  };

  const pathStudyTimes = getPathStudyTimes();

  // Weekly study goal calculation (weekly target: 3 hours = 10800s)
  const weeklyTargetSeconds = 10800;
  const weeklyProgressPercent = Math.min(100, Math.round((totalSeconds / weeklyTargetSeconds) * 100));

  // Study pace & estimation: average active time per completed lesson
  const avgSecondsPerLesson = completedCount > 0 ? totalSeconds / completedCount : 300; // assume 5m default
  const remainingLessons = totalLessonsCount - completedCount;
  const estimatedSecondsToFinish = remainingLessons * avgSecondsPerLesson;
  const estimatedHoursToFinish = Math.ceil(estimatedSecondsToFinish / 3600);

  // Generate certificate hash
  const studentName = trainee?.name || 'Mehmet Soydan';
  const certId = `ALLPLAN-CERT-2026-PROF`;
  const verificationHash = isEligibleForCert 
    ? `ALL-${hasPassedExam ? 'EXM' : 'CRS'}-${studentName.replace(/\s+/g, '').substring(0, 4).toUpperCase()}-${progressPercent}PX`
    : 'PENDING';

  // Handle updates to profile info
  const handleSaveProfile = async () => {
    if (!editedName.trim() || !editedRole.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateTrainee({
        name: editedName.trim(),
        role: editedRole.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle download certificate
  const handleDownloadCert = async () => {
    if (isGenerating || !isEligibleForCert) return;
    setIsGenerating(true);
    try {
      await generateCertificateImage({
        studentName,
        courseTitle: 'Allplan Certified BIM Specialist II',
        certId,
        verificationHash,
      });
    } catch (err) {
      console.error(err);
      alert('Could not render certificate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle share / copy verification hash
  const handleCopyHash = () => {
    if (!isEligibleForCert) return;
    navigator.clipboard.writeText(`Verifiable Allplan Credential ID: ${certId} | Hash: ${verificationHash}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="student-profile-root" className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div id="profile-header-panel" className="flex items-center justify-between border-b border-graphite-700 pb-4">
        <div className="space-y-1">
          <h1 id="profile-title" className="text-3xl font-extrabold uppercase tracking-tight flex items-center gap-3">
            <User className="text-tech-blue" size={28} />
            Student Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your credentials, track course completions, and download verified BIM certificates.
          </p>
        </div>
      </div>

      <div id="profile-main-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Row 1, Left Column: Registration details */}
        <div id="profile-left-col" className="lg:col-span-4 space-y-6">
          <TechnicalPanel id="registration-details-panel" title="REGISTRATION DOSSIER" accentColor="#3b82f6">
            <div className="space-y-5 font-mono text-xs">
              <div className="flex justify-center pb-4 border-b border-graphite-850">
                <div className="relative group">
                  <div className="size-20 bg-graphite-950 border border-graphite-500 rounded-full flex items-center justify-center text-tech-blue">
                    <User size={36} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-tech-blue text-white p-1 rounded-full border border-graphite-900">
                    <Shield size={10} />
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-graphite-500 uppercase">STUDENT NAME</label>
                    <input 
                      type="text" 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full bg-graphite-950 border border-graphite-500 px-3 py-1.5 text-xs text-white rounded-[2px] focus:outline-none focus:border-tech-blue font-sans"
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-graphite-500 uppercase">PROFESSIONAL ROLE</label>
                    <input 
                      type="text" 
                      value={editedRole} 
                      onChange={(e) => setEditedRole(e.target.value)}
                      className="w-full bg-graphite-950 border border-graphite-500 px-3 py-1.5 text-xs text-white rounded-[2px] focus:outline-none focus:border-tech-blue font-sans"
                      maxLength={30}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <TechnicalButton 
                      id="btn-save-profile" 
                      size="sm" 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      icon={isSaving ? Loader2 : Check}
                    >
                      {isSaving ? 'SAVING...' : 'SAVE'}
                    </TechnicalButton>
                    <TechnicalButton 
                      id="btn-cancel-profile" 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        setEditedName(trainee?.name || 'Mehmet Soydan');
                        setEditedRole(trainee?.role || 'BIM Specialist');
                        setIsEditing(false);
                      }}
                    >
                      CANCEL
                    </TechnicalButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-graphite-500 uppercase block">STUDENT NAME</span>
                    <div className="text-sm font-bold text-white tracking-wide">{trainee?.name || 'Mehmet Soydan'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-graphite-500 uppercase block">PROFESSIONAL ROLE</span>
                    <div className="text-xs text-graphite-250 font-medium flex items-center gap-1.5">
                      <Trophy size={12} className="text-signal-orange" />
                      {trainee?.role || 'BIM Specialist'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-graphite-500 uppercase block">EMAIL ADDRESS</span>
                    <div className="text-xs text-graphite-300 font-bold flex items-center gap-1.5">
                      <Mail size={12} className="text-graphite-500" />
                      {trainee?.email || 'droneracingturkey@gmail.com'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-graphite-500 uppercase block">REGISTRATION MILESTONE</span>
                    <div className="text-xs text-graphite-400 flex items-center gap-1.5">
                      <Calendar size={12} className="text-graphite-500" />
                      {registrationDate}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-graphite-500 uppercase block">SYSTEM STATUS</span>
                    <div className="pt-0.5">
                      <TechnicalBadge status={trainee?.status === 'active' || !trainee ? 'completed' : 'locked'} label={trainee?.status === 'active' || !trainee ? 'ACTIVE MEMBERSHIP' : 'INACTIVE'} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-graphite-850">
                    <TechnicalButton 
                      id="btn-edit-profile" 
                      variant="secondary" 
                      size="sm" 
                      className="w-full" 
                      icon={Edit2}
                      onClick={() => setIsEditing(true)}
                    >
                      EDIT PROFILE DOSSIER
                    </TechnicalButton>
                  </div>
                </div>
              )}
            </div>
          </TechnicalPanel>
        </div>

        {/* Row 1, Right Column: Progress Summary */}
        <div id="profile-right-col-summary" className="lg:col-span-8 space-y-6">
          <TechnicalPanel id="progress-summary-panel" title="ACADEMIC PROGRESS REPORT" accentColor="#10b981">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-graphite-950 p-3 border border-graphite-850 rounded-[1px] space-y-1">
                <span className="text-graphite-500 block text-[8px] uppercase tracking-wider flex items-center gap-1">
                  <BookOpen size={10} className="text-tech-blue" /> SYLLABUS COMPLETED
                </span>
                <span className="text-lg font-black text-white">{completedCount} / {totalLessonsCount}</span>
                <div className="text-[9px] text-graphite-400 font-bold">{progressPercent}% rate</div>
              </div>

              <div className="bg-graphite-950 p-3 border border-graphite-850 rounded-[1px] space-y-1">
                <span className="text-graphite-500 block text-[8px] uppercase tracking-wider flex items-center gap-1">
                  <Clock size={10} className="text-emerald-400" /> TOTAL STUDY TIME
                </span>
                <span className="text-lg font-black text-emerald-400">{formatTotalTime(totalSeconds)}</span>
                <div className="text-[9px] text-graphite-400 font-bold">Time-on-page tracking</div>
              </div>

              <div className="bg-graphite-950 p-3 border border-graphite-850 rounded-[1px] space-y-1">
                <span className="text-graphite-500 block text-[8px] uppercase tracking-wider flex items-center gap-1">
                  <Trophy size={10} className="text-signal-orange" /> HIGHEST EXAM SCORE
                </span>
                <span className="text-lg font-black text-signal-orange">
                  {highestScore !== null ? `${highestScore}%` : 'N/A'}
                </span>
                <div className="text-[9px] text-graphite-400 font-bold">{hasPassedExam ? 'PASSED (>=60%)' : 'AWAITING EVAL'}</div>
              </div>

              <div className="bg-graphite-950 p-3 border border-graphite-850 rounded-[1px] space-y-1">
                <span className="text-graphite-500 block text-[8px] uppercase tracking-wider flex items-center gap-1 flex-wrap">
                  <Bookmark size={10} className="text-purple-400 inline" /> BOOKMARKS / NOTES
                </span>
                <span className="text-lg font-black text-purple-400">{bookmarks.length} / {notes.length}</span>
                <div className="text-[9px] text-graphite-400 font-bold">Saved snippets & topics</div>
              </div>
            </div>

            <div className="mt-6 space-y-2 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-graphite-300 uppercase tracking-wide">Overall Completion Rate</span>
                <span className="text-tech-blue font-bold text-xs">{progressPercent}%</span>
              </div>
              <TechnicalProgressBar progress={progressPercent} status={progressPercent >= 100 ? 'complete' : 'default'} height={6} />
              <p className="text-[10px] text-graphite-400 leading-relaxed pt-1 border-b border-graphite-850 pb-4 mb-4">
                This diagnostic metric compiles your overall leaf modules completed across the entire curriculum. Master remaining lessons to unlock your comprehensive qualification certificate.
              </p>

              {/* DETAILED STUDY ANALYTICS (GAP 1) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-1.5 text-tech-blue">
                  <Activity size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Dynamic Study Analytics & Pace Tracker</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekly Goal Progress & Completion Estimate */}
                  <div className="bg-graphite-950 p-3.5 border border-graphite-850 rounded-[1px] space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-graphite-400">
                        <span className="flex items-center gap-1"><Target size={11} className="text-signal-orange" /> WEEKLY STUDY GOAL (3 hrs)</span>
                        <span className="font-bold text-white">{weeklyProgressPercent}%</span>
                      </div>
                      <TechnicalProgressBar progress={weeklyProgressPercent} status={weeklyProgressPercent >= 100 ? 'complete' : 'warning'} height={4} />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-graphite-900">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-graphite-500 uppercase">Estimated Pace:</span>
                        <span className="text-graphite-200 font-bold font-mono">
                          {completedCount > 0 ? `${Math.round(avgSecondsPerLesson / 60)} min / lesson` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-graphite-500 uppercase">Est. Hours to Graduate:</span>
                        <span className="text-signal-orange font-bold font-mono">
                          {completedCount === totalLessonsCount ? '0 hrs' : `~${estimatedHoursToFinish} hrs`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Domain-based Study Time Breakdown */}
                  <div className="bg-graphite-950 p-3.5 border border-graphite-850 rounded-[1px] space-y-2.5 flex flex-col justify-between">
                    <div className="text-[9px] text-graphite-400 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={11} className="text-emerald-400" /> STUDY DENSITY BY BIM DOMAIN
                    </div>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto scrollbar-none">
                      {pathStudyTimes.map(domain => (
                        <div key={domain.id} className="space-y-0.5 text-[9px]">
                          <div className="flex justify-between text-graphite-300">
                            <span className="truncate max-w-[150px] font-bold uppercase">{domain.title}</span>
                            <span className="text-graphite-400">{domain.formatted || '0s'} ({domain.percent}%)</span>
                          </div>
                          <div className="w-full h-1 bg-graphite-900 rounded-[1px]">
                            <div className="h-full bg-tech-blue rounded-[1px]" style={{ width: `${domain.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recharts Graphical Visualization Chart */}
                <div className="bg-graphite-950 p-4 border border-graphite-850 rounded-[1px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-tech-blue">BIM Domain Study Time (Minutes)</span>
                    <span className="text-[8px] font-mono text-graphite-500 uppercase">REAL-TIME TELEMETRY</span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={pathStudyTimes.map(domain => ({
                          name: domain.title.replace("Learning Path:", "").trim(),
                          Dakika: Math.round(domain.seconds / 60)
                        }))}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <XAxis 
                          dataKey="name" 
                          stroke="#4b5563" 
                          fontSize={8} 
                          fontFamily="monospace" 
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#4b5563" 
                          fontSize={8} 
                          fontFamily="monospace" 
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                          contentStyle={{ 
                            backgroundColor: '#0c0f17', 
                            borderColor: '#1e293b',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            color: '#e2e8f0',
                            borderRadius: '2px'
                          }}
                        />
                        <Bar dataKey="Dakika" fill="#2563eb" radius={[2, 2, 0, 0]}>
                          {pathStudyTimes.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index % 2 === 0 ? '#2563eb' : '#3b82f6'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </TechnicalPanel>
        </div>

        {/* Row 2: Enrolled Learning Paths */}
        <div id="profile-paths-section" className="lg:col-span-12">
          <TechnicalPanel id="enrolled-learning-paths-panel" title="ENROLLED LEARNING PATHS AND SYLLABUS SYNC" accentColor="#f59e0b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COURSE_TREE.map((path) => {
                // Compute path-specific statistics
                const modulesForPath = path.children?.flatMap(c => c.children || []) || [];
                const completedForPath = modulesForPath.filter(m => completedLessons.includes(m.title)).length;
                const pathProgress = modulesForPath.length > 0 ? Math.round((completedForPath / modulesForPath.length) * 100) : 0;
                const isPathDone = pathProgress >= 100;

                return (
                  <div key={path.id} className="p-4 bg-graphite-900 border border-graphite-700 space-y-3 font-mono">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white uppercase tracking-wide">{path.title}</h4>
                        <span className="text-[9px] text-graphite-500 uppercase font-bold tracking-wider block">
                          Total Lessons: {path.lessonsCount || `${modulesForPath.length} Modules`}
                        </span>
                      </div>
                      <TechnicalBadge 
                        status={isPathDone ? 'completed' : 'in-progress'} 
                        label={isPathDone ? 'PATH COMPLETE' : `${pathProgress}% DONE`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-graphite-500">PATH SYNCED RATIO:</span>
                        <span className="text-graphite-300 font-bold">{completedForPath} / {modulesForPath.length} MODULES</span>
                      </div>
                      <TechnicalProgressBar progress={pathProgress} status={isPathDone ? 'complete' : 'warning'} height={4} />
                    </div>

                    <div className="pt-2 border-t border-graphite-850 text-[10px] text-graphite-400 flex items-center justify-between">
                      <span>Course children synced: {path.children?.length || 0} tracks</span>
                      <span className="text-[9px] text-slate-500 uppercase">{isPathDone ? 'GRADUATED' : 'ACTIVE INTAKE'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TechnicalPanel>
        </div>

        {/* Row 3: Issued Digital Certificates */}
        <div id="profile-certificates-section" className="lg:col-span-12">
          <TechnicalPanel id="issued-certificates-panel" title="VERIFIABLE DIGITAL CREDENTIALS" accentColor={isEligibleForCert ? '#10b981' : '#ef4444'}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-4 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <Award className={isEligibleForCert ? 'text-signal-green size-8' : 'text-graphite-500 size-8'} />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Allplan Professional BIM Specialist II</h4>
                    <p className="text-[10px] text-graphite-400 mt-0.5">Formal verifiable credential issued by BIM Plan Academy System.</p>
                  </div>
                </div>

                <div className="p-4 bg-graphite-950 border border-graphite-850 space-y-3 rounded-[1px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-graphite-500 uppercase block">CREDENTIAL SERIAL</span>
                      <span className="text-[11px] font-bold text-graphite-250 select-all">{certId}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-graphite-500 uppercase block">SECURITY VERIFICATION HASH</span>
                      <span className={`text-[11px] font-bold select-all ${isEligibleForCert ? 'text-emerald-400' : 'text-graphite-500'}`}>
                        {verificationHash}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-graphite-900 flex justify-between items-center text-[10px]">
                    <span className="text-graphite-500 uppercase">STATUS INDICATOR:</span>
                    {isEligibleForCert ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle size={12} /> ISSUED & VERIFIED
                      </span>
                    ) : (
                      <span className="text-signal-orange font-bold flex items-center gap-1.5">
                        <Lock size={12} /> AWAITING REQUIREMENTS
                      </span>
                    )}
                  </div>
                </div>

                {!isEligibleForCert && (
                  <div className="p-3 bg-signal-red/5 border border-signal-red/20 text-[10px] text-graphite-400 leading-relaxed flex gap-2">
                    <AlertTriangle className="text-signal-red shrink-0 size-4 mt-0.5" />
                    <div>
                      <p className="font-bold text-signal-red uppercase">Requirements Unfulfilled</p>
                      <p className="mt-0.5 text-[9px]">
                        To unlock this certificate, you must satisfy at least one of the conditions: Pass the final certification exam (score &gt;= 60%) OR complete 100% of all syllabus lessons.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Actions Column */}
              <div className="md:col-span-4 flex flex-col gap-2.5">
                <TechnicalButton 
                  id="btn-download-cert" 
                  className="w-full py-3" 
                  disabled={!isEligibleForCert || isGenerating}
                  onClick={handleDownloadCert}
                  icon={isGenerating ? Loader2 : Download}
                >
                  {isGenerating ? 'RENDERING HIGH-RES...' : 'DOWNLOAD DIPLOMA IMAGE'}
                </TechnicalButton>

                <TechnicalButton 
                  id="btn-copy-hash" 
                  variant="secondary" 
                  className="w-full py-2.5" 
                  disabled={!isEligibleForCert}
                  onClick={handleCopyHash}
                  icon={copied ? Check : Clipboard}
                >
                  {copied ? 'COPIED TO CLIPBOARD!' : 'COPY VERIFICATION TEXT'}
                </TechnicalButton>

                {isEligibleForCert && (
                  <div className="text-center text-[9px] text-graphite-500 font-mono italic">
                    * Standard printable PDF ready. Ready to share on LinkedIn.
                  </div>
                )}
              </div>
            </div>
          </TechnicalPanel>
        </div>
      </div>
    </div>
  );
};
