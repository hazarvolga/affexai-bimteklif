import React from "react";
import { CADDiagramViewer } from "../components/academy/CADDiagramViewer";
import { PageHeader } from "../components/layout/PageHeader";

export default function AcademyCADPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="İnteraktif CAD & BIM Çizim Viewer"
        description="Mühendislik ve donatı detay paftalarının 2D/3D interaktif kesit inceleme aracı."
      />
      <CADDiagramViewer lessonTitle="Allplan Donatı Detaylandırması" />
    </div>
  );
}
