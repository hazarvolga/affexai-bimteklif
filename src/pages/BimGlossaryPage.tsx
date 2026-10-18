import React from "react";
import { Link } from "react-router-dom";
import BimGlossary from "../components/bimplan/BimGlossary";
import { PageHeader } from "../components/layout/PageHeader";
import { PublicMetadata } from "../components/PublicMetadata";

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

export function PublicBimGlossaryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <PublicMetadata
        title="BIM Terimler, ISO 19650, IFC 4.3 ve RG 33331 e-PYS Sözlüğü | BIMMetraj"
        description="Türkiye inşaat ve teknik ofis ekipleri için ISO 19650, openBIM IFC 4.3, QTO, LOD, COBie, ÇŞB Poz ve RG 33331 e-PYS terimlerinin kapsamlı Türkçe mühendislik sözlüğü."
        canonicalPath="/bim-sozlugu"
      />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400 hover:underline">
            ← BIMMetraj Ana Sayfa
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/pricing" className="text-foreground dark:text-muted-foreground hover:text-foreground">Paketler</Link>
            <Link to="/smartcheck" className="text-foreground dark:text-muted-foreground hover:text-foreground">SmartCheck Demo</Link>
            <Link to="/register" className="rounded bg-orange-600 px-3 py-1.5 font-semibold text-white hover:bg-orange-500">
              Ücretsiz Deneyin
            </Link>
          </div>
        </div>
        <PageHeader
          title="BIM, openBIM (IFC) & RG 33331 e-PYS Mühendislik Sözlüğü"
          description="ISO 19650, IFC 4.3, QTO, COBie, LOD, ÇŞB Poz ve 5 Ağustos 2026 tarihli RG 33331 e-PYS standart terimlerinin kapsamlı Türkçe başvurusu."
        />
        <BimGlossary />
      </div>
    </main>
  );
}

