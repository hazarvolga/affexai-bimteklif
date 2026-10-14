import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AllplanTrepysPropertySpec {
  name: string;
  ifcDataType: "IfcLabel" | "IfcReal" | "IfcBoolean" | "IfcIdentifier" | "IfcAreaMeasure";
  allplanAttributeType: "Text" | "Real" | "Boolean";
  required: boolean;
  allowedValues?: string[];
  descriptionTr: string;
}

export interface AllplanTrepysPsetSpec {
  psetName: string;
  applicableIfcClasses: string[];
  regulationRef: string;
  properties: AllplanTrepysPropertySpec[];
}

export interface ApprovedMaterialTemplate {
  code: string;
  charCount: number;
  category: string;
  defaultCsbPozNo: string;
  descriptionTr: string;
}

export interface AllplanEpysKitV1 {
  kitMeta: {
    kitId: "allplan-2026-epys-kit-v1";
    version: "1.0.0";
    targetCad: string;
    ifcSchema: "IFC4X3_ADD2";
    regulationReference: string;
    checksumSha256: string;
  };
  trepysPsetCatalog: AllplanTrepysPsetSpec[];
  ek2FileNamingTemplate: {
    pattern: string;
    example: string;
    disiplinler: Record<string, string>;
    altDisiplinler: Record<string, string>;
    dosyaTurleri: Record<string, string>;
    dosyaTipleri: Record<string, string>;
    katKonumKurallari: Record<string, string>;
  };
  ek3SpaceCatalog: {
    spaceNumberPattern: string;
    mahalCount: number;
    mahaller: Record<string, string>;
  };
  ek5ElementNamingAndMaterials: {
    elementNamePattern: string;
    materialRule: string;
    maxMaterialCharLength: 15;
    approved15CharMaterials: ApprovedMaterialTemplate[];
    zorunluSinifCount: number;
    istegeBagliSinifCount: number;
    kategoriKodlari: Record<string, string>;
  };
  ek7GeoreferenceTemplate: {
    ifcSchema: "IFC4X3_ADD2";
    crsOptions: string[];
    geodeticDatum: "ITRF96";
    verticalDatum: "TUDKA99";
    mapProjection: "Transverse Mercator";
    geometricContext: {
      ContextType: "Model";
      CoordinateSpaceDimension: 3;
      Precision: number;
    };
  };
}

const TREPYS_PSET_CATALOG: AllplanTrepysPsetSpec[] = [
  {
    psetName: "TREpys_ParselOzellikSeti",
    applicableIfcClasses: ["IfcSite"],
    regulationRef: "RG 33331 EK-4 & EK-6 Tablo 6.1",
    properties: [
      { name: "TAKS", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: true, descriptionTr: "Taban Alanı Kat Sayısı (örn. 0.40)" },
      { name: "KAKS", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: true, descriptionTr: "Katlar Alanı Kat Sayısı / Emsal (örn. 1.50)" },
      { name: "CekmeOn", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: true, descriptionTr: "Ön bahçe çekme mesafesi (m)" },
      { name: "CekmeYan", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: true, descriptionTr: "Yan bahçe çekme mesafesi (m)" },
      { name: "CekmeArka", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: true, descriptionTr: "Arka bahçe çekme mesafesi (m)" },
    ],
  },
  {
    psetName: "TREpys_EmsalOzellikSeti",
    applicableIfcClasses: ["IfcSpatialZone", "IfcSpace"],
    regulationRef: "RG 33331 EK-4 Tablo 4.1 & EK-6 Tablo 6.4",
    properties: [
      {
        name: "EmsalDurumu",
        ifcDataType: "IfcLabel",
        allplanAttributeType: "Text",
        required: true,
        allowedValues: ["DAHIL", "HARIC", "YUZDE30"],
        descriptionTr: "Alan emsal hesabı sınıfı (Planlı Alanlar İmar Yönetmeliği m.22)",
      },
      {
        name: "Alan",
        ifcDataType: "IfcAreaMeasure",
        allplanAttributeType: "Real",
        required: false,
        descriptionTr: "Qto_SpatialZoneBaseQuantities.GrossFloorArea yoksa yedek emsal alanı (m²)",
      },
    ],
  },
  {
    psetName: "TREpys_PozOzellikSeti",
    applicableIfcClasses: ["IfcBeam", "IfcColumn", "IfcSlab", "IfcWall", "IfcCovering", "IfcReinforcingBar", "IfcDoor", "IfcWindow"],
    regulationRef: "RG 33331 EK-4 & 5D BIM Metraj Köprüsü",
    properties: [
      { name: "PozNo", ifcDataType: "IfcIdentifier", allplanAttributeType: "Text", required: true, descriptionTr: "Resmi ÇŞB Birim Fiyat Poz Numarası (örn. 15.150.1005)" },
      { name: "PozTanimi", ifcDataType: "IfcLabel", allplanAttributeType: "Text", required: false, descriptionTr: "ÇŞB Birim Fiyat Poz Tanımı" },
      { name: "Birim", ifcDataType: "IfcLabel", allplanAttributeType: "Text", required: false, allowedValues: ["m3", "m2", "m", "ton", "kg", "adet"], descriptionTr: "Ölçü birimi" },
      { name: "KurumKodu", ifcDataType: "IfcLabel", allplanAttributeType: "Text", required: false, allowedValues: ["CSB_YFK_2026", "CSB_MEKANIK_2026", "CSB_ELEKTRIK_2026"], descriptionTr: "Birim fiyat katalog kaynağı" },
    ],
  },
  {
    psetName: "TREpys_YanginOzellikSeti",
    applicableIfcClasses: ["IfcBuilding", "IfcSpace", "IfcWall", "IfcSlab", "IfcDoor"],
    regulationRef: "RG 33331 EK-4 & Binaların Yangından Korunması Hakkında Yönetmelik",
    properties: [
      { name: "YanginDayanimSuresi", ifcDataType: "IfcLabel", allplanAttributeType: "Text", required: true, allowedValues: ["REI 30", "REI 60", "REI 90", "REI 120", "EI 30", "EI 60"], descriptionTr: "Yangın dayanım sınıfı ve süresi" },
      { name: "KacisYoluMu", ifcDataType: "IfcBoolean", allplanAttributeType: "Boolean", required: false, descriptionTr: "Kaçış yolu / yangın güvenlik holü bileşeni mi?" },
    ],
  },
  {
    psetName: "TREpys_AkustikOzellikSeti",
    applicableIfcClasses: ["IfcWall", "IfcSlab", "IfcDoor", "IfcWindow"],
    regulationRef: "RG 33331 EK-4 & Binaların Gürültüye Karşı Korunması Hakkında Yönetmelik",
    properties: [
      { name: "AkustikPerformansSinifi", ifcDataType: "IfcLabel", allplanAttributeType: "Text", required: true, allowedValues: ["A", "B", "C", "D", "E", "F"], descriptionTr: "Akustik performans sınıfı" },
      { name: "HavaDogusluSesYalitimiDb", ifcDataType: "IfcReal", allplanAttributeType: "Real", required: false, descriptionTr: "Rw / DnT,w ses yalıtım değeri (dB)" },
    ],
  },
];

const APPROVED_15_CHAR_MATERIALS: ApprovedMaterialTemplate[] = [
  { code: "BETON_C25_30", charCount: 12, category: "Betonarme", defaultCsbPozNo: "15.150.1004", descriptionTr: "C25/30 hazır beton (santraldan)" },
  { code: "BETON_C30_37", charCount: 12, category: "Betonarme", defaultCsbPozNo: "15.150.1005", descriptionTr: "C30/37 hazır beton (santraldan)" },
  { code: "BETON_C35_45", charCount: 12, category: "Betonarme", defaultCsbPozNo: "15.150.1006", descriptionTr: "C35/45 hazır beton (santraldan)" },
  { code: "BETON_C40_50", charCount: 12, category: "Betonarme", defaultCsbPozNo: "15.150.1007", descriptionTr: "C40/50 hazır beton (santraldan)" },
  { code: "CELIK_B420C", charCount: 11, category: "Donatı", defaultCsbPozNo: "15.160.1003", descriptionTr: "B420C nervürlü beton çelik çubuğu" },
  { code: "CELIK_B500C", charCount: 11, category: "Donatı", defaultCsbPozNo: "15.160.1004", descriptionTr: "B500C nervürlü beton çelik çubuğu" },
  { code: "CELIK_S275JR", charCount: 12, category: "Yapısal Çelik", defaultCsbPozNo: "15.165.1001", descriptionTr: "S275JR yapısal çelik profil" },
  { code: "CELIK_S355JR", charCount: 12, category: "Yapısal Çelik", defaultCsbPozNo: "15.165.1002", descriptionTr: "S355JR yapısal çelik profil" },
  { code: "TUGLA_YATAY_19", charCount: 14, category: "Duvar", defaultCsbPozNo: "15.220.1004", descriptionTr: "19 cm yatay delikli fabrika tuğlası" },
  { code: "TUGLA_YATAY_13", charCount: 14, category: "Duvar", defaultCsbPozNo: "15.220.1003", descriptionTr: "13.5 cm yatay delikli fabrika tuğlası" },
  { code: "GAZBETON_G2_20", charCount: 14, category: "Duvar", defaultCsbPozNo: "15.230.1005", descriptionTr: "20 cm G2/04 gazbeton duvar bloku" },
  { code: "GAZBETON_G4_15", charCount: 14, category: "Duvar", defaultCsbPozNo: "15.230.1003", descriptionTr: "15 cm G4/06 gazbeton duvar bloku" },
  { code: "ALCI_SIVA_IC", charCount: 12, category: "İnce İş (IfcCovering)", defaultCsbPozNo: "15.275.1101", descriptionTr: "İç cephe perlitli alçı sıva" },
  { code: "CIM_SIVA_DIS", charCount: 12, category: "İnce İş (IfcCovering)", defaultCsbPozNo: "15.275.1002", descriptionTr: "Dış cephe çimento esaslı sıva" },
  { code: "SERAMIK_YER_60", charCount: 14, category: "İnce İş (IfcCovering)", defaultCsbPozNo: "15.390.1012", descriptionTr: "60x60 cm porselen yer seramiği" },
  { code: "GRANIT_YER_60", charCount: 13, category: "İnce İş (IfcCovering)", defaultCsbPozNo: "15.385.1005", descriptionTr: "60x60 cm granit döşeme kaplaması" },
  { code: "XPS_ISI_YAL_5", charCount: 13, category: "Yalıtım (IfcCovering)", defaultCsbPozNo: "15.340.1005", descriptionTr: "5 cm XPS ısı yalıtım levhası" },
  { code: "TAS_YUNU_5CM", charCount: 12, category: "Yalıtım (IfcCovering)", defaultCsbPozNo: "15.340.1105", descriptionTr: "5 cm taş yünü cephe yalıtım levhası" },
  { code: "SU_YAL_MEMBRAN", charCount: 14, category: "Yalıtım (IfcCovering)", defaultCsbPozNo: "15.315.1002", descriptionTr: "Bitümlü su yalıtım membranı" },
  { code: "ALCIPAN_TAVAN", charCount: 13, category: "İnce İş (IfcCovering)", defaultCsbPozNo: "15.540.1101", descriptionTr: "12.5 mm alçı levha asma tavan" },
];

function readVendorJson<T>(fileName: string): T {
  const fullPath = path.resolve(process.cwd(), "workers/ifc/vendor/ifc_ruhsat/ekler", fileName);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

export function buildAllplanEpysKitV1(): AllplanEpysKitV1 {
  const ek2 = readVendorJson<{
    disiplinler: Record<string, string>;
    alt_disiplinler: Record<string, string>;
    dosya_turleri: Record<string, string>;
    dosya_tipleri: Record<string, string>;
  }>("ek2_disiplinler.json");

  const ek3 = readVendorJson<{
    mahaller: Record<string, string>;
  }>("ek3_mahaller.json");

  const ek5 = readVendorJson<{
    zorunlu: Array<{ ifc: string; kod: string | null; turkce: string }>;
    istege_bagli: Array<{ ifc: string; kod: string | null; turkce: string }>;
  }>("ek5_siniflar.json");

  const kategoriKodlari: Record<string, string> = {};
  for (const row of [...ek5.zorunlu, ...ek5.istege_bagli]) {
    if (row.kod) {
      kategoriKodlari[row.kod] = row.ifc;
    }
  }

  const payloadWithoutHash = {
    trepysPsetCatalog: TREPYS_PSET_CATALOG,
    ek2FileNamingTemplate: {
      pattern: "ProjeKodu(6)_BinaKodu(2)_Disiplin(2)_AltDisiplin(4)_DosyaTuru(2)_DosyaTipi(3)_KatKonum(3)_SiraNo(2)_RevizyonNo(3)",
      example: "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc",
      disiplinler: ek2.disiplinler,
      altDisiplinler: ek2.alt_disiplinler,
      dosyaTurleri: ek2.dosya_turleri,
      dosyaTipleri: ek2.dosya_tipleri,
      katKonumKurallari: {
        "B01..B99": "Bodrum katlar",
        "K00..K99": "Zemin ve normal katlar (KAC: Çatı, KAA: Asma, KTH: Teknik)",
        "NNN": "Kat bağımsız pafta/model",
        "000": "Tüm katları içeren birleşik model",
      },
    },
    ek3SpaceCatalog: {
      spaceNumberPattern: "KatKodu(3)_BolumKodu(3)_SiraNo(3) (örn. K00_DAI_001)",
      mahalCount: Object.keys(ek3.mahaller).length,
      mahaller: ek3.mahaller,
    },
    ek5ElementNamingAndMaterials: {
      elementNamePattern: "Disiplin(2)-KategoriKodu(3)-Aciklama (örn. MM-DVR-dis_20cm, ST-KLN-k101)",
      materialRule: "En fazla 15 karakter, Türkçe karaktersiz ASCII, Malzeme_Dayanim formatı (EK-5 5.6)",
      maxMaterialCharLength: 15 as const,
      approved15CharMaterials: APPROVED_15_CHAR_MATERIALS,
      zorunluSinifCount: ek5.zorunlu.length,
      istegeBagliSinifCount: ek5.istege_bagli.length,
      kategoriKodlari,
    },
    ek7GeoreferenceTemplate: {
      ifcSchema: "IFC4X3_ADD2" as const,
      crsOptions: ["EPSG:5253", "EPSG:5254", "EPSG:5255", "EPSG:5256", "EPSG:5257", "EPSG:5258", "EPSG:5259"],
      geodeticDatum: "ITRF96" as const,
      verticalDatum: "TUDKA99" as const,
      mapProjection: "Transverse Mercator" as const,
      geometricContext: {
        ContextType: "Model" as const,
        CoordinateSpaceDimension: 3 as const,
        Precision: 1e-5,
      },
    },
  };

  const checksumSha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(payloadWithoutHash))
    .digest("hex");

  return {
    kitMeta: {
      kitId: "allplan-2026-epys-kit-v1",
      version: "1.0.0",
      targetCad: "Allplan 2026 (IFC4X3_ADD2 OpenBIM Exporter)",
      ifcSchema: "IFC4X3_ADD2",
      regulationReference: "5.8.2026 RG Sayı 33331 — Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik (EK-1..EK-10)",
      checksumSha256,
    },
    ...payloadWithoutHash,
  };
}
