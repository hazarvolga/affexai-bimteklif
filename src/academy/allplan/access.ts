export type EnrollmentWindow = {
  status: string;
  startsAt: Date;
  endsAt: Date | null;
};

export function isEnrollmentActive(enrollment: EnrollmentWindow, now = new Date()) {
  return enrollment.status === "active" && enrollment.startsAt <= now && (!enrollment.endsAt || enrollment.endsAt > now);
}
