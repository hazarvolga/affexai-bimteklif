/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { demoAcademyContent } from '@/smartcheck/demoData';
import { ALLPLAN_DETAILED_LESSONS, getAllplanCoverageReport } from '@/academy/allplan/track';
import { getCompletedAllplanLessons } from '@/academy/allplan/progress';
import { useAuth } from '@/hooks/useAuth';

export function AllplanAcademy() {
  const { user } = useAuth();
  // Sadece ALLPLAN Akademisi alanına ait olanları listele (Poz/Birim dahil edilmez)
  const courses = demoAcademyContent.filter(c => c.area === 'allplan');
  const coverage = getAllplanCoverageReport();
  const completedLessons = getCompletedAllplanLessons(user?.id, user?.email);

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/app/academy" className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase tracking-widest flex items-center gap-1">
          <BookOpen size={10} /> Akademi Anasayfa
        </Link>
        <span className="text-zinc-700 font-mono text-[9px]">&gt;</span>
        <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest font-bold">ALLPLAN Akademisi</span>
      </div>

      <PageHeader
        title="ALLPLAN Akademisi"
        description="Kaynak doğrulamalı Allplan Pro Track derslerini, ofis simülatörlerini ve mühendislik notlarını tek bir öğrenme akışında ilerletin."
      />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Aktif Simülatör Kataloğu</h3>
            <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
              ALLPLAN v2024 / v2026 Destekli
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(course => (
              <Card key={course.id} className="bg-zinc-900/30 border-zinc-800 hover:border-orange-500/30 transition-all flex flex-col justify-between group">
                <div>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <Badge className="bg-zinc-950 text-zinc-400 border border-zinc-800 text-[8px] font-mono px-2 py-0.5 rounded-md">
                        {course.contentType.toUpperCase()}
                      </Badge>
                      <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                        DEMO SİMÜLATÖR
                      </Badge>
                    </div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-100 mt-2 line-clamp-2 leading-relaxed group-hover:text-orange-500 transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold mt-1">
                      SKILL: {course.skillCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {course.id === 'content-reinforcement-cover' && 'XC3 etiketli demo senaryosunda donatı paspayı parametrelerini ve donatı detaylarını simüle edin.'}
                      {course.id === 'content-wall-priority' && 'ALLPLAN 3D CAD ortamında katmanlı dış duvarların kesişim priority değerlerini görselleştirin.'}
                    </p>
                    <div className="flex items-center gap-4 text-[9px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1 uppercase tracking-wider">
                        <Clock size={11} /> {course.estimatedMinutes} Dakika
                      </span>
                      <span className="uppercase tracking-wider">
                        Seviye: {course.level}
                      </span>
                    </div>
                  </CardContent>
                </div>
                <div className="p-6 pt-0 mt-2">
                  <Link to={`/app/academy/allplan/content/${course.slug}`}>
                    <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 rounded-xl gap-2 transition-all">
                      Modülü Aç <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Allplan Pro Track · Kaynak Dersleri</h3>
              <p className="mt-1 text-[10px] text-zinc-600">{coverage.detailedLessonCount} ayrıntılı ders · {coverage.coveragePercent}% modül kapsamı · {completedLessons.length} tamamlandı</p>
            </div>
            <Badge className="w-fit border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-500">Sunucu ilerlemesi: sonraki faz</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ALLPLAN_DETAILED_LESSONS.map(lesson => {
              const completed = completedLessons.includes(lesson.slug);
              return <Card key={lesson.slug} className="flex flex-col justify-between border-zinc-800 bg-zinc-900/20 transition-all hover:border-orange-500/30">
                <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><Badge className="border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[8px] text-zinc-500">{lesson.seed}</Badge>{completed && <CheckCircle2 size={16} className="text-emerald-500" />}</div><CardTitle className="mt-2 text-xs font-black uppercase leading-relaxed tracking-widest text-zinc-100">{lesson.title}</CardTitle><CardDescription className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{lesson.subtitle}</CardDescription></CardHeader>
                <CardContent className="pt-0"><div className="mb-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-zinc-600"><span><Clock size={11} className="mr-1 inline" />{lesson.estimatedMinutes} dk</span>{lesson.interactiveTool && <span className="text-emerald-500">{lesson.interactiveTool}</span>}</div><Link to={`/app/academy/allplan/lesson/${lesson.slug}`}><Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-zinc-800 bg-zinc-950 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:bg-orange-600 hover:text-white">Dersi aç <ChevronRight size={14} /></Button></Link></CardContent>
              </Card>;
            })}
          </div>
        </div>

        {/* Extra Educational Resources */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Sertifika ve Yetkinlik Sınavları</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans max-w-xl">
              Tüm interaktif ALLPLAN modüllerini başarıyla tamamladıktan sonra yetkinlik sınavına girerek resmi olmayan demo katılım sertifikası alabilirsiniz.
            </p>
          </div>
          <Button disabled className="bg-zinc-900 border border-zinc-800 text-zinc-600 text-[9px] font-black uppercase tracking-widest h-9 rounded-xl px-5">
            Yetkinlik Sınavı (Kilitli)
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
