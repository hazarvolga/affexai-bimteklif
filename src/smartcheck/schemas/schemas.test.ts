import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SourceEvidenceSchema, SourceEvidenceListSchema } from './source-evidence.schema';
import { StructuredConditionSchema } from './structured-condition.schema';

describe('SourceEvidenceSchema validation', () => {
  it('should validate a correct PDF evidence', () => {
    const validPdf = {
      sourceType: 'pdf',
      documentId: '861404ab-e81f-49c0-a2d1-33c4a0e34918',
      pageNumber: 5,
      sectionTitle: 'Structural Design',
      sourceText: 'Concrete strength must be C30',
      extractionConfidence: 0.95
    };
    const result = SourceEvidenceSchema.safeParse(validPdf);
    assert.strictEqual(result.success, true);
  });

  it('should validate a correct DOCX evidence', () => {
    const validDocx = {
      sourceType: 'docx',
      documentId: '861404ab-e81f-49c0-a2d1-33c4a0e34918',
      paragraphIndex: 12,
      sourceText: 'All doors must have at least 90cm width',
      extractionConfidence: 0.88
    };
    const result = SourceEvidenceSchema.safeParse(validDocx);
    assert.strictEqual(result.success, true);
  });

  it('should validate a correct XLSX evidence', () => {
    const validXlsx = {
      sourceType: 'xlsx',
      documentId: '861404ab-e81f-49c0-a2d1-33c4a0e34918',
      sheetName: 'Sheet1',
      cellRange: 'A1:C10',
      sourceText: 'Column: C30, Qty: 5',
      extractionConfidence: 0.99
    };
    const result = SourceEvidenceSchema.safeParse(validXlsx);
    assert.strictEqual(result.success, true);
  });

  it('should fail if a required field is missing', () => {
    const invalidPdf = {
      sourceType: 'pdf',
      documentId: '861404ab-e81f-49c0-a2d1-33c4a0e34918',
      // pageNumber missing
      sourceText: 'Concrete strength must be C30',
      extractionConfidence: 0.95
    };
    const result = SourceEvidenceSchema.safeParse(invalidPdf);
    assert.strictEqual(result.success, false);
  });

  it('should fail if confidence score is out of [0, 1] range', () => {
    const invalidPdf = {
      sourceType: 'pdf',
      documentId: '861404ab-e81f-49c0-a2d1-33c4a0e34918',
      pageNumber: 2,
      sourceText: 'Error',
      extractionConfidence: 1.5 // invalid
    };
    const result = SourceEvidenceSchema.safeParse(invalidPdf);
    assert.strictEqual(result.success, false);
  });

  it('should fail if source evidence list is empty', () => {
    const result = SourceEvidenceListSchema.safeParse([]);
    assert.strictEqual(result.success, false);
  });
});

describe('StructuredConditionSchema validation', () => {
  it('should validate a correct condition', () => {
    const validCondition = {
      schemaVersion: 1,
      subjectType: 'column',
      parameter: 'poz_code',
      operator: 'equals',
      expectedValue: 'COL-01'
    };
    const result = StructuredConditionSchema.safeParse(validCondition);
    assert.strictEqual(result.success, true);
  });

  it('should fail if operator is invalid', () => {
    const invalidCondition = {
      schemaVersion: 1,
      subjectType: 'column',
      parameter: 'poz_code',
      operator: 'invalid_op', // invalid
      expectedValue: 'COL-01'
    };
    const result = StructuredConditionSchema.safeParse(invalidCondition);
    assert.strictEqual(result.success, false);
  });
});
