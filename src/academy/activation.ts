export type AcademyActivationCounts = {
  landingViews: number;
  registrations: number;
  verifiedLearners: number;
  firstLessonLearners: number;
  secondLessonLearners: number;
  activeLearners7d: number;
  structuralEarlyAccessRequests: number;
};

const rate = (value: number, base: number) => base > 0 ? Math.round((value / base) * 1000) / 10 : 0;

export function academyActivationSummary(counts: AcademyActivationCounts) {
  return {
    counts,
    conversion: {
      landingToRegistrationPercent: rate(counts.registrations, counts.landingViews),
      registrationToVerifiedPercent: rate(counts.verifiedLearners, counts.registrations),
      registrationToFirstLessonPercent: rate(counts.firstLessonLearners, counts.registrations),
      firstToSecondLessonPercent: rate(counts.secondLessonLearners, counts.firstLessonLearners),
    },
  };
}

export function isAcademyAnalyticsAdmin(email: string, allowlist = process.env.ACADEMY_ADMIN_EMAILS ?? '') {
  const normalized = email.trim().toLowerCase();
  return allowlist.split(',').map(value => value.trim().toLowerCase()).filter(Boolean).includes(normalized);
}
