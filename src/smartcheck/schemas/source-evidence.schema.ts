import { z } from 'zod';

export const PdfEvidenceSchema = z.object({
  sourceType: z.literal('pdf'),
  documentId: z.string().uuid(),
  pageNumber: z.number().int().positive(),
  sectionTitle: z.string().optional(),
  sourceText: z.string().min(1),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const DocxEvidenceSchema = z.object({
  sourceType: z.literal('docx'),
  documentId: z.string().uuid(),
  sectionTitle: z.string().optional(),
  paragraphIndex: z.number().int().nonnegative().optional(),
  sourceText: z.string().min(1),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const XlsxEvidenceSchema = z.object({
  sourceType: z.literal('xlsx'),
  documentId: z.string().uuid(),
  sheetName: z.string().min(1),
  cellRange: z.string().min(1),
  sourceText: z.string().min(1),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const SourceEvidenceSchema = z.discriminatedUnion('sourceType', [
  PdfEvidenceSchema,
  DocxEvidenceSchema,
  XlsxEvidenceSchema
]);

export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const SourceEvidenceListSchema = z.array(SourceEvidenceSchema).min(1);

export type SourceEvidenceList = z.infer<typeof SourceEvidenceListSchema>;
