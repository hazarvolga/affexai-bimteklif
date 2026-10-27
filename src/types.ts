/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

export enum Currency {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
}

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived',
}

export enum PipelineStage {
  NEW_LEAD = 'lead',
  CONTACTED = 'contacted',
  PROPOSAL_SENT = 'quotation_sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  signatureUrl?: string;
  stampUrl?: string;
  defaultCurrency: Currency;
  defaultVatRate: number;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  type: 'company' | 'person';
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  pipelineStage: PipelineStage;
  createdAt: number;
}

export interface QuoteItem {
  benchmarkStagingId?: string;
  /** Approved company price-catalogue snapshot this line was picked from (M-12.6). */
  priceSnapshotId?: string;
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costUnitPrice?: number | null;
  wastePercent?: number;
  costCategory?: 'material' | 'labor' | 'logistics' | 'subcontractor' | 'overhead';
  quantitySource?: 'manual' | 'ai_estimate' | 'document' | 'model' | 'model_estimate' | 'verified';
  priceSource?: 'manual' | 'ai_estimate' | 'supplier' | 'market' | 'verified' | 'snapshot';
  sourceReference?: string | null;
  verificationStatus?: 'unverified' | 'needs_review' | 'verified';
  discountPercent: number;
  vatPercent: number;
  total: number;
}

export interface Quote {
  id: string;
  companyId: string;
  clientId: string;
  quoteNumber: string;
  projectName: string;
  date: number;
  expiryDate: number;
  currency: Currency;
  notes?: string;
  status: QuoteStatus;
  projectDurationMonths?: number;
  escalationVolatilityPercent?: number;
  procurementProfile?: 'standard' | 'low_carbon' | 'high_carbon_risk';
  carbonRiskPremiumPercent?: number;
  informationDeliveryLevel?: 'none' | 'as_built' | 'cobie' | 'digital_twin';
  informationDeliveryCostPercent?: number;
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  overheadProfitPercent?: number;
  overheadProfitTotal?: number;
  vatTotal: number;
  grandTotal: number;
  revisionVersion: number;
  originalQuoteId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RegulationAlert {
  id: string;
  title: string;
  category: string;
  effectiveDate: number;
  impactLevel: 'low' | 'medium' | 'high';
  summary: string;
  affectedModules: string[];
}

export type ViewType =
  | 'home'
  | 'standartlar'
  | 'dokumanlar'
  | 'mevzuat'
  | 'sozluk'
  | 'gap'
  | 'dashboard';

export interface Standard {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  deliverables: string[];
  checklist: string[];
  bgClass: string;
  iconName: string;
}

export interface TechnicalDocument {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  points: string[];
  expertNote: string;
  templateFields: Array<{
    field: string;
    desc: string;
    required: boolean;
  }>;
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  status: 'completed' | 'ongoing' | 'future';
}

export interface PozCode {
  ifcClass: string;
  pozNo: string;
  description: string;
  unit: string;
}
