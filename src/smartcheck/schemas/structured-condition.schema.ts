import { z } from 'zod';

export const StructuredConditionSchema = z.object({
  schemaVersion: z.literal(1),
  subjectType: z.string().min(1), // Örn: 'column', 'beam'
  parameter: z.string().min(1), // Örn: 'poz_code', 'unit'
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'matches_regex',
    'greater_than',
    'less_than'
  ]),
  expectedValue: z.string(),
  unit: z.string().optional()
});

export type StructuredCondition = z.infer<typeof StructuredConditionSchema>;