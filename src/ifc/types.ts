import type { AuthoringSoftwareDetection, AuthoringSoftwareRaw } from "./authoring-software-diagnostics";

export interface IfcSourceIdentity {
  fileSha256: string;
  runId: string;
  stepId: string;
  globalId: string;
  elementKey: string;
}

export interface IfcParserContract {
  version: "IFC-NORMALIZED-1";
  engine: "worker";
  schema: string;
  schemaFamily: "IFC2X3" | "IFC4" | "IFC4X3";
  fileName: string;
  fileSha256: string;
  runId: string;
  capabilities: {
    qtoPriority: true;
    independentUnits: true;
    typeInheritance: true;
    aggregateSuppression: true;
    materialLayers: true;
    geometryFallback: true;
  };
  qualityGate: {
    passed: boolean;
    invalidQuantityElementKeys: string[];
    blockingFindingCodes: string[];
    measuredElementCount: number;
    unmeasuredElementCount: number;
    excludedElementCount: number;
    suppressedAssemblyPartCount: number;
    dimensionTotals: {
      volumeM3: number;
      areaM2: number;
      lengthM: number;
      massKg: number;
      formworkAreaM2: number;
    };
  };
}

export type IfcConsistencyFindingCode =
  | "DUPLICATE_GLOBAL_ID"
  | "ORPHAN_OPENING_ELEMENT"
  | "NEGATIVE_NET_QUANTITY"
  | "ZERO_NET_QUANTITY"
  | "MISSING_NET_QUANTITY"
  | "MISSING_SPATIAL_STOREY"
  | "UNCOVERED_PROXY_ELEMENT"
  | "UNMAPPED_POZ_ELEMENT"
  | "MISSING_MATERIAL"
  | "CONCRETE_CLASS_DIFFERS";

export interface IfcConsistencyFinding {
  code: IfcConsistencyFindingCode;
  severity: "high" | "medium";
  globalId: string;
  ifcClass: string;
  storey: string;
  elementName?: string;
  message: string;
  sourceIdentity?: IfcSourceIdentity;
}

export interface IfcUncoveredElementRecord {
  globalId: string;
  ifcClass: string;
  name: string;
  storey: string;
  reason: string;
  /** in_takeoff: metraja giren sınıftan ama icmale yerleşemeyen eleman; out_of_scope: otomatik metraj kapsamı dışındaki sınıf. */
  scope?: "in_takeoff" | "out_of_scope";
  /** Modelin bu eleman için verdiği miktar; fiyatlandırılmaz, poz atanmaz. */
  quantity?: UncoveredQuantity;
  sourceIdentity?: IfcSourceIdentity;
}

export type UncoveredQuantityUnit = "m³" | "m²" | "mtül";

export interface UncoveredQuantity {
  value: number;
  unit: UncoveredQuantityUnit;
}

export interface IfcSuppressedAssemblyPartRecord {
  globalId: string;
  ifcClass: string;
  name: string;
  parentGlobalId: string;
  parentIfcClass: string;
  storey: string;
  sourceIdentity?: IfcSourceIdentity;
}

export interface IfcConsistencyReport {
  totalElementCount: number;
  measuredElementCount: number;
  unmeasuredElementCount: number;
  pozMatchedElementCount: number;
  pozMatchedRatio: number | null;
  uncoveredElementCount: number;
  /** Otomatik metraj kapsamı dışındaki sınıflardan raporlanan eleman sayısı (toplam eleman sayısına dahil değildir). */
  outOfScopeElementCount?: number;
  typeInheritedElementCount: number;
  suppressedAssemblyPartCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  findings: IfcConsistencyFinding[];
  uncoveredElements: IfcUncoveredElementRecord[];
  suppressedAssemblyParts: IfcSuppressedAssemblyPartRecord[];
}

export interface ParsedIfcElement {
  id: string;
  guid: string;
  type: "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcReinforcingBar" | "IfcCovering";
  ifcClass?: string;
  name: string;
  storey: string;
  storeySource: "estimate" | "ifc_spatial";
  storeySourcePath?: string;
  volumeM3: number;
  areaM2?: number;
  grossAreaM2?: number;
  openingAreaM2?: number;
  lengthM?: number;
  materialLayers?: string[];
  coveringPredefinedType?: string;
  spaceCode?: string;
  spaceName?: string;
  zoneName?: string;
  formworkM2: number;
  rebarKg: number;
  rebarDiameterMm?: number;
  quantitySource: "estimate" | "property" | "qto" | "geometry";
  quantitySourcePath?: string;
  quantityConfidence?: number;
  smartCheckStatus: "pass" | "warning" | "review";
  smartCheckNote?: string;
  pozNo?: string;
  pozNoSourcePath?: string;
  formworkBasis?: string;
  formworkNote?: string;
  reviewNotes?: string[];
  loadBearing?: boolean;
  exposure?: "interior" | "exterior";
  surfaceCondition?: "interior" | "exterior" | "soil_contact" | "unknown";
  exposureClass?: string;
  coverMm?: number;
  discipline?: string;
  expectedQuantity?: number;
  measured?: boolean;
  measurementStatus?: "ölçüldü" | "ölçülemedi";
  matchedPozCode?: string | null;
  isUncovered?: boolean;
  uncoveredReason?: string;
  inheritedFromType?: boolean;
  sourceIdentity?: IfcSourceIdentity;
  /** Persisted SmartCheck row identity used only for audited server-side quotation projection. */
  sourceQuantityRowId?: string;
}

export interface ApartmentRoomScheduleItem {
  code: string;
  name: string;
  storey: string;
  netAreaM2: number;
  floorFinish: string;
  isBalcony?: boolean;
}

export interface ApartmentUnitScheduleItem {
  unitCode: string;
  unitLabel: string;
  storey: string;
  roomCount: number;
  netSweepableM2: number;
  balconyM2: number;
  totalNetM2: number;
  /** Daire brüt alanı. IFC mahal cetvelinde brüt/duvar/ortak alan verisi olmadığından modelden gelmez; null ise kullanıcı katsayısıyla hesaplanır. */
  unitGrossM2: number | null;
  generalGrossM2: number | null;
  rooms: ApartmentRoomScheduleItem[];
}

export interface TrPsetCsbProjectCompliance {
  taks?: number;
  kaks?: number;
  cekmeOn?: number;
  cekmeYan?: number;
  cekmeArka?: number;
  emsalDahilM2?: number;
  emsalHaricM2?: number;
  emsalYuzde30M2?: number;
  source: "ifc_site" | "ifc_building" | null;
  sourcePath?: string;
}

/** Modeldeki kapı/pencere; ölçü okunamadıysa widthM/heightM null. */
export interface ParsedOpening {
  id: string;
  kind: "door" | "window";
  name?: string | null;
  widthM: number | null;
  heightM: number | null;
  /** IfcRelFillsElement -> IfcOpeningElement -> IfcRelVoidsElement ev sahibi. */
  hostElementId?: string | null;
  hostGlobalId?: string | null;
  /** İcmal satırı/bitiş katmanı açıkça eşlenmediyse null; otomatik minha uygulanmaz. */
  targetLineId?: string | null;
  targetFinishLayer?: string | null;
  quantityBasis?: "gross_before_openings" | "net_after_openings" | "unknown";
}

export interface IfcParseSummary {
  parseStatus: "succeeded" | "failed";
  extractionMode: "demo_estimate";
  quantitySource: "estimate";
  quoteTransferStatus: "needs_review";
  warnings: string[];
  unsupportedReasons: string[];
  totalElements: number;
  totalVolumeM3: number;
  totalFormworkM2: number;
  totalRebarKg: number;
  totalRebarTon: number;
  beamCount: number;
  beamVolumeM3: number;
  columnCount: number;
  columnVolumeM3: number;
  slabCount: number;
  slabVolumeM3: number;
  wallCount: number;
  wallVolumeM3: number;
  coveringCount?: number;
  coveringAreaM2?: number;
  rebarCount: number;
  rebarByDiameter: Record<number, { lengthM: number; weightKg: number }>;
  trPsetCsb: TrPsetCsbProjectCompliance;
  apartmentSchedule?: ApartmentUnitScheduleItem[];
  elementsWithPozNoCount: number;
  elementsMissingPozNoCount: number;
  materialNames?: string[];
  spaceNames?: string[];
  /** IFC başlığından tespit edilen kaynak yazılım (Paket M-2). */
  authoringSoftware?: AuthoringSoftwareDetection;
  parserContract?: IfcParserContract;
  /** Sunucu (Python) yolundan gelen ham başlık bilgisi; sınıflandırma TS'de yapılır. */
  authoringSoftwareRaw?: AuthoringSoftwareRaw;
  /** Kapı/pencere listesi (sunucu yolu); sözleşmesel minha için. */
  openings?: ParsedOpening[];
  /** IFC Tutarlılık ve Metraj Kapsama Raporu (Rev. 36). */
  consistencyReport?: IfcConsistencyReport;
}


