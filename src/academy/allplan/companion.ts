import type { AllplanLesson } from './types';

export interface CompanionCitation {
  lessonSlug: string;
  lessonTitle: string;
  section: string;
  excerpt: string;
  score: number;
}

export interface CompanionAnswer {
  answer: string;
  citations: CompanionCitation[];
  grounded: boolean;
}

const stopWords = new Set(['a', 'an', 'and', 'are', 'bir', 'bu', 'da', 'de', 'for', 'ile', 'in', 'is', 'mi', 'mı', 'mu', 'mü', 'nasıl', 'ne', 'of', 'the', 'to', 've']);

const tokens = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('tr-TR')
  .replace(/[^a-z0-9çğıöşü]+/gi, ' ')
  .split(/\s+/)
  .filter(token => token.length > 1 && !stopWords.has(token));

const excerpt = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 360);

export function answerFromAllplanLessons(question: string, lessons: readonly AllplanLesson[]): CompanionAnswer {
  const queryTokens = [...new Set(tokens(question))];
  if (queryTokens.length === 0) return { answer: 'Sorunuz doğrulanmış ders içeriğinde eşleştirilemedi. Daha teknik ve belirgin terimler kullanın.', citations: [], grounded: false };

  const candidates = lessons.flatMap(lesson => {
    const sections = [
      { section: 'Ders özeti', text: `${lesson.title}. ${lesson.subtitle}. ${lesson.introduction}`, boost: 3 },
      ...lesson.steps.map(step => ({ section: `Adım ${step.step}: ${step.title}`, text: `${step.title}. ${step.desc}`, boost: 2 })),
      { section: 'Mühendislik notu', text: lesson.recommendation, boost: 1 },
    ];
    return sections.map(section => {
      const sectionTokens = new Set(tokens(section.text));
      const matches = queryTokens.filter(token => sectionTokens.has(token)).length;
      return {
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        section: section.section,
        excerpt: excerpt(section.text),
        score: matches * section.boost,
      };
    });
  }).filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.lessonSlug.localeCompare(right.lessonSlug));

  const citations: CompanionCitation[] = [];
  const seenLessons = new Set<string>();
  for (const candidate of candidates) {
    if (seenLessons.has(candidate.lessonSlug)) continue;
    citations.push(candidate);
    seenLessons.add(candidate.lessonSlug);
    if (citations.length === 3) break;
  }

  if (citations.length === 0) return { answer: 'Bu soru için doğrulanmış 27 ders içinde yeterli kaynak bulunamadı. Companion kaynak dışı cevap üretmez.', citations: [], grounded: false };
  return {
    answer: citations[0].excerpt,
    citations,
    grounded: true,
  };
}
