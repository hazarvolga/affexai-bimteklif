import React from "react";
import BimGlossary from "../components/bimplan/BimGlossary";
import { PageHeader } from "../components/layout/PageHeader";

export default function BimGlossaryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BIM Terimler & Açıklamalar Sözlüğü"
        description="ISO 19650, IFC, COBie, LOD ve BIM standart terimlerinin kapsamlı Türkçe rehberi."
      />
      <BimGlossary />
    </div>
  );
}
