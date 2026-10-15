import React, { useState } from "react";
import BimDashboard from "../components/bimplan/BimDashboard";
import BimGapAnalysis from "../components/bimplan/BimGapAnalysis";
import StandardsView from "../components/bimplan/StandardsView";
import LegislationView from "../components/bimplan/LegislationView";
import DocumentsView from "../components/bimplan/DocumentsView";
import { PageHeader } from "../components/layout/PageHeader";

export default function BimStandardsPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "gap" | "standards" | "legislation" | "documents">("dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="BIM Standartları & Gap Analizi"
        description="ISO 19650 Olgunluk paneli, BIMPLAN Şablonları ve mevzuat uygunluk matrisi."
      />

      <div role="tablist" aria-label="BIM Standartları ve Gap Analizi Sekmeleri" className="flex border-b border-border space-x-1 overflow-x-auto">
        <button
          id="tab-dashboard"
          role="tab"
          aria-selected={activeTab === "dashboard"}
          aria-controls="panel-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          BIM Olgunluk Paneli
        </button>
        <button
          id="tab-gap"
          role="tab"
          aria-selected={activeTab === "gap"}
          aria-controls="panel-gap"
          onClick={() => setActiveTab("gap")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "gap"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Gap Analizi Matrisi
        </button>
        <button
          id="tab-standards"
          role="tab"
          aria-selected={activeTab === "standards"}
          aria-controls="panel-standards"
          onClick={() => setActiveTab("standards")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "standards"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          BIM Standartları & BEP
        </button>
        <button
          id="tab-legislation"
          role="tab"
          aria-selected={activeTab === "legislation"}
          aria-controls="panel-legislation"
          onClick={() => setActiveTab("legislation")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "legislation"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mevzuat Uyum
        </button>
        <button
          id="tab-documents"
          role="tab"
          aria-selected={activeTab === "documents"}
          aria-controls="panel-documents"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "documents"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Dokümanlar & Şablonlar
        </button>
      </div>

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-2">
        {activeTab === "dashboard" && <BimDashboard />}
        {activeTab === "gap" && <BimGapAnalysis />}
        {activeTab === "standards" && <StandardsView />}
        {activeTab === "legislation" && <LegislationView />}
        {activeTab === "documents" && <DocumentsView />}
      </div>
    </div>
  );
}

