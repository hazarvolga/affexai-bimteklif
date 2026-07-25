import React from "react";
import { StudentProfile } from "../components/academy/StudentProfile";
import { PageHeader } from "../components/layout/PageHeader";

export default function AcademyProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Öğrenci Yetkinlik Profili"
        description="BIM ve Mühendislik konularındaki gelişim istatistikleriniz ve kazanılan yetkinlikler."
      />
      <StudentProfile
        trainee={null}
        completedLessons={[]}
        notes={[]}
        bookmarks={[]}
        examAttempts={[]}
        onSelectLesson={() => {}}
        onViewCertificate={() => {}}
      />
    </div>
  );
}
