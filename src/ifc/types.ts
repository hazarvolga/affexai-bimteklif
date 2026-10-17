import type { AuthoringSoftwareDetection, AuthoringSoftwareRaw } from "./authoring-software-diagnostics";

export interface ParsedIfcElement {
  id: string;
  guid: string;
  type: "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcReinforcingBar" | "IfcCovering";
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
  exposureClass?: string;
  coverMm?: number;
  discipline?: string;
  expectedQuantity?: number;
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
  /** Sunucu (Python) yolundan gelen ham başlık bilgisi; sınıflandırma TS'de yapılır. */
  authoringSoftwareRaw?: AuthoringSoftwareRaw;
  /** Kapı/pencere listesi (sunucu yolu); sözleşmesel minha için. */
  openings?: ParsedOpening[];
}

