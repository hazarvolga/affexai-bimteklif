import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  CreditCard, 
  ShieldCheck,
  Save,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layout,
  Settings as SettingsIcon,
  Zap,
  TrendingUp,
  Briefcase,
  Ruler,
  Scale,
  BookOpen,
  Loader2
} from 'lucide-react';
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { fetchWithAuth } from "@/lib/api";

interface CompanyProfileState {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxOffice: string;
  taxNumber: string;
  defaultCurrency: string;
  defaultVatRate: number;
  countryCode: string;
  measurementSystem: string;
  activeStandard: string;
  classificationSystem: string;
}

const JURISDICTION_PRESETS: Record<string, {
  label: string;
  flag: string;
  currency: string;
  measurement: string;
  standard: string;
  classification: string;
  standardLabel: string;
  classificationLabel: string;
  description: string;
}> = {
  TR: {
    label: "Türkiye (TR)",
    flag: "🇹🇷",
    currency: "TRY",
    measurement: "metric",
    standard: "TBDY_TS500",
    classification: "CSB_TR",
    standardLabel: "TBDY 2018 / TS 500",
    classificationLabel: "ÇŞB Ek-6 Poz Sistemi",
    description: "T.C. ÇŞB poz kütüphanesi, TBDY 2018 / TS 500 betonarme & deprem standardı, Metrik sistem, TRY."
  },
  DE: {
    label: "Almanya / DACH (DE)",
    flag: "🇩🇪",
    currency: "EUR",
    measurement: "metric",
    standard: "EUROCODE_2",
    classification: "DIN_276",
    standardLabel: "Eurocode 2 (EN 1992)",
    classificationLabel: "DIN 276 Maliyet Grupları",
    description: "DIN 276 bina maliyet kırılımı (Kostengruppen), Eurocode 2 (EN 1992) betonarme tasarımı, Metrik, EUR."
  },
  GB: {
    label: "Birleşik Krallık (GB)",
    flag: "🇬🇧",
    currency: "EUR",
    measurement: "metric",
    standard: "EUROCODE_2",
    classification: "NRM2_UK",
    standardLabel: "Eurocode / BS EN 1992",
    classificationLabel: "RICS NRM2 (New Rules of Measurement)",
    description: "RICS NRM2 detaylı metraj ve keşif kuralları, BS EN / Eurocode standartları, Metrik sistem."
  },
  US: {
    label: "Amerika Birleşik Devletleri (US)",
    flag: "🇺🇸",
    currency: "USD",
    measurement: "imperial",
    standard: "ACI_318",
    classification: "CSI_MASTERFORMAT",
    standardLabel: "ACI 318 (Building Code)",
    classificationLabel: "CSI MasterFormat (50 Division)",
    description: "CSI MasterFormat iş kırılımı, ACI 318 yapısal betonarme tasarımı, İmperyal (cu. yd., sq. ft., lbs), USD."
  },
  AE: {
    label: "Körfez / BAE (AE)",
    flag: "🇦🇪",
    currency: "USD",
    measurement: "metric",
    standard: "ACI_318",
    classification: "CSI_MASTERFORMAT",
    standardLabel: "ACI 318 / BS EN Normları",
    classificationLabel: "CSI / FIDIC Formatı",
    description: "Körfez / GCC FIDIC ve CSI sözleşme normları, ACI 318 / BS EN standartları, Metrik sistem, USD."
  }
};

export function Settings() {
  const { company, role } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteDelivery, setInviteDelivery] = useState<{ status: string; devInvitationUrl?: string } | null>(null);
  const canInvite = role === 'owner' || role === 'admin';
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [industriesList, setIndustriesList] = useState<any[]>([]);
  const [companyIndustrySettings, setCompanyIndustrySettings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [riskSettings, setRiskSettings] = useState({ escalationVolatilityPercent: 0, carbonRiskPremiumPercent: 0, informationDeliveryCostPercent: 0 });
  const [calibration, setCalibration] = useState<any>(null);
  const [calibrationReport, setCalibrationReport] = useState<any>(null);

  const [profile, setProfile] = useState<CompanyProfileState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxOffice: "",
    taxNumber: "",
    defaultCurrency: "TRY",
    defaultVatRate: 20,
    countryCode: "TR",
    measurementSystem: "metric",
    activeStandard: "TBDY_TS500",
    classificationSystem: "CSB_TR",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    try {
      const [invRes, indRes, setRes, subRes, usageRes, riskRes, calibrationRes, reportRes, profileRes] = await Promise.all([
        canInvite ? fetchWithAuth("/api/invitations") : Promise.resolve(null),
        fetchWithAuth("/api/ai/industries"),
        fetchWithAuth("/api/company/industry-settings"),
        fetchWithAuth("/api/billing/subscription"),
        fetchWithAuth("/api/usage/report"),
        fetchWithAuth("/api/company/risk-settings"),
        fetchWithAuth("/api/company/risk-calibration"),
        fetchWithAuth("/api/company/risk-calibration/report"),
        fetchWithAuth("/api/company/profile"),
      ]);

      if (invRes?.ok) setInvites(await invRes.json());
      else setInvites([]);
      if (indRes.ok) setIndustriesList(await indRes.json());
      if (setRes.ok) setCompanyIndustrySettings(await setRes.json());
      if (subRes.ok) setSubscription(await subRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      if (riskRes.ok) setRiskSettings(await riskRes.json());
      if (calibrationRes.ok) setCalibration(await calibrationRes.json());
      if (reportRes.ok) setCalibrationReport(await reportRes.json());
      if (profileRes?.ok) {
        const prof = await profileRes.json();
        setProfile({
          name: prof.name || "",
          email: prof.email || "",
          phone: prof.phone || "",
          address: prof.address || "",
          taxOffice: prof.taxOffice || "",
          taxNumber: prof.taxNumber || "",
          defaultCurrency: prof.defaultCurrency || "TRY",
          defaultVatRate: prof.defaultVatRate ?? 20,
          countryCode: prof.countryCode || "TR",
          measurementSystem: prof.measurementSystem || "metric",
          activeStandard: prof.activeStandard || "TBDY_TS500",
          classificationSystem: prof.classificationSystem || "CSB_TR",
        });
      }
    } catch (e) {
      toast.error("Veriler yüklenemedi.");
    }
  };

  const handleCountryChange = (newCountry: string) => {
    const preset = JURISDICTION_PRESETS[newCountry];
    if (preset) {
      setProfile(prev => ({
        ...prev,
        countryCode: newCountry,
        defaultCurrency: preset.currency,
        measurementSystem: preset.measurement,
        activeStandard: preset.standard,
        classificationSystem: preset.classification,
      }));
      toast.info(`${preset.label} standartları (${preset.standardLabel} & ${preset.classificationLabel}) varsayılan olarak seçildi.`);
    } else {
      setProfile(prev => ({ ...prev, countryCode: newCountry }));
    }
  };

  const saveCompanyProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetchWithAuth('/api/company/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile({
          name: updated.name || "",
          email: updated.email || "",
          phone: updated.phone || "",
          address: updated.address || "",
          taxOffice: updated.taxOffice || "",
          taxNumber: updated.taxNumber || "",
          defaultCurrency: updated.defaultCurrency || "TRY",
          defaultVatRate: updated.defaultVatRate ?? 20,
          countryCode: updated.countryCode || "TR",
          measurementSystem: updated.measurementSystem || "metric",
          activeStandard: updated.activeStandard || "TBDY_TS500",
          classificationSystem: updated.classificationSystem || "CSB_TR",
        });
        toast.success("Şirket profili ve uluslararası standartlar kaydedildi.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Şirket profili kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatası: profil kaydedilemedi.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveRiskSettings = async () => {
    const res = await fetchWithAuth('/api/company/risk-settings', { method: 'POST', body: JSON.stringify(riskSettings) });
    if (res.ok) toast.success('Teklif risk varsayımları kaydedildi.');
    else toast.error('Risk varsayımları kaydedilemedi.');
  };

  const industryEnabled = (id: string) => {
    const setting = companyIndustrySettings.find(s => s.industryId === id);
    return setting ? setting.isEnabled : true;
  };

  const toggleIndustry = async (id: string) => {
    const currentlyEnabled = industryEnabled(id);
    const newStatus = !currentlyEnabled;

    try {
      await fetchWithAuth("/api/company/industry-settings", {
        method: "POST",
        body: JSON.stringify({ industryId: id, isEnabled: newStatus })
      });
      fetchData();
      toast.success(`${id} başarıyla ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
    } catch (e) {
      toast.error("Ayarlar güncellenemedi.");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLoading(true);
    setInviteDelivery(null);
    try {
      const res = await fetchWithAuth("/api/invitations", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        const result = await res.json();
        setInviteDelivery(result.delivery);
        setInviteEmail("");
        fetchData();
      } else {
        toast.error("Davetiye oluşturulamadı.");
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const res = await fetchWithAuth('/api/billing/upgrade', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        toast.success(`Plan ${plan} olarak güncellendi.`);
        fetchData();
      }
    } catch (e) {
      toast.error("Yükseltme başarısız.");
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Sistem Ayarları" 
        description="Şirket profili, ekip yönetimi ve uygulama tercihlerini yapılandırın."
        icon={SettingsIcon}
        actions={
          <Button 
            onClick={saveCompanyProfile}
            disabled={savingProfile || !canInvite}
            className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-10 px-6 gap-2 shadow-lg shadow-orange-900/20"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Değişiklikleri Kaydet
          </Button>
        }
      />

      <Tabs defaultValue="company" className="space-y-8">
        <TabsList className="bg-card border border-border p-1 w-full md:w-auto h-12 inline-flex">
          <TabsTrigger value="company" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-muted-foreground font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Building2 size={14} className="mr-2" /> ŞİRKET
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-muted-foreground font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Users size={14} className="mr-2" /> EKİP
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-muted-foreground font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <CreditCard size={14} className="mr-2" /> ABONELİK
          </TabsTrigger>
          <TabsTrigger value="industries" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-muted-foreground font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Layout size={14} className="mr-2" /> EKLENTİLER
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Genel Şirket Bilgileri" description="Resmi yazışmalarda ve teklif başlıklarında görünecek doğrulanmış şirket bilgileri.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resmi Şirket Ünvanı</Label>
                    <Input 
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Örn: Atlas Yapı İnşaat A.Ş."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">İletişim E-posta</Label>
                    <Input 
                      type="email"
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@sirketiniz.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Telefon</Label>
                    <Input 
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+90 212 000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Merkez Ofis Adresi</Label>
                    <Input 
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.address}
                      onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Şirket tebligat adresi"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Mali ve Vergi Bilgileri" description="Teklif ve fatura oluştururken esas alınacak yasal mali parametreler.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vergi Dairesi</Label>
                    <Input 
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.taxOffice}
                      onChange={(e) => setProfile(prev => ({ ...prev, taxOffice: e.target.value }))}
                      placeholder="Vergi Dairesi Adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vergi Numarası</Label>
                    <Input 
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.taxNumber}
                      onChange={(e) => setProfile(prev => ({ ...prev, taxNumber: e.target.value }))}
                      placeholder="10 Haneli VKN / TC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Varsayılan Para Birimi</Label>
                    <select
                      aria-label="Varsayılan Para Birimi"
                      value={profile.defaultCurrency}
                      onChange={(e) => setProfile(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                      className="w-full h-12 rounded-md border border-border bg-background px-3 text-foreground font-bold"
                    >
                      <option value="TRY">Türk Lirası (₺ - TRY)</option>
                      <option value="USD">Amerikan Doları ($ - USD)</option>
                      <option value="EUR">Euro (€ - EUR)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Varsayılan KDV Oranı (%)</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      className="h-12 bg-background border-border text-foreground font-bold" 
                      value={profile.defaultVatRate}
                      onChange={(e) => setProfile(prev => ({ ...prev, defaultVatRate: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper 
            title="Bölge & Uluslararası Standartlar" 
            description="Şirketin bölge ve teknik standart tercihlerini kaydedin. Uygulanan hesaplama kapsamını aşağıda kontrol edin."
          >
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-black tracking-widest">
                    <Globe size={12} className="mr-1.5" /> ÇOKLU BÖLGE VE STANDART YÖNETİMİ
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Bu tercihler şirket profilinde saklanır; otomatik standart uygunluğu sağlamaz.
                  </span>
                </div>

                <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
                  IFC miktarları kaynak birimleri okunarak metrik birimlere dönüştürülür. Bölge seçimi
                  henüz poz kütüphanesini, teklif birimlerini veya betonarme tasarım formüllerini değiştirmez.
                  TBDY/TS 500, Eurocode 2 ve ACI 318 için mühendislik uygunluk hesabı çalıştırılmaz.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* 1. Jurisdiction / Country */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Globe size={12} className="text-orange-400" /> Ülke / Hukuki Bölge
                    </Label>
                    <select
                      aria-label="Ülke / Hukuki Bölge"
                      value={profile.countryCode}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full h-12 rounded-md border border-border bg-background px-3 text-foreground font-bold text-sm"
                    >
                      <option value="TR">🇹🇷 Türkiye (TR)</option>
                      <option value="DE">🇩🇪 Almanya / DACH (DE)</option>
                      <option value="GB">🇬🇧 Birleşik Krallık (GB)</option>
                      <option value="US">🇺🇸 Amerika Birleşik Devletleri (US)</option>
                      <option value="AE">🇦🇪 Körfez / BAE (AE)</option>
                    </select>
                  </div>

                  {/* 2. Measurement System */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Ruler size={12} className="text-blue-400" /> Birim Sistemi
                    </Label>
                    <select
                      aria-label="Birim Sistemi"
                      value={profile.measurementSystem}
                      onChange={(e) => setProfile(prev => ({ ...prev, measurementSystem: e.target.value }))}
                      className="w-full h-12 rounded-md border border-border bg-background px-3 text-foreground font-bold text-sm"
                    >
                      <option value="metric">Metrik (m³, m², m, kg, ton, mm)</option>
                      <option value="imperial">İmperyal (cu. yd., sq. ft., lf, lbs, in)</option>
                    </select>
                  </div>

                  {/* 3. Structural Standard */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Scale size={12} className="text-emerald-400" /> Hesap & Tasarım Standardı
                    </Label>
                    <select
                      aria-label="Tasarım Standardı"
                      value={profile.activeStandard}
                      onChange={(e) => setProfile(prev => ({ ...prev, activeStandard: e.target.value }))}
                      className="w-full h-12 rounded-md border border-border bg-background px-3 text-foreground font-bold text-sm"
                    >
                      <option value="TBDY_TS500">TBDY 2018 / TS 500 (Türkiye Deprem & Betonarme)</option>
                      <option value="EUROCODE_2">Eurocode 2 / EN 1992 (Avrupa Betonarme Standardı)</option>
                      <option value="ACI_318">ACI 318 (Amerikan Beton Enstitüsü Standardı)</option>
                    </select>
                  </div>

                  {/* 4. Classification System */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={12} className="text-amber-400" /> Poz & Sınıflandırma
                    </Label>
                    <select
                      aria-label="Poz & Sınıflandırma Sistemi"
                      value={profile.classificationSystem}
                      onChange={(e) => setProfile(prev => ({ ...prev, classificationSystem: e.target.value }))}
                      className="w-full h-12 rounded-md border border-border bg-background px-3 text-foreground font-bold text-sm"
                    >
                      <option value="CSB_TR">ÇŞB Ek-6 Poz Sistemi (T.C. Çevre ve Şehircilik)</option>
                      <option value="DIN_276">DIN 276 (Alman Yapı Maliyet Grupları - KG 300/400)</option>
                      <option value="CSI_MASTERFORMAT">CSI MasterFormat (Kuzey Amerika 50 Division)</option>
                      <option value="NRM2_UK">RICS NRM2 (Birleşik Krallık Keşif & Metraj)</option>
                    </select>
                  </div>
                </div>

                {/* Preset detail callout */}
                {JURISDICTION_PRESETS[profile.countryCode] && (
                  <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{JURISDICTION_PRESETS[profile.countryCode].flag}</span>
                      <span className="text-xs font-bold text-foreground">
                        {JURISDICTION_PRESETS[profile.countryCode].label} — Aktif Kural ve Standart Profili
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {JURISDICTION_PRESETS[profile.countryCode].description}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <Button 
                    onClick={saveCompanyProfile} 
                    disabled={savingProfile || !canInvite}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] uppercase tracking-widest px-6 h-12 gap-2 shadow-lg shadow-orange-950/40"
                  >
                    {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Şirket ve Bölge Standartlarını Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Teklif Risk Varsayımları" description="Yeni tekliflerde kullanılacak şirket varsayımları. Bu değerler piyasa veya mevzuat doğrulaması değildir.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {([['escalationVolatilityPercent', 'Aylık eskalasyon %'], ['carbonRiskPremiumPercent', 'Karbon risk primi %'], ['informationDeliveryCostPercent', 'Bilgi teslim maliyeti %']] as const).map(([key, label]) => (
                    <div className="space-y-2" key={key}>
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={riskSettings[key]} onChange={(event) => setRiskSettings({ ...riskSettings, [key]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className="h-12 bg-background border-border font-mono" />
                    </div>
                  ))}
                </div>
                <Button onClick={saveRiskSettings} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest"><Save size={16} className="mr-2" /> Varsayımları Kaydet</Button>
              </CardContent>
            </Card>
          </SectionWrapper>
          {calibration && (
            <SectionWrapper title="Kalibrasyon Hazırlığı" description="Sistem katsayıları yalnızca yeterli gerçek teklif verisi oluştuğunda gözden geçirilmeye hazır kabul edilir.">
              <Card className="bg-card border-border shadow-none">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {[["Teklif", calibration.quoteCount], ["Maliyetli kalem", calibration.pricedItemCount], ["Finans raporu", calibration.financialReportCount], ["Gerçekleşen gözlem", calibration.observedQuoteCount]].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-background p-3"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg text-foreground">{value}</p></div>)}
                  </div>
                  <div className={cn("rounded-lg border p-3 text-xs", calibration.readyForCalibration ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300")}>{calibration.message}</div>
                </CardContent>
              </Card>
            </SectionWrapper>
          )}
          {calibrationReport && (
            <SectionWrapper title="Kalibrasyon Raporu" description="Planlanan ve gerçekleşen sonuçlar arasındaki sapma. Otomatik katsayı değişikliği yapılmaz.">
              <Card className="bg-card border-border shadow-none"><CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-background p-3"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gözlem</p><p className="mt-1 font-mono text-lg text-foreground">{calibrationReport.observationCount}</p></div>
                  <div className="rounded-lg border border-border bg-background p-3"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Maliyet sapması</p><p className="mt-1 font-mono text-lg text-foreground">{calibrationReport.costBiasPercent == null ? '—' : `%${calibrationReport.costBiasPercent.toFixed(1)}`}</p></div>
                  <div className="rounded-lg border border-border bg-background p-3"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Süre sapması</p><p className="mt-1 font-mono text-lg text-foreground">{calibrationReport.durationBiasPercent == null ? '—' : `%${calibrationReport.durationBiasPercent.toFixed(1)}`}</p></div>
                </div>
                <p className="text-xs text-muted-foreground">{calibrationReport.recommendation}</p>
              </CardContent></Card>
            </SectionWrapper>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Ekip ve Yetkilendirme" description="Sistemi kullanacak ekip üyelerini davet edin ve yönetin.">
            <Card className="bg-card border-border shadow-none">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Yeni Üye Davet Et</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {canInvite ? <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <Input 
                      aria-label="Davet e-posta adresi"
                      required
                      type="email"
                      placeholder="davet@e-posta.com" 
                      className="h-12 bg-background border-border text-foreground font-bold"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select aria-label="Davet rolü" value={inviteRole} onChange={event => setInviteRole(event.target.value)} className="h-12 max-w-full rounded-md border border-border bg-background px-3 text-foreground">
                    <option value="viewer">Görüntüleyici</option><option value="manager">Yönetici</option><option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={loading} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-12 px-8 gap-2">
                    <UserPlus size={18} /> Davet Gönder
                  </Button>
                </form> : <p className="text-sm text-muted-foreground">Davet yönetimi yalnızca şirket sahibi ve adminlere açıktır.</p>}
                {inviteDelivery && <div role="status" className="text-sm text-foreground dark:text-muted-foreground break-words">
                  {inviteDelivery.status === 'accepted' ? 'E-posta hizmeti daveti kabul etti. Gelen kutusuna teslim henüz doğrulanmadı.'
                    : inviteDelivery.status === 'development' ? 'Geliştirme bağlantısı oluşturuldu; e-posta gönderilmedi.'
                    : 'E-posta teslimi başlatılamadı. Bağlantı iptal edildi; yeniden davet oluşturun.'}
                  {inviteDelivery.devInvitationUrl && <a className="block underline break-all mt-2" href={inviteDelivery.devInvitationUrl}>Geliştirme davetini aç</a>}
                </div>}

                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} className="text-orange-500" /> Davetiyeler
                  </Label>
                  <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                    {invites.filter(invite => !invite.acceptedAt).length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic">
                        Henüz aktif bir davetiye bulunmuyor.
                      </div>
                    ) : (
                      invites.filter(i => !i.acceptedAt).map((invite) => (
                        <div key={invite.id} className="p-6 flex flex-wrap gap-3 items-center justify-between bg-card group hover:bg-zinc-900/30 transition-colors">
                          <div className="flex min-w-0 items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                              <Mail size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-foreground break-all">{invite.email}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge className="bg-surface-elevated text-muted-foreground border-none font-black text-[9px] px-2 py-0">ROLE: {invite.role.toUpperCase()}</Badge>
                                <span className="text-[10px] text-muted-foreground">{invite.status === 'reissue_required' ? 'Eski bağlantı: yeniden davet gerekli' : invite.status === 'expired' ? 'Süresi doldu' : 'Kabul bekleniyor'} · {new Date(invite.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-surface-elevated text-muted-foreground hover:text-white font-black text-[10px] uppercase tracking-widest h-9 px-4 gap-2"
                            onClick={() => { setInviteEmail(invite.email); setInviteRole(['admin', 'manager', 'viewer'].includes(invite.role) ? invite.role : 'viewer'); }}
                          >
                            <UserPlus size={14} /> Yeniden Davet
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </TabsContent>

        <TabsContent value="billing" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card border-border shadow-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/20 transition-all duration-700"></div>
              <CardHeader className="border-b border-border bg-card">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mevcut Abonelik Planı</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">{subscription?.plan || 'Starter'}</h3>
                    <p className="text-muted-foreground text-xs font-bold mt-1 uppercase tracking-widest italic">Aylık faturalandırma</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[10px] px-3 py-1">AKTİF & ÖDENMİŞ</Badge>
                </div>
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    Teklif Zekası Modülü (Sınırsız)
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    PDF & Doküman Üretimi
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    Ekip İşbirliği (3 Kullanıcı)
                  </div>
                </div>
                <Button className="w-full bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-12 shadow-lg shadow-orange-900/20" onClick={() => handleUpgrade('pro')}>
                  PLANI YÜKSELT & ÖZELLİKLERİ AÇ
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none">
              <CardHeader className="border-b border-border bg-card">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bu Ayki Kullanım Kotası</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {usage.length > 0 ? usage.map((u: any) => (
                  <div key={u.feature} className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">{u.feature.replace('_', ' ')}</span>
                      <span className="text-foreground">{u.count} / {u.limit || '∞'}</span>
                    </div>
                    <div className="h-2 bg-surface-elevated rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (u.count / (u.limit || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic">
                    Kullanım verisi yükleniyor...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="industries" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Sektörel Uyumluluk Modülleri" description="TeklifPro AI'nın hangi uzmanlık alanlarında akıllı teklif asistanlığı yapacağını seçin.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {industriesList.map((industry: any) => (
                    <div key={industry.id} className="flex items-center justify-between p-6 rounded-2xl border border-border bg-card group hover:border-orange-500/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all",
                          industryEnabled(industry.id) 
                            ? "bg-orange-600/10 border-orange-500/20 text-orange-500 scale-105" 
                            : "bg-surface-elevated border-border text-muted-foreground"
                        )}>
                          <Briefcase size={22} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground uppercase tracking-tight">{industry.name}</span>
                          <span className="text-[10px] text-muted-foreground font-bold mt-0.5 line-clamp-1 italic uppercase tracking-tighter">{industry.description}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant={industryEnabled(industry.id) ? "default" : "outline"}
                        className={cn(
                          "text-[9px] h-8 px-4 font-black uppercase tracking-widest transition-all",
                          industryEnabled(industry.id) 
                            ? "bg-orange-700 hover:bg-orange-800 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]" 
                            : "border-border text-muted-foreground hover:bg-zinc-800 hover:text-zinc-400"
                        )}
                        onClick={() => toggleIndustry(industry.id)}
                      >
                        {industryEnabled(industry.id) ? "AKTİF" : "ETKİNLEŞTİR"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
