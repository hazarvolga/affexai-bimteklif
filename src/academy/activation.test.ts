import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { academyActivationSummary, isAcademyAnalyticsAdmin } from './activation';

describe('Academy activation reporting', () => {
  it('calculates funnel conversion without dividing by zero', () => {
    assert.deepEqual(academyActivationSummary({ landingViews: 100, registrations: 20, verifiedLearners: 10, firstLessonLearners: 8, secondLessonLearners: 4, activeLearners7d: 6, structuralEarlyAccessRequests: 3 }).conversion, {
      landingToRegistrationPercent: 20,
      registrationToVerifiedPercent: 50,
      registrationToFirstLessonPercent: 40,
      firstToSecondLessonPercent: 50,
    });
    assert.equal(academyActivationSummary({ landingViews: 0, registrations: 0, verifiedLearners: 0, firstLessonLearners: 0, secondLessonLearners: 0, activeLearners7d: 0, structuralEarlyAccessRequests: 0 }).conversion.landingToRegistrationPercent, 0);
  });

  it('requires an explicit normalized admin allowlist match', () => {
    assert.equal(isAcademyAnalyticsAdmin('Owner@Example.com', 'admin@example.com, owner@example.com '), true);
    assert.equal(isAcademyAnalyticsAdmin('other@example.com', 'admin@example.com'), false);
    assert.equal(isAcademyAnalyticsAdmin('admin@example.com', ''), false);
  });
});
