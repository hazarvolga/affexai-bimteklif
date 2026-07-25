import React from "react";
import { CertificatesViewer } from "../components/academy/CertificatesViewer";
import { PageHeader } from "../components/layout/PageHeader";

export default function AcademyCertificatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BIM & ALLPLAN Sertifikalarım"
        description="Tamamlanan eğitimlerin doğrulanmış başarı sertifikaları ve dijital rozetleri."
      />
      <CertificatesViewer completedLessons={[]} trainee={null} onVerifyCertificate={() => {}} />
    </div>
  );
}
