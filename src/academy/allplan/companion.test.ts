import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { answerFromAllplanLessons } from './companion';
import type { AllplanLesson } from './types';

const lessons: AllplanLesson[] = [{
  sourceId: 'lesson-1', slug: 'ifc-basics', title: 'IFC Basics', subtitle: 'OpenBIM exchange',
  introduction: 'IFC property mapping preserves model metadata during exchange.',
  steps: [{ step: 1, title: 'Map attributes', desc: 'Match object attributes to IFC property sets before export.' }],
  recommendation: 'Verify mapping in the receiving application.', estimatedMinutes: 10, seed: 'A1', attachments: [], contentStatus: 'verified',
}];

describe('Allplan Academy Companion', () => {
  it('returns only excerpts backed by a canonical lesson citation', () => {
    const result = answerFromAllplanLessons('IFC property mapping nasıl yapılır?', lessons);
    assert.equal(result.grounded, true);
    assert.equal(result.citations[0].lessonSlug, 'ifc-basics');
    assert.match(result.answer, /IFC property mapping/);
  });

  it('refuses to invent an answer when the curriculum has no match', () => {
    const result = answerFromAllplanLessons('quantum photonics', lessons);
    assert.equal(result.grounded, false);
    assert.deepEqual(result.citations, []);
    assert.match(result.answer, /kaynak dışı cevap üretmez/);
  });

  it('rejects questions made only of stop words', () => {
    assert.equal(answerFromAllplanLessons('bu ve bir', lessons).grounded, false);
  });
});
