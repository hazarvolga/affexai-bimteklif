import { z } from "zod";
import { currencyEnum, quoteStatusEnum } from "../../db/schema";

const number = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number<string | number>().finite().nonnegative());
const percent = number.refine(value => value <= 100, "Percentage must not exceed 100");
const text = z.string().trim().min(1);
const date = z.string().trim().min(1).pipe(z.coerce.date());

export const quotationStatusInput = z.enum(quoteStatusEnum.enumValues);

// Source snapshots are server-built; only the benchmark lookup ID is accepted.
export const manualQuotationInput = z.object({
  clientId: z.string().uuid(),
  quoteNumber: text,
  projectName: text,
  date,
  expiryDate: date,
  currency: z.enum(currencyEnum.enumValues).default("TRY"),
  status: quotationStatusInput.default("draft"),
  notes: z.string().nullable().optional(),
  industryId: text.nullable().optional(),
  projectDurationMonths: number.pipe(z.number().int().min(1).max(600)).default(1),
  escalationVolatilityPercent: percent.default(0),
  procurementProfile: z.enum(["standard", "low_carbon", "high_carbon_risk"]).default("standard"),
  carbonRiskPremiumPercent: percent.default(0),
  informationDeliveryLevel: z.enum(["none", "as_built", "cobie", "digital_twin"]).default("none"),
  informationDeliveryCostPercent: percent.default(0),
  items: z.array(z.object({
    benchmarkStagingId: z.string().uuid().optional(),
    description: text,
    unit: text,
    quantity: number.refine(value => value > 0, "Quantity must be positive"),
    unitPrice: number,
    costUnitPrice: z.preprocess(value => value === "" ? null : value, number.nullable().optional()),
    wastePercent: percent.default(0),
    costCategory: text.default("material"),
    discountPercent: percent.default(0),
    vatPercent: percent.default(20),
  })).min(1).max(1000),
});

export type ManualQuotationInput = z.infer<typeof manualQuotationInput>;
