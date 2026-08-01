export interface ParsedIfcElement {
  id: string;
  guid: string;
  type: "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcReinforcingBar";
  name: string;
  storey: string;
  storeySource: "estimate" | "ifc_spatial";
  storeySourcePath?: string;
  volumeM3: number;
  formworkM2: number;
  rebarKg: number;
  rebarDiameterMm?: number;
  quantitySource: "estimate" | "property";
  quantitySourcePath?: string;
  quantityConfidence?: number;
  smartCheckStatus: "pass" | "warning" | "review";
  smartCheckNote?: string;
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
  rebarCount: number;
  rebarByDiameter: Record<number, { lengthM: number; weightKg: number }>;
}
