import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileCheck2,
  HardDrive,
  Layers,
  Package,
  Power,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { adminPlansSchema, readAdminResponse } from './admin-data';

const MB = 1024 * 1024;

interface PlanPreset {
  id: string;
  label: string;
  badge: string;
  values: {
    name: string;
    monthlyPrice: number;
    isTrial: boolean;
    monthlyQuoteLimit: number;
    monthlyIfcLimit: number | null;
    ifcMaxFileMb: number;
    ifcMaxConcurrent: number;
    monthlyPdfLimit: number | null;
    monthlyAiLimit: number | null;
    monthlyCrmLimit: number | null;
    monthlyRegulationLimit: number | null;
    monthlyProfitAnalysisLimit: number | null;
    maxDocuments: number | null;
    storageMaxMb: number | null;
    marketingBadge: string;
    marketingDescription: string;
  };
}

const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'trial',
    label: '14 Günlük Ücretsiz Deneme',
    badge: '0 ₺ Trial',
    values: {
      name: '14 Günlük Ücretsiz Deneme',
      monthlyPrice: 0,
      isTrial: true,
      monthlyQuoteLimit: 3,
      monthlyIfcLimit: 1,
      ifcMaxFileMb: 25,
      ifcMaxConcurrent: 1,
      monthlyPdfLimit: 3,
      monthlyAiLimit: 5,
      monthlyCrmLimit: 15,
      monthlyRegulationLimit: 5,
      monthlyProfitAnalysisLimit: 5,
      maxDocuments: 25,
      storageMaxMb: 256,
      marketingBadge: '14 Gün Ücretsiz',
      marketingDescription:
        'IFC 3x3 ve e-PYS ön denetim motorunu tek bir küçük ölçekli projede 14 gün boyunca ücretsiz deneyimleyin.',
    },
  },
  {
    id: 'epys_auditor',
    label: 'e-PYS & BIM Standart Denetçi',
    badge: 'Denetçi',
    values: {
      name: 'e-PYS & BIM Standart Denetçi',
      monthlyPrice: 1250,
      isTrial: false,
      monthlyQuoteLimit: 5,
      monthlyIfcLimit: 5,
      ifcMaxFileMb: 35,
      ifcMaxConcurrent: 1,
      monthlyPdfLimit: 8,
      monthlyAiLimit: 10,
      monthlyCrmLimit: 25,
      monthlyRegulationLimit: 15,
      monthlyProfitAnalysisLimit: 5,
      maxDocuments: 150,
      storageMaxMb: 1024,
      marketingBadge: 'Ruhsat & Denetim',
      marketingDescription:
        'Mimar ve mühendisler için RG 33331 e-PYS isimlendirme, mahaller, PDF/A ve IFC 3x3 ruhsat teslim öncesi kalite denetim paketi.',
    },
  },
  {
    id: 'quote_site',
    label: 'Teklif & Şantiye',
    badge: 'Şantiye',
    values: {
      name: 'Teklif & Şantiye',
      monthlyPrice: 2950,
      isTrial: false,
      monthlyQuoteLimit: 25,
      monthlyIfcLimit: 5,
      ifcMaxFileMb: 40,
      ifcMaxConcurrent: 1,
      monthlyPdfLimit: 15,
      monthlyAiLimit: 25,
      monthlyCrmLimit: 150,
      monthlyRegulationLimit: 30,
      monthlyProfitAnalysisLimit: 25,
      maxDocuments: 300,
      storageMaxMb: 2048,
      marketingBadge: 'Şantiye Odaklı',
      marketingDescription:
        'Metraj, ÇŞB 2026 poz kütüphanesi, yaklaşık maliyet, taşeron teklif yönetimi ve kârlılık simülasyonu odaklı şantiye paketi.',
    },
  },
  {
    id: 'bim_5d',
    label: '5D BIM & SmartCheck',
    badge: 'Popüler',
    values: {
      name: '5D BIM & SmartCheck',
      monthlyPrice: 5450,
      isTrial: false,
      monthlyQuoteLimit: 75,
      monthlyIfcLimit: 15,
      ifcMaxFileMb: 60,
      ifcMaxConcurrent: 1,
      monthlyPdfLimit: 35,
      monthlyAiLimit: 60,
      monthlyCrmLimit: 500,
      monthlyRegulationLimit: 100,
      monthlyProfitAnalysisLimit: 75,
      maxDocuments: 750,
      storageMaxMb: 5120,
      marketingBadge: 'En Çok Tercih Edilen',
      marketingDescription:
        'Tam kapsamlı IFC 3x3 metraj doğrulama, ÇŞB/DIN minha kuralları, e-PYS ön kontrolü ve otomatik 5D teklif transferi.',
    },
  },
  {
    id: 'enterprise',
    label: 'Kurumsal Taahhüt & e-PYS',
    badge: 'Kurumsal',
    values: {
      name: 'Kurumsal Taahhüt & e-PYS',
      monthlyPrice: 8900,
      isTrial: false,
      monthlyQuoteLimit: 200,
      monthlyIfcLimit: 35,
      ifcMaxFileMb: 85,
      ifcMaxConcurrent: 2,
      monthlyPdfLimit: 75,
      monthlyAiLimit: 150,
      monthlyCrmLimit: 1500,
      monthlyRegulationLimit: 250,
      monthlyProfitAnalysisLimit: 200,
      maxDocuments: 2000,
      storageMaxMb: 15360,
      marketingBadge: 'Kurumsal',
      marketingDescription:
        'Çoklu disiplin BIM koordinasyonu, öncelikli IFC/PDF kuyruk işleme ve kurumsal ihale ekipleri için yüksek kapasite.',
    },
  },
];

export function PlanEditor() {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isCreateMode = !planId || planId === 'new';
  const cloneFromId = searchParams.get('cloneFrom');

  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Identity & Pricing
  const [name, setName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [isTrial, setIsTrial] = useState(false);

  // Lifecycle & Visibility
  const [isActive, setIsActive] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [marketingBadge, setMarketingBadge] = useState('');
  const [marketingDescription, setMarketingDescription] = useState('');

  // SmartCheck (IFC & PDF/A) Quotas
  const [monthlyIfcLimit, setMonthlyIfcLimit] = useState<number | null>(5);
  const [ifcMaxFileMb, setIfcMaxFileMb] = useState(100);
  const [ifcMaxConcurrent, setIfcMaxConcurrent] = useState(1);
  const [monthlyPdfLimit, setMonthlyPdfLimit] = useState<number | null>(25);

  // 5D Quote, AI & Module Quotas
  const [monthlyQuoteLimit, setMonthlyQuoteLimit] = useState(15);
  const [monthlyAiLimit, setMonthlyAiLimit] = useState<number | null>(25);
  const [monthlyCrmLimit, setMonthlyCrmLimit] = useState<number | null>(100);
  const [monthlyRegulationLimit, setMonthlyRegulationLimit] = useState<number | null>(50);
  const [monthlyProfitAnalysisLimit, setMonthlyProfitAnalysisLimit] = useState<number | null>(25);

  // Storage & Document Quotas
  const [maxDocuments, setMaxDocuments] = useState<number | null>(100);
  const [storageMaxMb, setStorageMaxMb] = useState<number | null>(1024);

  // Subscriber Migration State
  const [replacementPlanId, setReplacementPlanId] = useState<string>('');
  const [forceMigrateSubscribers, setForceMigrateSubscribers] = useState(false);

  const currentPlan = useMemo(
    () => (!isCreateMode ? allPlans.find((p) => p.id === planId) ?? null : null),
    [allPlans, isCreateMode, planId],
  );

  const otherActivePlans = useMemo(
    () => allPlans.filter((p) => p.isActive && p.id !== planId),
    [allPlans, planId],
  );

  const populateFormFromPlan = (plan: any, asCopy = false) => {
    setName(asCopy ? `${plan.name} (Kopya)` : plan.name);
    setMonthlyPrice(plan.monthlyPrice ?? 0);
    setIsTrial(Boolean(plan.isTrial ?? plan.monthlyPrice === 0));
    setIsActive(asCopy ? true : Boolean(plan.isActive));
    setIsPublished(asCopy ? false : Boolean(plan.isPublished));
    setIsFeatured(asCopy ? false : Boolean(plan.isFeatured));
    setDisplayOrder(plan.displayOrder ?? 0);
    setMarketingBadge(plan.marketingBadge ?? '');
    setMarketingDescription(plan.marketingDescription ?? '');

    setMonthlyIfcLimit(plan.monthlyIfcLimit ?? null);
    setIfcMaxFileMb(Math.min(100, Math.max(1, plan.ifcMaxFileMb ?? 100)));
    setIfcMaxConcurrent(Math.min(10, Math.max(1, plan.ifcMaxConcurrent ?? 1)));
    setMonthlyPdfLimit(plan.monthlyPdfLimit !== undefined ? plan.monthlyPdfLimit : 25);

    setMonthlyQuoteLimit(plan.monthlyQuoteLimit ?? 0);
    setMonthlyAiLimit(plan.monthlyAiLimit !== undefined ? plan.monthlyAiLimit : null);
    setMonthlyCrmLimit(plan.monthlyCrmLimit !== undefined ? plan.monthlyCrmLimit : null);
    setMonthlyRegulationLimit(plan.monthlyRegulationLimit !== undefined ? plan.monthlyRegulationLimit : null);
    setMonthlyProfitAnalysisLimit(
      plan.monthlyProfitAnalysisLimit !== undefined ? plan.monthlyProfitAnalysisLimit : null,
    );

    setMaxDocuments(plan.maxDocuments !== undefined ? plan.maxDocuments : null);
    setStorageMaxMb(
      typeof plan.storageMaxBytes === 'number' && plan.storageMaxBytes > 0
        ? Math.max(1, Math.round(plan.storageMaxBytes / MB))
        : null,
    );
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/admin/plans');
      const list = await readAdminResponse(res, adminPlansSchema);
      setAllPlans(list);

      if (!isCreateMode) {
        const found = list.find((p) => p.id === planId);
        if (!found) {
          setError('Düzenlemek istediğiniz paket bulunamadı.');
          return;
        }
        populateFormFromPlan(found, false);
        const firstAlt = list.find((p) => p.isActive && p.id !== found.id)?.id ?? '';
        setReplacementPlanId(firstAlt);
      } else if (cloneFromId) {
        const source = list.find((p) => p.id === cloneFromId);
        if (source) {
          populateFormFromPlan(source, true);
        }
      } else {
        setDisplayOrder((list.length + 1) * 10);
      }
    } catch {
      setError('Paket verileri yüklenemedi. Yetkinizi ve bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [planId, cloneFromId]);

  const applyPreset = (preset: PlanPreset) => {
    setName(preset.values.name);
    setMonthlyPrice(preset.values.monthlyPrice);
    setIsTrial(preset.values.isTrial);
    setMonthlyQuoteLimit(preset.values.monthlyQuoteLimit);
    setMonthlyIfcLimit(preset.values.monthlyIfcLimit);
    setIfcMaxFileMb(preset.values.ifcMaxFileMb);
    setIfcMaxConcurrent(preset.values.ifcMaxConcurrent);
    setMonthlyPdfLimit(preset.values.monthlyPdfLimit);
    setMonthlyAiLimit(preset.values.monthlyAiLimit);
    setMonthlyCrmLimit(preset.values.monthlyCrmLimit);
    setMonthlyRegulationLimit(preset.values.monthlyRegulationLimit);
    setMonthlyProfitAnalysisLimit(preset.values.monthlyProfitAnalysisLimit);
    setMaxDocuments(preset.values.maxDocuments);
    setStorageMaxMb(preset.values.storageMaxMb);
    setMarketingBadge(preset.values.marketingBadge);
    setMarketingDescription(preset.values.marketingDescription);
    toast.success(`"${preset.label}" şablon değerleri forma uygulandı.`);
  };

  const subscriberCount = currentPlan?.subscriberCount ?? 0;
  const subscribers: Array<{ companyId: string; companyName: string; status: string }> = Array.isArray(
    currentPlan?.subscribers,
  )
    ? currentPlan.subscribers
    : [];

  const isDeactivating = Boolean(!isCreateMode && currentPlan?.isActive && !isActive);
  const needsReplacementPlan = (isDeactivating || forceMigrateSubscribers) && subscriberCount > 0;

  const lifecycleMode: 'active_public' | 'active_hidden' | 'inactive' = !isActive
    ? 'inactive'
    : isPublished
      ? 'active_public'
      : 'active_hidden';

  const handleLifecycleSelect = (mode: 'active_public' | 'active_hidden' | 'inactive') => {
    if (mode === 'active_public') {
      setIsActive(true);
      setIsPublished(true);
    } else if (mode === 'active_hidden') {
      setIsActive(true);
      setIsPublished(false);
    } else {
      setIsActive(false);
      setIsPublished(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error('Lütfen geçerli bir paket adı girin.');
      return;
    }

    if (needsReplacementPlan && !replacementPlanId) {
      toast.error(
        `Bu paketi kullanan ${subscriberCount} firma var. Devam etmek için firmaların aktarılacağı alternatif aktif paketi seçmelisiniz.`,
      );
      return;
    }

    setSaving(true);
    try {
      const storageMaxBytes =
        storageMaxMb !== null && storageMaxMb > 0 ? Math.round(storageMaxMb * MB) : null;

      const payload: Record<string, unknown> = {
        name: name.trim(),
        monthlyPrice: Math.max(0, Math.round(Number(monthlyPrice) || 0)),
        isTrial,
        monthlyQuoteLimit: Math.max(0, Math.round(Number(monthlyQuoteLimit) || 0)),
        monthlyIfcLimit:
          monthlyIfcLimit === null ? null : Math.max(0, Math.round(Number(monthlyIfcLimit) || 0)),
        ifcMaxFileMb: Math.min(100, Math.max(1, Math.round(Number(ifcMaxFileMb) || 100))),
        ifcMaxConcurrent: Math.min(10, Math.max(1, Math.round(Number(ifcMaxConcurrent) || 1))),
        monthlyPdfLimit:
          monthlyPdfLimit === null ? null : Math.max(0, Math.round(Number(monthlyPdfLimit) || 0)),
        monthlyAiLimit:
          monthlyAiLimit === null ? null : Math.max(0, Math.round(Number(monthlyAiLimit) || 0)),
        monthlyCrmLimit:
          monthlyCrmLimit === null ? null : Math.max(0, Math.round(Number(monthlyCrmLimit) || 0)),
        monthlyRegulationLimit:
          monthlyRegulationLimit === null
            ? null
            : Math.max(0, Math.round(Number(monthlyRegulationLimit) || 0)),
        monthlyProfitAnalysisLimit:
          monthlyProfitAnalysisLimit === null
            ? null
            : Math.max(0, Math.round(Number(monthlyProfitAnalysisLimit) || 0)),
        maxDocuments:
          maxDocuments === null ? null : Math.max(1, Math.round(Number(maxDocuments) || 1)),
        storageMaxBytes,
        isActive,
        isPublished: isActive ? isPublished : false,
        isFeatured,
        displayOrder: Math.min(10000, Math.max(0, Math.round(Number(displayOrder) || 0))),
        marketingBadge: marketingBadge.trim() || null,
        marketingDescription: marketingDescription.trim() || null,
      };

      if (!isCreateMode && needsReplacementPlan && replacementPlanId) {
        payload.replacementPlanId = replacementPlanId;
      }

      const url = isCreateMode ? '/api/admin/plans' : `/api/admin/plans/${planId}`;
      const method = isCreateMode ? 'POST' : 'PATCH';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(body.error || 'Paket kaydedilemedi.');
        return;
      }

      if (typeof body.migratedCount === 'number' && body.migratedCount > 0) {
        const targetPlanName = allPlans.find((p) => p.id === replacementPlanId)?.name ?? 'yeni paket';
        toast.success(
          `Paket kaydedildi ve ${body.migratedCount} firma "${targetPlanName}" paketine kesintisiz taşındı.`,
        );
      } else {
        toast.success(isCreateMode ? 'Yeni paket başarıyla oluşturuldu.' : 'Paket ayarları güncellendi.');
      }

      navigate('/admin/plans');
    } catch {
      toast.error('Sistemsel bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">Paket yapılandırması yükleniyor...</div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-red-200 space-y-4">
          <p className="font-semibold">{error}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/plans')}>
              <ArrowLeft size={15} className="mr-1.5" /> Paket Listesine Dön
            </Button>
            <Button onClick={() => void loadData()} className="bg-indigo-600 text-white">
              Tekrar Dene
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const yearlyDiscountedMonthly = Math.round(monthlyPrice * 0.8);

  return (
    <PageContainer>
      {/* ÜST AKSİYON & BREADCRUMB BARI */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/admin/plans"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <ArrowLeft size={14} /> Paket Yönetimi
            </Link>
            <span>/</span>
            <span className="text-foreground dark:text-muted-foreground font-semibold">
              {isCreateMode ? 'Yeni Paket Oluştur' : currentPlan?.name || 'Paketi Düzenle'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {isCreateMode ? 'Yeni Abonelik Paketi Oluştur' : `${name || currentPlan?.name} — Paket Yapılandırması`}
            </h1>
            {!isCreateMode && (
              <>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-300 border-red-500/30'
                  }`}
                >
                  <Power size={11} />
                  {isActive ? 'Kullanıma Açık (Aktif)' : 'Kullanıma Kapalı (Pasif)'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    isActive && isPublished
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isActive && isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
                  {isActive && isPublished ? 'Vitrin: Yayında' : 'Vitrin: Gizli'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs font-bold text-foreground">
                  <Users size={11} className="text-indigo-400" />
                  {subscriberCount} Kayıtlı Firma
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Paketin fiyatını, IFC/PDF/Teklif/AI kotalarını, depolama tavanını, vitrin görünümünü ve bu paketi kullanan firmaların alternatif pakete aktarımını tek sayfadan yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isCreateMode && currentPlan && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/plans/new?cloneFrom=${currentPlan.id}`)}
              className="border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated text-xs"
            >
              <Copy size={14} className="mr-1.5" /> Bu Paketten Kopya Oluştur
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/admin/plans')}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5"
          >
            <Save size={15} className="mr-1.5" />
            {saving
              ? 'Kaydediliyor...'
              : isCreateMode
                ? 'Yeni Paketi Oluştur'
                : needsReplacementPlan
                  ? `${subscriberCount} Firmayı Taşı ve Kaydet`
                  : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </div>

      {/* HIZLI PROFİL ŞABLONLARI */}
      <div className="mt-5 rounded-xl border border-border bg-card p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-foreground dark:text-muted-foreground">
          <Sparkles size={15} className="text-indigo-400 shrink-0" />
          <span className="font-semibold">Hızlı Paket Şablonu Yükle:</span>
          <span className="text-muted-foreground hidden md:inline">
            Önerilen mühendislik kota setlerini tek tıkla doldurup üzerinde özelleştirme yapabilirsiniz.
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-lg border border-border bg-background hover:border-indigo-500/50 hover:bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-foreground dark:text-muted-foreground transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
        {/* SOL ANA KOLON (8 SÜTUN) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. PAKET DURUMU (AKTİF / PASİF) & MÜŞTERİ TAŞIMA KURGUSU */}
          <section
            id="durum-ve-tasima"
            className="rounded-2xl border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Power size={18} className="text-amber-400" />
                  1. Paket Durumu (Aktif / Pasif) & Mevcut Müşteri Taşıma Kurgusu
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paketin yeni satışlara, mevcut abonelere veya tüm sisteme açık/kapalı olma durumunu belirleyin.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {/* Mod 1: Aktif & Yayında */}
              <label
                onClick={() => handleLifecycleSelect('active_public')}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  lifecycleMode === 'active_public'
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-950/30'
                    : 'border-border bg-background hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 size={14} /> Aktif & Vitrin'de Yayında
                  </span>
                  <input
                    type="radio"
                    name="lifecycleMode"
                    checked={lifecycleMode === 'active_public'}
                    onChange={() => handleLifecycleSelect('active_public')}
                    className="text-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Paket hem `/pricing` ve `/register` ekranlarında yeni müşterilere sunulur hem de mevcut aboneler kotalarını kullanır.
                </p>
              </label>

              {/* Mod 2: Aktif ama Vitrinde Gizli (Grandfathered) */}
              <label
                onClick={() => handleLifecycleSelect('active_hidden')}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  lifecycleMode === 'active_hidden'
                    ? 'border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-950/30'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <EyeOff size={14} /> Yeni Satışa Kapalı (Gizli)
                  </span>
                  <input
                    type="radio"
                    name="lifecycleMode"
                    checked={lifecycleMode === 'active_hidden'}
                    onChange={() => handleLifecycleSelect('active_hidden')}
                    className="text-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Yeni kayıt olanlar bu paketi göremez (`isPublished: false`), ancak mevcut{' '}
                  <strong className="text-foreground">{subscriberCount} firma</strong> kendi paket kotalarıyla kesintisiz devam eder.
                </p>
              </label>

              {/* Mod 3: Tamamen Pasif & Müşterileri Aktar */}
              <label
                onClick={() => handleLifecycleSelect('inactive')}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  lifecycleMode === 'inactive'
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-950/30'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Power size={14} /> Tamamen Pasife Al
                  </span>
                  <input
                    type="radio"
                    name="lifecycleMode"
                    checked={lifecycleMode === 'inactive'}
                    onChange={() => handleLifecycleSelect('inactive')}
                    className="text-amber-500"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Paket tamamen kullanım dışı bırakılır (`isActive: false`). Bu paketteki mevcut firmalar seçeceğiniz alternatif pakete otomatik aktarılır.
                </p>
              </label>
            </div>

            {/* Mevcut Müşterileri Alternatif Pakete Taşıma Kutusu */}
            {!isCreateMode && subscriberCount > 0 && (
              <div
                className={`rounded-xl border p-4 space-y-3 ${
                  isDeactivating
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-zinc-800 bg-zinc-950/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Bu Paketteki Mevcut Müşterileri ({subscriberCount} Firma) Alternatif Pakete Taşı
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isDeactivating
                          ? 'Paketi tamamen pasife aldığınız için mevcut abonelerin kesinti yaşamaması adına alternatif aktif bir paket seçmelisiniz.'
                          : 'Paketi pasife almadan da mevcut aboneleri tek işlemle başka bir aktif pakete topluca taşıyabilirsiniz.'}
                      </p>
                    </div>
                  </div>
                  {!isDeactivating && (
                    <label className="inline-flex items-center gap-2 text-xs text-amber-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={forceMigrateSubscribers}
                        onChange={(e) => setForceMigrateSubscribers(e.target.checked)}
                        className="rounded border-border bg-card text-amber-500"
                      />
                      Kaydederken müşterileri taşı
                    </label>
                  )}
                </div>

                {(isDeactivating || forceMigrateSubscribers) && (
                  <div className="grid gap-3 sm:grid-cols-2 items-center pt-2 border-t border-border">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-200 mb-1">
                        Hedef Alternatif Aktif Paket *
                      </label>
                      <select
                        value={replacementPlanId}
                        onChange={(e) => setReplacementPlanId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                      >
                        <option value="">-- Alternatif Aktif Paket Seçin --</option>
                        {otherActivePlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.monthlyPrice === 0 ? 'Ücretsiz' : `₺${p.monthlyPrice}/ay`} ·{' '}
                            {p.monthlyIfcLimit === null ? 'Sınırsız' : `${p.monthlyIfcLimit} IFC`} ·{' '}
                            {p.monthlyQuoteLimit} Teklif)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[11px] text-foreground dark:text-muted-foreground bg-card rounded-lg p-2.5 border border-border">
                      <span className="font-semibold text-foreground block mb-1">Taşınacak Firmalar:</span>
                      <div className="flex flex-wrap gap-1">
                        {subscribers.map((sub) => (
                          <span
                            key={sub.companyId}
                            className="inline-flex items-center gap-1 rounded bg-surface-elevated px-2 py-0.5 text-[10px] text-indigo-200"
                          >
                            <Building2 size={10} /> {sub.companyName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. PAKET KİMLİĞİ & FİYATLANDIRMA */}
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Package size={18} className="text-indigo-400" />
              2. Paket Kimliği & Fiyatlandırma
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1.5">Paket Adı *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: 5D BIM & SmartCheck"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1.5">Aylık Fiyat (₺) *</label>
                <input
                  type="number"
                  min={0}
                  value={monthlyPrice}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setMonthlyPrice(val);
                    if (val === 0) setIsTrial(true);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-indigo-500"
                />
                <span className="block text-[10px] text-muted-foreground mt-1">
                  {monthlyPrice === 0
                    ? '0 ₺ (Ücretsiz / Deneme Paketi)'
                    : `Yıllık ödemede (%20 indirimli): ₺${yearlyDiscountedMonthly.toLocaleString('tr-TR')} / ay`}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3.5 flex items-center justify-between gap-4">
              <div>
                <label htmlFor="isTrialToggle" className="text-xs font-bold text-white cursor-pointer">
                  Ücretsiz Deneme (Trial) Paketi Olarak İşaretle (`isTrial`)
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  İşaretlendiğinde yeni kayıt olan firmalar dekont/havale beklemeden anında aktif olur ve SmartCheck yetkileri otomatik açılır.
                </p>
              </div>
              <input
                id="isTrialToggle"
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-card text-emerald-500"
              />
            </div>
          </section>

          {/* 3. SMARTCHECK (IFC 3X3 & E-PYS PDF/A) TEKNİK KOTALARI */}
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                3. SmartCheck (IFC 3x3 & RG 33331 e-PYS PDF/A) Teknik Kotaları
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                IFC metraj/isimlendirme analizi, dosya boyutu tavanı, paralel kuyruk işçisi ve PDF/A ön kontrol kotaları.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Aylık IFC Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Aylık IFC Analizi</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyIfcLimit === null}
                      onChange={(e) => setMonthlyIfcLimit(e.target.checked ? null : 5)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyIfcLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz / Tanımsız
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyIfcLimit}
                    onChange={(e) => setMonthlyIfcLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">Aylık başarılı IFC 3x3 & e-PYS koşumu</p>
              </div>

              {/* Maks IFC Dosya Boyutu */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-foreground dark:text-muted-foreground">Maks. IFC Boyutu (MB)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={ifcMaxFileMb}
                  onChange={(e) => setIfcMaxFileMb(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                />
                <p className="text-[10px] text-muted-foreground">Sunucu güvenlik tavanı: 100 MB</p>
              </div>

              {/* Eşzamanlı Kuyruk İşi */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-foreground dark:text-muted-foreground">Eşzamanlı IFC İşi</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={ifcMaxConcurrent}
                  onChange={(e) => setIfcMaxConcurrent(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                />
                <p className="text-[10px] text-muted-foreground">Aynı anda çalışabilen analiz sayısı (1–10)</p>
              </div>

              {/* Aylık PDF/A Ön Kontrol Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Aylık PDF/A Kotası</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyPdfLimit === null}
                      onChange={(e) => setMonthlyPdfLimit(e.target.checked ? null : 25)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyPdfLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyPdfLimit}
                    onChange={(e) => setMonthlyPdfLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">RG 33331 e-PYS PDF/A-2B rapor ön kontrolü</p>
              </div>
            </div>
          </section>

          {/* 4. 5D METRAJ, TEKLİF, AI & MODÜL KOTALARI */}
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-sky-400" />
                4. 5D Metraj, Teklif, Yapay Zeka & Modül Kotaları
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paket kapsamındaki aylık teklif oluşturma, AI ihale analizi, mevzuat sorgusu, kârlılık simülasyonu ve CRM kotaları.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Aylık Teklif Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-foreground dark:text-muted-foreground">
                  Aylık Teklif Oluşturma Kotası *
                </label>
                <input
                  type="number"
                  min={0}
                  value={monthlyQuoteLimit}
                  onChange={(e) => setMonthlyQuoteLimit(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                />
                <p className="text-[10px] text-muted-foreground">
                  {monthlyQuoteLimit === 0
                    ? '0 = Teklif modülü kapalı (Sadece Denetçi Paketi)'
                    : `Aylık ${monthlyQuoteLimit} adet yeni teklif`}
                </p>
              </div>

              {/* Aylık AI Asistan Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Aylık AI Analiz Kotası</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyAiLimit === null}
                      onChange={(e) => setMonthlyAiLimit(e.target.checked ? null : 25)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyAiLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyAiLimit}
                    onChange={(e) => setMonthlyAiLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">AI sözleşme ve poz eşleştirme sorgusu</p>
              </div>

              {/* Aylık Mevzuat & Poz Sorgu Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Mevzuat & Poz Sorgusu</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyRegulationLimit === null}
                      onChange={(e) => setMonthlyRegulationLimit(e.target.checked ? null : 50)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyRegulationLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyRegulationLimit}
                    onChange={(e) => setMonthlyRegulationLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">ÇŞB / TBDY / KİK mevzuat analiz sorgusu</p>
              </div>

              {/* Aylık Kârlılık Simülasyonu */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Kârlılık Simülasyonu</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyProfitAnalysisLimit === null}
                      onChange={(e) => setMonthlyProfitAnalysisLimit(e.target.checked ? null : 25)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyProfitAnalysisLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyProfitAnalysisLimit}
                    onChange={(e) => setMonthlyProfitAnalysisLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">Enflasyon / eskalasyon senaryo simülasyonu</p>
              </div>

              {/* Aylık CRM Kotası */}
              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground">CRM Fırsat & Müşteri</label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monthlyCrmLimit === null}
                      onChange={(e) => setMonthlyCrmLimit(e.target.checked ? null : 100)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {monthlyCrmLimit === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={monthlyCrmLimit}
                    onChange={(e) => setMonthlyCrmLimit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">Aylık CRM kayıt ve ihale takip limiti</p>
              </div>
            </div>
          </section>

          {/* 5. BULUT DEPOLAMA (R2) & DOKÜMAN ARŞİV LİMİTLERİ */}
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive size={18} className="text-purple-400" />
                5. Bulut Depolama (R2) & Doküman Arşiv Limitleri
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Firmanın çalışma alanında saklayabileceği toplam IFC/PDF/XLSX dosya sayısı ve toplam bulut depolama kotası.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Maksimum Doküman Sayısı */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground flex items-center gap-1.5">
                    <FileCheck2 size={14} className="text-purple-400" />
                    Maksimum Doküman Arşivi (Adet)
                  </label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maxDocuments === null}
                      onChange={(e) => setMaxDocuments(e.target.checked ? null : 100)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {maxDocuments === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz Doküman Arşivi
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    value={maxDocuments}
                    onChange={(e) => setMaxDocuments(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                  />
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[15, 50, 100, 300, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMaxDocuments(val)}
                      className="rounded border border-border bg-card hover:border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-white"
                    >
                      {val} Dosya
                    </button>
                  ))}
                </div>
              </div>

              {/* Toplam Depolama Alanı (MB / GB) */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground dark:text-muted-foreground flex items-center gap-1.5">
                    <Database size={14} className="text-purple-400" />
                    Toplam Depolama Kotası (MB)
                  </label>
                  <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storageMaxMb === null}
                      onChange={(e) => setStorageMaxMb(e.target.checked ? null : 1024)}
                      className="rounded border-border bg-card"
                    />
                    Limitsiz
                  </label>
                </div>
                {storageMaxMb === null ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
                    Limitsiz Depolama Alanı
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      min={10}
                      value={storageMaxMb}
                      onChange={(e) => setStorageMaxMb(Math.max(10, Number(e.target.value)))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-white"
                    />
                    <span className="block text-[10px] text-muted-foreground mt-1">
                      Yaklaşık {(storageMaxMb / 1024).toFixed(2)} GB ({Math.round(storageMaxMb * MB).toLocaleString('tr-TR')} byte)
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '250 MB', mb: 250 },
                    { label: '1 GB', mb: 1024 },
                    { label: '5 GB', mb: 5120 },
                    { label: '25 GB', mb: 25600 },
                    { label: '100 GB', mb: 102400 },
                  ].map((item) => (
                    <button
                      key={item.mb}
                      type="button"
                      onClick={() => setStorageMaxMb(item.mb)}
                      className="rounded border border-border bg-card hover:border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SAĞ YAN KOLON (4 SÜTUN) — VİTRİN AYARLARI, CANLI ÖNİZLEME & KAYITLI FİRMALAR */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* VİTRİN & PAZARLAMA AYARLARI */}
          <section className="rounded-2xl border border-indigo-500/25 bg-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye size={16} className="text-indigo-400" />
              Vitrin & Pazarlama Gösterimi
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Gösterim Sırası</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-indigo-600"
                  />
                  Öne Çıkan Paket
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Üst Rozet (`marketingBadge`)</label>
              <input
                type="text"
                maxLength={40}
                value={marketingBadge}
                onChange={(e) => setMarketingBadge(e.target.value)}
                placeholder="Örn: En Çok Tercih Edilen / Pilot"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Vitrin & Kayıt Kartı Açıklaması (`marketingDescription`)
              </label>
              <textarea
                maxLength={280}
                value={marketingDescription}
                onChange={(e) => setMarketingDescription(e.target.value)}
                placeholder="Müşterilerin fiyatlandırma ve kayıt sayfasında göreceği özet açıklama..."
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
              <span className="block text-right text-[10px] text-muted-foreground mt-0.5">
                {marketingDescription.length} / 280
              </span>
            </div>
          </section>

          {/* CANLI VİTRİN & KAYIT KARTI ÖNİZLEMESİ */}
          <section className="rounded-2xl border border-border bg-background p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Canlı Müşteri Kartı Önizlemesi
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  !isActive
                    ? 'bg-red-500/15 text-red-300'
                    : isPublished
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {!isActive ? 'Pasif' : isPublished ? 'Vitrinde Görünür' : 'Vitrinde Gizli'}
              </span>
            </div>

            <div
              className={`rounded-2xl border p-5 space-y-4 transition-all ${
                isFeatured
                  ? 'border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/30'
                  : 'border-zinc-800 bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">{name || 'Paket Adı'}</h3>
                  {marketingDescription && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{marketingDescription}</p>
                  )}
                </div>
                {marketingBadge && (
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 shrink-0">
                    {marketingBadge}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 pt-1">
                {monthlyPrice === 0 ? (
                  <span className="text-2xl font-black text-emerald-400">0 ₺ / Ücretsiz</span>
                ) : (
                  <>
                    <span className="text-2xl font-black text-white">
                      ₺{monthlyPrice.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-xs text-muted-foreground">/ ay + KDV</span>
                  </>
                )}
              </div>

              <ul className="space-y-2 text-xs text-foreground dark:text-muted-foreground border-t border-border pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>{monthlyIfcLimit === null ? 'Sınırsız' : `${monthlyIfcLimit} Adet`}</strong> Aylık IFC 3x3 & e-PYS Analizi (Maks. {ifcMaxFileMb} MB)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>{monthlyPdfLimit === null ? 'Sınırsız' : `${monthlyPdfLimit} Adet`}</strong> RG 33331 PDF/A Rapor Ön Kontrolü
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    {monthlyQuoteLimit === 0 ? (
                      'Sadece Denetim (Teklif Modülü Hariç)'
                    ) : (
                      <>
                        <strong>{monthlyQuoteLimit} Adet</strong> 5D Metraj & Teklif Oluşturma
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>{ifcMaxConcurrent} Eşzamanlı</strong> Kuyruk İşçisi ·{' '}
                    <strong>
                      {storageMaxMb === null
                        ? 'Sınırsız'
                        : storageMaxMb >= 1024
                          ? `${(storageMaxMb / 1024).toFixed(0)} GB`
                          : `${storageMaxMb} MB`}
                    </strong>{' '}
                    Bulut Arşiv
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* BU PAKETİ KULLANAN FİRMALAR LİSTESİ */}
          {!isCreateMode && (
            <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users size={15} className="text-indigo-400" />
                  Bu Paketi Kullanan Firmalar
                </h3>
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-bold text-foreground">
                  {subscriberCount}
                </span>
              </div>

              {subscriberCount === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Şu anda bu pakete tanımlı aktif bir müşteri/firma bulunmuyor.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {subscribers.map((sub) => (
                    <Link
                      key={sub.companyId}
                      to={`/admin/tenants/${sub.companyId}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-background hover:border-indigo-500/40 px-3 py-2 text-xs transition-colors"
                    >
                      <span className="font-semibold text-indigo-300 flex items-center gap-1.5 truncate">
                        <Building2 size={13} className="text-indigo-400 shrink-0" />
                        {sub.companyName}
                      </span>
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        {sub.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
export default PlanEditor;
