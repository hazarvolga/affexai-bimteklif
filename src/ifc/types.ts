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
  elementsWithPozNoCount: number;
  elementsMissingPozNoCount: number;
  materialNames?: string[];
  spaceNames?: string[];
}

