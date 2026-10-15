/**
 * Quota-free interactive sample projects for /app/smartcheck and engineering acceptance evidence.
 * Generated directly from the live Python engines (epys_preflight.py, ifc_extract.py, pdf_preflight.py)
 * aligned with RG 33331 final Ministry PDFs (#1.pdf, #2.pdf, EKLER.pdf).
 */

export type SmartCheckSampleProjectId =
  | "mm-mimari-tablo-9-1"
  | "st-statik-tablo-9-2"
  | "pdfa-pafta-iso216";

export type SampleProjectId = SmartCheckSampleProjectId;

export interface SmartCheckSampleRowSeed {
  sheetName: string;
  sourceRowNumber: number;
  sourceCellRange: string;
  rawPositionCode: string;
  rawDescription: string;
  rawUnit: string;
  rawQuantity: string;
  rawPrice: string;
  rawWastePercent: string;
  formulaJson: Record<string, string>;
  normalizedPositionCode: string;
  normalizedDescription: string;
  normalizedUnit: string;
  normalizedQuantity: string;
  normalizedPrice: string | null;
  normalizedWastePercent: string;
  mappingConfidence: string;
  findingsJson: Array<{
    code: string;
    severity?: string;
    message: string;
    ruleVersion: string;
    suggestion: string;
  }>;
}

export interface SmartCheckSampleProjectDefinition {
  id: SmartCheckSampleProjectId;
  label: string;
  shortBadge: string;
  description: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  artifactType: "epys_preflight" | "pdf_preflight";
  artifactPayload: Record<string, unknown>;
  rows: SmartCheckSampleRowSeed[];
}

export const SMARTCHECK_SAMPLE_PROJECTS: Record<
  SmartCheckSampleProjectId,
  SmartCheckSampleProjectDefinition
> = {
  "mm-mimari-tablo-9-1": {
    id: "mm-mimari-tablo-9-1",
    label: "Örnek Mimari Ruhsat & 5D Modeli (MM · EK-9 Tablo 9.1)",
    shortBadge: "MM · Tablo 9.1 (21 Satır)",
    description:
      "Mimari disiplin (MM) IFC4X3_ADD2 modeli: EK-9 Tablo 9.1 (21 satır), EK-7 Tablo 7.9 IfcAnnotation (SURVEY), IfcSpace mahal (K00_DAI_001/002), TREpys_EmsalOzellikSeti (DAHIL 300 m²) ve ALLPLAN IfcCovering kaplama metrajı (32,50 m²).",
    fileName: "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc",
    mimeType: "model/ifc",
    fileSizeBytes: 14585,
    checksumSha256: "d2195a87ebb13f839d6ee3f5229bf58f01df06c8ce7e65597e51f68056af0467",
    artifactType: "epys_preflight",
    artifactPayload: {
    "schemaVersion": 1,
    "kind": "epys_preflight",
    "ruleSource": {
        "regulation": {
            "ad": "Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik",
            "resmiGazete": "5.8.2026, sayı 33331",
            "yururluk": "2027-09-01",
            "metin": "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2.htm",
            "ekler": "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2-1.pdf"
        },
        "engine": {
            "name": "ifc-ruhsat",
            "version": "0.2.1",
            "upstreamCommit": "cd6d3ce"
        },
        "dataVerification": "Upstream visual verification of the scanned RG 33331 annex PDF (2026-09-17, page numbers in each table). BIMMetraj full annex verification 2026-10-15 against official ministry files #1.pdf, #2.pdf and EKLER.pdf / 20260805-2-1.pdf (SHA-256 7dc88971d3a7a8ae837ef148169fa5bf6c9ce7a01cc8fcd560ae3d342bb0ecb3): EK-1..EK-9 including Tablo 6.55, Tablo 6.60, Tablo 7.8–7.9, Tablo 9.1 (21 rows, MM) and Tablo 9.2 (16 rows, non-MM disciplines)."
    },
    "model": {
        "fileName": "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc",
        "schema": "IFC4X3",
        "sizeBytes": 14585,
        "discipline": "MM"
    },
    "summary": {
        "hata": 0,
        "uyari": 0,
        "bilgi": 19,
        "elle": 5
    },
    "ek9Table": {
        "tablo": "9.1",
        "baslik": "Tablo 9.1 Model Kalite Kontrol Formu (Mimari disiplin için)",
        "disiplin": "MM",
        "disiplinAdi": "Mimari",
        "satirSayisi": 21
    },
    "ek9": [
        {
            "no": 1,
            "kaynakNo": 1,
            "bolum": "GENEL KONTROL",
            "kategori": "Genel",
            "baslik": "Dosya Boyutu",
            "soru": "Dosya boyutu, Bakanlıkça belirlenen kısıtlamalara uygun mu?",
            "karar": "Elle",
            "elleNotu": "Bakanlığın dosya boyutu sınırı henüz yayımlanmadı; dosya 14 KB, karar idarenin.",
            "bulgu": 0
        },
        {
            "no": 2,
            "kaynakNo": 2,
            "bolum": "GENEL KONTROL",
            "kategori": "Genel",
            "baslik": "Proje Bilgileri",
            "soru": "Proje bilgileri Yönetmeliğin 13 üncü maddesinde belirtilen esaslara göre dolduruldu mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 3,
            "kaynakNo": 3,
            "bolum": "İSİMLENDİRME",
            "kategori": "Genel",
            "baslik": "Proje ve Dosya İsimlendirmesi",
            "soru": "Proje ve dosya isimlendirmesi Yönetmeliğin 6 ncı maddesine uygun mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 4,
            "kaynakNo": 4,
            "bolum": "İSİMLENDİRME",
            "kategori": "Mimari",
            "baslik": "Mahal No ve Mahal İsmi",
            "soru": "Mahal numaraları ve mahal isimlendirmesi Yönetmeliğin 10 uncu maddesine uygun mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 5,
            "kaynakNo": 5,
            "bolum": "İSİMLENDİRME",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Varlıkların isimlendirmesi Yönetmeliğin 11 inci maddesine uygun mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 6,
            "kaynakNo": 6,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "Koordinat Sistemi",
            "soru": "Model doğru koordinat sisteminde konumlandırıldı mı? Bu koordinat verileri Yönetmeliğin 13 üncü maddesinde verilen ilgili proje özniteliklerini kullanılarak atandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 7,
            "kaynakNo": 7,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "Gelişim seviyesi",
            "soru": "Modelde yer alan varlıklar Yönetmeliğin 14 üncü maddesinde verilen gelişim seviyesine uygun olarak modellendi mi?",
            "karar": "Elle",
            "elleNotu": "Gelişim seviyesi (LOD 300) geometrinin ayrıntısına bakılarak elle değerlendirilir.",
            "bulgu": 0
        },
        {
            "no": 8,
            "kaynakNo": 8,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Modelde yer alan varlıklar Yönetmeliğin 12 inci maddesinde tanımlanan \"Zorunlu IFC Sınıfları\" listesindeki doğru sınıflar kullanılarak tanımlandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 9,
            "kaynakNo": 9,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Yönetmeliğin 13 üncü maddesinde belirtilen projedeki mevcut \"Zorunlu IFC Sınıfları\" için zorunlu öznitelikler ve özellikler tanımlandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 10,
            "kaynakNo": 10,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "Emsal hesabı",
            "soru": "Mahal (IfcSpace) ve Mekansal Zon (IfcSpatialZone) alanları emsal hesap tablolarıyla uyumlu mu?",
            "karar": "Kısmen (elle tamamlanacak)",
            "elleNotu": "Hesaplanan toplamlar projedeki emsal hesap tablosuyla (pafta) karşılaştırılmalı.",
            "bulgu": 0
        },
        {
            "no": 11,
            "kaynakNo": 11,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Modelde \"Proje\", \"Saha\", \"Bina\" ve en az bir \"Bina Katı\" ile ilgili IFC Sınıfları bulunuyor mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 12,
            "kaynakNo": 12,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Mimari",
            "baslik": "Mahal",
            "soru": "Mimari modelde \"Mahal\" (IfcSpace) IFC Kategorisi yer alıyor mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 13,
            "kaynakNo": 13,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Mimari",
            "baslik": "Mahal",
            "soru": "Mahaller diğer mahallerle örtüşmeyecek şekilde ve doğru katta modellendi mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 14,
            "kaynakNo": 14,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Mimari",
            "baslik": "Mahal",
            "soru": "Mahaller kapalı olarak ve üst sınırları doğru tanımlandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 15,
            "kaynakNo": 15,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Varlıklar doğru katta veya doğru kotta modellendi mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 16,
            "kaynakNo": 16,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Modelden yinelenen varlıklar kaldırıldı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 17,
            "kaynakNo": 17,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Model IFC'ye uygun olarak oluşturuldu mu (IfcWall, IfcSlab, IfcWindow vb. sınıflar doğru atandı mı)?",
            "karar": "Elle",
            "elleNotu": "Sınıfın doğru seçilip seçilmediği (bir döşemenin IfcSlab, duvarın IfcWall olması) geometriden anlaşılmaz; model görünümünde göz kontrolü gerekir.",
            "bulgu": 0
        },
        {
            "no": 18,
            "kaynakNo": 18,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "IFC Versiyonu",
            "soru": "Model dosyası, teslime ilişkin kısıtlamalarda tanımlanan IFC versiyonunda teslim edildi mi? Dosya uzantısı IFC mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 19,
            "kaynakNo": 19,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "Ön Tanımlı Tip",
            "soru": "Varlıklar IFC'de doğru Ön Tanımlı Tip (Predefined Type) kullanılarak temsil edildi mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 20,
            "kaynakNo": 20,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "Özellikler",
            "soru": "Özellikler doğru P_set'ler altında listelendi mi?",
            "karar": "Elle",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 21,
            "kaynakNo": 21,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "PDF ve IFC uyumu",
            "soru": "Teslim edilen PDF paftaları BIM modelinden üretildi mi?",
            "karar": "Elle",
            "elleNotu": "PDF paftaların modelden üretildiği yalnızca teslim sürecinden anlaşılır.",
            "bulgu": 0
        }
    ],
    "findings": [
        {
            "kod": "elle-1",
            "seviye": "elle",
            "mesaj": "Bakanlığın dosya boyutu sınırı henüz yayımlanmadı; dosya 14 KB, karar idarenin.",
            "madde": "EK-9 madde 1",
            "ek9": 1,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek7",
            "seviye": "bilgi",
            "mesaj": "Proje bilgileri (EK-7) tanımlı.",
            "madde": "m.13, EK-7",
            "ek9": 2,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "dosya-adi",
            "seviye": "bilgi",
            "mesaj": "Dosya adı EK-2 şablonunun dokuz alanına ve alt disiplin/tür/tip/kat sözlüklerine uyuyor.",
            "madde": "m.6, EK-2 Tablo 2.1–2.14",
            "ek9": 3,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-no",
            "seviye": "bilgi",
            "mesaj": "Mahal numaraları ve isimleri EK-3 Tablo 3.1 ve Tablo 3.2'ye uygun.",
            "madde": "m.10, EK-3",
            "ek9": 4,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "isim",
            "seviye": "bilgi",
            "mesaj": "Varlık adları EK-5 şablonuna uygun.",
            "madde": "m.11, EK-5 5.5",
            "ek9": 5,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "koordinat",
            "seviye": "bilgi",
            "mesaj": "Koordinat sistemi EPSG:5256; harita dönüşümü tanımlı.",
            "madde": "EK-7 Tablo 7.6–7.8",
            "ek9": 6,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "elle-7",
            "seviye": "elle",
            "mesaj": "Gelişim seviyesi (LOD 300) geometrinin ayrıntısına bakılarak elle değerlendirilir.",
            "madde": "EK-9 madde 7",
            "ek9": 7,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "sinif",
            "seviye": "bilgi",
            "mesaj": "11 varlığın tümü EK-5 listelerindeki sınıflarda (9 farklı sınıf).",
            "madde": "m.12, EK-5",
            "ek9": 8,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek6-kapsam",
            "seviye": "bilgi",
            "mesaj": "Modelde bulunan 1 zorunlu sınıfın EK-6 tablosu bu sürümde henüz kodlanmadı, yalnızca İsim denetlendi: IfcProject. (KAYNAKLAR.md)",
            "madde": "EK-6",
            "ek9": 9,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek6",
            "seviye": "bilgi",
            "mesaj": "Kodlanmış 68 EK-6 tablosundaki zorunlu öznitelik ve özellikler tam.",
            "madde": "m.13, EK-6",
            "ek9": 9,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-tablo",
            "seviye": "elle",
            "mesaj": "Hesaplanan toplamlar projedeki emsal hesap tablosuyla (pafta) karşılaştırılmalı.",
            "madde": "EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-toplam",
            "seviye": "bilgi",
            "mesaj": "Emsal alanları — DAHIL: 300.00 m².",
            "madde": "EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-kaks",
            "seviye": "bilgi",
            "mesaj": "Emsale dahil alan 300.00 m²; KAKS 1.5 × parsel 1,000.00 m² = 1,500.00 m² sınırının içinde.",
            "madde": "EK-6 Tablo 6.55, EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "iskelet",
            "seviye": "bilgi",
            "mesaj": "Proje, Saha, Bina ve 2 kat mevcut.",
            "madde": "EK-9 madde 11",
            "ek9": 11,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-var",
            "seviye": "bilgi",
            "mesaj": "2 mahal (IfcSpace) tanımlı.",
            "madde": "EK-9 madde 12",
            "ek9": 12,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-ortusme",
            "seviye": "bilgi",
            "mesaj": "Aynı kattaki mahaller örtüşmüyor (sınır kutusu kontrolü).",
            "madde": "EK-9 madde 13",
            "ek9": 13,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-govde",
            "seviye": "bilgi",
            "mesaj": "Her mahalin hacimli bir 3B gövdesi var.",
            "madde": "EK-9 madde 14",
            "ek9": 14,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "kat-bagi",
            "seviye": "bilgi",
            "mesaj": "Her yapı elemanı bir kata bağlı.",
            "madde": "EK-9 madde 15",
            "ek9": 15,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "kat-kotu",
            "seviye": "bilgi",
            "mesaj": "Elemanların yerleşim kotları bağlı oldukları katın aralığında.",
            "madde": "EK-9 madde 15",
            "ek9": 15,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "yinelenen",
            "seviye": "bilgi",
            "mesaj": "Yinelenen GlobalId ya da üst üste eleman yok.",
            "madde": "EK-9 madde 16",
            "ek9": 16,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "sinif-anlam",
            "seviye": "elle",
            "mesaj": "Sınıfın doğru seçilip seçilmediği (bir döşemenin IfcSlab, duvarın IfcWall olması) geometriden anlaşılmaz; model görünümünde göz kontrolü gerekir.",
            "madde": "EK-9 madde 17",
            "ek9": 17,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "surum",
            "seviye": "bilgi",
            "mesaj": "Şema IFC4X3 — IFC 4.3.",
            "madde": "m.4(5), EK-5 5.4",
            "ek9": 18,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "on-tanimli-tip",
            "seviye": "bilgi",
            "mesaj": "Ön Tanımlı Tipler atanmış.",
            "madde": "EK-9 madde 19",
            "ek9": 19,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "elle-21",
            "seviye": "elle",
            "mesaj": "PDF paftaların modelden üretildiği yalnızca teslim sürecinden anlaşılır.",
            "madde": "EK-9 madde 21",
            "ek9": 21,
            "varliklar": [],
            "sayi": null
        }
    ],
    "disclaimer": "Otomatik ön kontroldür; resmî uygunluk kararı değildir. Değerlendirme e-PYS ve ilgili idareye, beyanın doğruluğu proje müellifine aittir (Elektronik Teslim Yönetmeliği m.5)."
},
    rows: [
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 1,
        sourceCellRange: "#110/3uac13C5DBGxgg$8c7VihU",
        rawPositionCode: "15.150.1005",
        rawDescription: "IfcSlab · MM-DSM-zemin (Zemin Kat Betonarme Döşeme — Beton_C25)",
        rawUnit: "m3",
        rawQuantity: "6.40",
        rawPrice: "",
        rawWastePercent: "3",
        formulaJson: {
          qtoPath: "#242/#239/#240:Qto_SlabBaseQuantities/NetVolume",
          pozPath: "#245/#243/#244:TREpys_PozOzellikSeti/PozNo",
        },
        normalizedPositionCode: "15.150.1005",
        normalizedDescription: "IfcSlab · MM-DSM-zemin (Zemin Kat Betonarme Döşeme — Beton_C25)",
        normalizedUnit: "m3",
        normalizedQuantity: "6.40",
        normalizedPrice: null,
        normalizedWastePercent: "3",
        mappingConfidence: "0.95",
        findingsJson: [],
      },
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 2,
        sourceCellRange: "#87/3jr0a2ceT4TfZ6rAkGozeS",
        rawPositionCode: "15.150.1005",
        rawDescription: "IfcWall · MM-DVR-dis_20cm (Dış Duvar/Perde 20 cm — Beton_C25)",
        rawUnit: "m3",
        rawQuantity: "4.80",
        rawPrice: "",
        rawWastePercent: "3",
        formulaJson: {
          qtoPath: "#248/#246/#247:Qto_WallBaseQuantities/NetVolume",
          pozPath: "#245/#243/#244:TREpys_PozOzellikSeti/PozNo",
        },
        normalizedPositionCode: "15.150.1005",
        normalizedDescription: "IfcWall · MM-DVR-dis_20cm (Dış Duvar/Perde 20 cm — Beton_C25)",
        normalizedUnit: "m3",
        normalizedQuantity: "4.80",
        normalizedPrice: null,
        normalizedWastePercent: "3",
        mappingConfidence: "0.95",
        findingsJson: [],
      },
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 3,
        sourceCellRange: "#231/3bC4dE5fG6hI7jK8lM9nO0",
        rawPositionCode: "15.390.1002",
        rawDescription: "IfcCovering · MM-KPL-seramik_zemin (Mahal Zemin Seramik Kaplama — Seramik_A1)",
        rawUnit: "m2",
        rawQuantity: "32.50",
        rawPrice: "",
        rawWastePercent: "5",
        formulaJson: {
          qtoPath: "#235/#232/#233:Qto_CoveringBaseQuantities/NetArea",
          pozPath: "#238/#236/#237:TREpys_PozOzellikSeti/PozNo",
        },
        normalizedPositionCode: "15.390.1002",
        normalizedDescription: "IfcCovering · MM-KPL-seramik_zemin (Mahal Zemin Seramik Kaplama — Seramik_A1)",
        normalizedUnit: "m2",
        normalizedQuantity: "32.50",
        normalizedPrice: null,
        normalizedWastePercent: "5",
        mappingConfidence: "0.95",
        findingsJson: [],
      },
    ],
  },
  "st-statik-tablo-9-2": {
    id: "st-statik-tablo-9-2",
    label: "Örnek Statik Betonarme & 3×3 Modeli (ST · EK-9 Tablo 9.2)",
    shortBadge: "ST · Tablo 9.2 (16 Satır) + 3×3",
    description:
      "Statik disiplin (ST) IFC4X3_ADD2 modeli: EK-9 Tablo 9.2 (Diğer Disiplinler — 16 satır), m.13(3) malzeme tanımı, beton/kalıp QTO satırları ve dış perde paspayı için örnek 3×3 mühendis inceleme bulgusu.",
    fileName: "123456_00_ST_BETO_MD_BIM_000_01_000.ifc",
    mimeType: "model/ifc",
    fileSizeBytes: 14577,
    checksumSha256: "99e8ba2016ac2d67d14eb3207ea18131b94a0066190e3dc9494c74883f892aed",
    artifactType: "epys_preflight",
    artifactPayload: {
    "schemaVersion": 1,
    "kind": "epys_preflight",
    "ruleSource": {
        "regulation": {
            "ad": "Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik",
            "resmiGazete": "5.8.2026, sayı 33331",
            "yururluk": "2027-09-01",
            "metin": "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2.htm",
            "ekler": "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2-1.pdf"
        },
        "engine": {
            "name": "ifc-ruhsat",
            "version": "0.2.1",
            "upstreamCommit": "cd6d3ce"
        },
        "dataVerification": "Upstream visual verification of the scanned RG 33331 annex PDF (2026-09-17, page numbers in each table). BIMMetraj full annex verification 2026-10-15 against official ministry files #1.pdf, #2.pdf and EKLER.pdf / 20260805-2-1.pdf (SHA-256 7dc88971d3a7a8ae837ef148169fa5bf6c9ce7a01cc8fcd560ae3d342bb0ecb3): EK-1..EK-9 including Tablo 6.55, Tablo 6.60, Tablo 7.8–7.9, Tablo 9.1 (21 rows, MM) and Tablo 9.2 (16 rows, non-MM disciplines)."
    },
    "model": {
        "fileName": "123456_00_ST_BETO_MD_BIM_000_01_000.ifc",
        "schema": "IFC4X3",
        "sizeBytes": 14577,
        "discipline": "ST"
    },
    "summary": {
        "hata": 0,
        "uyari": 0,
        "bilgi": 18,
        "elle": 5
    },
    "ek9Table": {
        "tablo": "9.2",
        "baslik": "Tablo 9.2 Model Kalite Kontrol Formu (Diğer disiplinler için)",
        "disiplin": "ST",
        "disiplinAdi": "Statik",
        "satirSayisi": 16
    },
    "ek9": [
        {
            "no": 1,
            "kaynakNo": 1,
            "bolum": "GENEL KONTROL",
            "kategori": "Genel",
            "baslik": "Dosya Boyutu",
            "soru": "Dosya boyutu, Bakanlıkça belirlenen kısıtlamalara uygun mu?",
            "karar": "Elle",
            "elleNotu": "Bakanlığın dosya boyutu sınırı henüz yayımlanmadı; dosya 14 KB, karar idarenin.",
            "bulgu": 0
        },
        {
            "no": 2,
            "kaynakNo": 2,
            "bolum": "GENEL KONTROL",
            "kategori": "Genel",
            "baslik": "Proje Bilgileri",
            "soru": "Proje bilgileri Yönetmeliğin 13 üncü maddesinde belirtilen esaslara göre dolduruldu mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 3,
            "kaynakNo": 3,
            "bolum": "İSİMLENDİRME",
            "kategori": "Genel",
            "baslik": "Proje ve Dosya İsimlendirmesi",
            "soru": "Proje ve dosya isimlendirmesi Yönetmeliğin 6 ncı maddesine uygun mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 4,
            "kaynakNo": 5,
            "bolum": "İSİMLENDİRME",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Varlıkların isimlendirmesi Yönetmeliğin 11 inci maddesine uygun mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 5,
            "kaynakNo": 6,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "Koordinat Sistemi",
            "soru": "Model doğru koordinat sisteminde konumlandırıldı mı? Bu koordinat verileri Yönetmeliğin 13 üncü maddesinde verilen ilgili proje özniteliklerini kullanılarak atandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 6,
            "kaynakNo": 7,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "Gelişim seviyesi",
            "soru": "Modelde yer alan varlıklar Yönetmeliğin 14 üncü maddesinde verilen gelişim seviyesine uygun olarak modellendi mi?",
            "karar": "Elle",
            "elleNotu": "Gelişim seviyesi (LOD 300) geometrinin ayrıntısına bakılarak elle değerlendirilir.",
            "bulgu": 0
        },
        {
            "no": 7,
            "kaynakNo": 8,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Modelde yer alan varlıklar Yönetmeliğin 12 nci maddesinde tanımlanan \"Zorunlu IFC Sınıfları\" listesindeki doğru sınıflar kullanılarak tanımlandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 8,
            "kaynakNo": 9,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Yönetmeliğin 13 üncü maddesinde belirtilen projedeki mevcut \"Zorunlu IFC Sınıfları\" için zorunlu öznitelikler ve özellikler tanımlandı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 9,
            "kaynakNo": 11,
            "bolum": "MODEL YAPILANMASI",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Modelde \"Proje\", \"Saha\", \"Bina\" ve en az bir \"Bina Katı\" ile ilgili IFC Sınıfları bulunuyor mu?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 10,
            "kaynakNo": 15,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Varlıklar doğru katta veya doğru kotta modellendi mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 11,
            "kaynakNo": 16,
            "bolum": "DİSİPLİN KONTROLLERİ",
            "kategori": "Genel",
            "baslik": "Varlıklar",
            "soru": "Modelden yinelenen varlıklar kaldırıldı mı?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 12,
            "kaynakNo": 17,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "IFC Sınıfları",
            "soru": "Model IFC'ye uygun olarak dönüştürüldü mü (IfcWall, IfcSlab, IfcWindow vb. sınıflar doğru atandı mı)?",
            "karar": "Elle",
            "elleNotu": "Sınıfın doğru seçilip seçilmediği (bir döşemenin IfcSlab, duvarın IfcWall olması) geometriden anlaşılmaz; model görünümünde göz kontrolü gerekir.",
            "bulgu": 0
        },
        {
            "no": 13,
            "kaynakNo": 18,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "IFC Versiyonu",
            "soru": "Model dosyası, teslime ilişkin kısıtlamalarda tanımlanan IFC versiyonunda teslim edildi mi? Dosya uzantısı IFC mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 14,
            "kaynakNo": 19,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "Ön Tanımlı Tip",
            "soru": "Varlıklar IFC'de doğru Ön Tanımlı Tip (Predefined Type) kullanılarak temsil edildi mi?",
            "karar": "Evet",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 15,
            "kaynakNo": 20,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "Özellikler",
            "soru": "Özellikler doğru P_set'ler altında listelendi mi?",
            "karar": "Elle",
            "elleNotu": "",
            "bulgu": 0
        },
        {
            "no": 16,
            "kaynakNo": 21,
            "bolum": "TESLİM VE FORMAT",
            "kategori": "Genel",
            "baslik": "PDF ve IFC uyumu",
            "soru": "Teslim edilen PDF paftaları BIM modelinden üretildi mi?",
            "karar": "Elle",
            "elleNotu": "PDF paftaların modelden üretildiği yalnızca teslim sürecinden anlaşılır.",
            "bulgu": 0
        }
    ],
    "findings": [
        {
            "kod": "elle-1",
            "seviye": "elle",
            "mesaj": "Bakanlığın dosya boyutu sınırı henüz yayımlanmadı; dosya 14 KB, karar idarenin.",
            "madde": "EK-9 madde 1",
            "ek9": 1,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek7",
            "seviye": "bilgi",
            "mesaj": "Proje bilgileri (EK-7) tanımlı.",
            "madde": "m.13, EK-7",
            "ek9": 2,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "dosya-adi",
            "seviye": "bilgi",
            "mesaj": "Dosya adı EK-2 şablonunun dokuz alanına ve alt disiplin/tür/tip/kat sözlüklerine uyuyor.",
            "madde": "m.6, EK-2 Tablo 2.1–2.14",
            "ek9": 3,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-no",
            "seviye": "bilgi",
            "mesaj": "Mahal numaraları ve isimleri EK-3 Tablo 3.1 ve Tablo 3.2'ye uygun.",
            "madde": "m.10, EK-3",
            "ek9": 4,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "isim",
            "seviye": "bilgi",
            "mesaj": "Varlık adları EK-5 şablonuna uygun.",
            "madde": "m.11, EK-5 5.5",
            "ek9": 5,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "koordinat",
            "seviye": "bilgi",
            "mesaj": "Koordinat sistemi EPSG:5256; harita dönüşümü tanımlı.",
            "madde": "EK-7 Tablo 7.6–7.8",
            "ek9": 6,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "elle-7",
            "seviye": "elle",
            "mesaj": "Gelişim seviyesi (LOD 300) geometrinin ayrıntısına bakılarak elle değerlendirilir.",
            "madde": "EK-9 madde 7",
            "ek9": 7,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "sinif",
            "seviye": "bilgi",
            "mesaj": "11 varlığın tümü EK-5 listelerindeki sınıflarda (9 farklı sınıf).",
            "madde": "m.12, EK-5",
            "ek9": 8,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek6-kapsam",
            "seviye": "bilgi",
            "mesaj": "Modelde bulunan 1 zorunlu sınıfın EK-6 tablosu bu sürümde henüz kodlanmadı, yalnızca İsim denetlendi: IfcProject. (KAYNAKLAR.md)",
            "madde": "EK-6",
            "ek9": 9,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "ek6",
            "seviye": "bilgi",
            "mesaj": "Kodlanmış 68 EK-6 tablosundaki zorunlu öznitelik ve özellikler tam.",
            "madde": "m.13, EK-6",
            "ek9": 9,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-tablo",
            "seviye": "elle",
            "mesaj": "Hesaplanan toplamlar projedeki emsal hesap tablosuyla (pafta) karşılaştırılmalı.",
            "madde": "EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-toplam",
            "seviye": "bilgi",
            "mesaj": "Emsal alanları — DAHIL: 300.00 m².",
            "madde": "EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "emsal-kaks",
            "seviye": "bilgi",
            "mesaj": "Emsale dahil alan 300.00 m²; KAKS 1.5 × parsel 1,000.00 m² = 1,500.00 m² sınırının içinde.",
            "madde": "EK-6 Tablo 6.55, EK-9 madde 10",
            "ek9": 10,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "iskelet",
            "seviye": "bilgi",
            "mesaj": "Proje, Saha, Bina ve 2 kat mevcut.",
            "madde": "EK-9 madde 11",
            "ek9": 11,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-ortusme",
            "seviye": "bilgi",
            "mesaj": "Aynı kattaki mahaller örtüşmüyor (sınır kutusu kontrolü).",
            "madde": "EK-9 madde 13",
            "ek9": 13,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "mahal-govde",
            "seviye": "bilgi",
            "mesaj": "Her mahalin hacimli bir 3B gövdesi var.",
            "madde": "EK-9 madde 14",
            "ek9": 14,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "kat-bagi",
            "seviye": "bilgi",
            "mesaj": "Her yapı elemanı bir kata bağlı.",
            "madde": "EK-9 madde 15",
            "ek9": 15,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "kat-kotu",
            "seviye": "bilgi",
            "mesaj": "Elemanların yerleşim kotları bağlı oldukları katın aralığında.",
            "madde": "EK-9 madde 15",
            "ek9": 15,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "yinelenen",
            "seviye": "bilgi",
            "mesaj": "Yinelenen GlobalId ya da üst üste eleman yok.",
            "madde": "EK-9 madde 16",
            "ek9": 16,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "sinif-anlam",
            "seviye": "elle",
            "mesaj": "Sınıfın doğru seçilip seçilmediği (bir döşemenin IfcSlab, duvarın IfcWall olması) geometriden anlaşılmaz; model görünümünde göz kontrolü gerekir.",
            "madde": "EK-9 madde 17",
            "ek9": 17,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "surum",
            "seviye": "bilgi",
            "mesaj": "Şema IFC4X3 — IFC 4.3.",
            "madde": "m.4(5), EK-5 5.4",
            "ek9": 18,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "on-tanimli-tip",
            "seviye": "bilgi",
            "mesaj": "Ön Tanımlı Tipler atanmış.",
            "madde": "EK-9 madde 19",
            "ek9": 19,
            "varliklar": [],
            "sayi": null
        },
        {
            "kod": "elle-21",
            "seviye": "elle",
            "mesaj": "PDF paftaların modelden üretildiği yalnızca teslim sürecinden anlaşılır.",
            "madde": "EK-9 madde 21",
            "ek9": 21,
            "varliklar": [],
            "sayi": null
        }
    ],
    "disclaimer": "Otomatik ön kontroldür; resmî uygunluk kararı değildir. Değerlendirme e-PYS ve ilgili idareye, beyanın doğruluğu proje müellifine aittir (Elektronik Teslim Yönetmeliği m.5)."
},
    rows: [
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 1,
        sourceCellRange: "#110/3uac13C5DBGxgg$8c7VihU",
        rawPositionCode: "15.150.1005",
        rawDescription: "IfcSlab · ST-DSM-zemin (Taşıyıcı Betonarme Döşeme — Beton_C25)",
        rawUnit: "m3",
        rawQuantity: "6.40",
        rawPrice: "",
        rawWastePercent: "3",
        formulaJson: {
          qtoPath: "#242/#239/#240:Qto_SlabBaseQuantities/NetVolume",
          pozPath: "#245/#243/#244:TREpys_PozOzellikSeti/PozNo",
        },
        normalizedPositionCode: "15.150.1005",
        normalizedDescription: "IfcSlab · ST-DSM-zemin (Taşıyıcı Betonarme Döşeme — Beton_C25)",
        normalizedUnit: "m3",
        normalizedQuantity: "6.40",
        normalizedPrice: null,
        normalizedWastePercent: "3",
        mappingConfidence: "0.95",
        findingsJson: [],
      },
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 2,
        sourceCellRange: "#87/3jr0a2ceT4TfZ6rAkGozeS",
        rawPositionCode: "15.150.1005",
        rawDescription: "IfcWall · ST-DVR-perde_20cm (Dış Cephe Taşıyıcı Perde — Paspayı Kontrolü)",
        rawUnit: "m3",
        rawQuantity: "4.80",
        rawPrice: "",
        rawWastePercent: "3",
        formulaJson: {
          qtoPath: "#248/#246/#247:Qto_WallBaseQuantities/NetVolume",
          coverCheck: "Pset_ConcreteElementGeneral.ProtectiveLayerThickness = 20 mm < TS 500 dış cephe min. 25 mm",
        },
        normalizedPositionCode: "15.150.1005",
        normalizedDescription: "IfcWall · ST-DVR-perde_20cm (Dış Cephe Taşıyıcı Perde — Paspayı Kontrolü)",
        normalizedUnit: "m3",
        normalizedQuantity: "4.80",
        normalizedPrice: null,
        normalizedWastePercent: "3",
        mappingConfidence: "0.92",
        findingsJson: [
          {
            code: "COVER_BELOW_STANDARD_MIN",
            severity: "high",
            message: "Dış cephe perde elemanında paspayı (20 mm), TS 500 minimum sınırının (25 mm) altında.",
            ruleVersion: "smartcheck-3x3-2026-10-v2",
            suggestion: "Kalıp/donatı detayında paspayını ≥ 25 mm olarak düzeltin veya koruyucu kaplama varsa gerekçeli mühendis istisnası girin.",
          },
        ],
      },
      {
        sheetName: "IFC_QTO",
        sourceRowNumber: 3,
        sourceCellRange: "#231/3bC4dE5fG6hI7jK8lM9nO0",
        rawPositionCode: "15.390.1002",
        rawDescription: "IfcCovering · ST-KPL-koruma_betonu (Temel/Zemin Koruma Kaplaması)",
        rawUnit: "m2",
        rawQuantity: "32.50",
        rawPrice: "",
        rawWastePercent: "3",
        formulaJson: {
          qtoPath: "#235/#232/#233:Qto_CoveringBaseQuantities/NetArea",
          pozPath: "#238/#236/#237:TREpys_PozOzellikSeti/PozNo",
        },
        normalizedPositionCode: "15.390.1002",
        normalizedDescription: "IfcCovering · ST-KPL-koruma_betonu (Temel/Zemin Koruma Kaplaması)",
        normalizedUnit: "m2",
        normalizedQuantity: "32.50",
        normalizedPrice: null,
        normalizedWastePercent: "3",
        mappingConfidence: "0.95",
        findingsJson: [],
      },
    ],
  },
  "pdfa-pafta-iso216": {
    id: "pdfa-pafta-iso216",
    label: "Örnek 2B Uygulama Paftası (PDF/A-2B · ISO 216 A3 · /Sig e-İmza)",
    shortBadge: "PDF/A-2B · ISO 216 + e-İmza",
    description:
      "RG 33331 #1.pdf m.8(1) ISO 216 A3 (420×297 mm) pafta boyutu, m.8(2) tek pafta düzeni, #2.pdf m.6(1)-(2) 5070 sayılı Kanun gömülü e-imza (/Sig) ve m.6(4) vektörel metin kontrollerinden geçmiş örnek pafta.",
    fileName: "123456_00_MM_GNEL_PL_MMC_K00_01_000.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1461,
    checksumSha256: "2f0a4ab7bebbb6f3351d448ed64b2e23db9a5cce17a63e717ef28c0931c45d4b",
    artifactType: "pdf_preflight",
    artifactPayload: {
    "schemaVersion": 1,
    "kind": "pdf_preflight",
    "file": {
        "fileName": "123456_00_MM_GNEL_PL_MMC_K00_01_000.pdf",
        "pageCount": 1
    },
    "pdfa": {
        "claimed": {
            "part": "2",
            "conformance": "B"
        },
        "note": "Yalnız PDF/A kimlik beyanı okunur; PDF/A uygunluğunun tam doğrulaması veraPDF gibi bir doğrulayıcı gerektirir."
    },
    "eSignature": {
        "present": true,
        "note": "PDF içinde elektronik imza alanı (/Sig) tespit edildi."
    },
    "summary": {
        "hata": 0,
        "uyari": 0,
        "elle": 1
    },
    "findings": [
        {
            "kod": "PDFA_TAM_DOGRULAMA",
            "seviye": "elle",
            "mesaj": "Yalnız PDF/A kimlik beyanı okunur; PDF/A uygunluğunun tam doğrulaması veraPDF gibi bir doğrulayıcı gerektirir.",
            "madde": "PDF/A (ISO 19005)"
        }
    ],
    "disclaimer": "Otomatik ön kontroldür; resmî uygunluk kararı değildir."
},
    rows: [],
  },
};

export const SAMPLE_PRICE_CATALOG_SEED = [
  {
    positionCode: "15.150.1005",
    description: "C 25/30 basınç dayanım sınıfında hazır beton dökülmesi (ÇŞB 2026 Referans)",
    unit: "m3",
    amount: 3450,
    currency: "TRY",
  },
  {
    positionCode: "15.390.1002",
    description: "Her türlü zeminde seramik kaplama yapılması (ÇŞB 2026 Referans)",
    unit: "m2",
    amount: 980,
    currency: "TRY",
  },
];
