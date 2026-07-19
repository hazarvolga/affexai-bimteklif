/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  NEW_LEAD = 'new_lead',
  CONTACTED = 'contacted',
  PROPOSAL_SENT = 'proposal_sent',
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
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costUnitPrice?: number | null;
  wastePercent?: number;
  costCategory?: 'material' | 'labor' | 'logistics' | 'subcontractor' | 'overhead';
  quantitySource?: 'manual' | 'ai_estimate' | 'document' | 'model' | 'verified';
  priceSource?: 'manual' | 'ai_estimate' | 'supplier' | 'market' | 'verified';
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
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
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
