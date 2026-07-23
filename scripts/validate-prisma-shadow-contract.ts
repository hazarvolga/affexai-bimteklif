import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve(process.cwd(), "prisma/shadow/schema.prisma");
const source = fs.readFileSync(schemaPath, "utf8");
const requiredModels = [
  "User",
  "Company",
  "Membership",
  "Client",
  "Quotation",
  "QuotationItem",
  "QuotationItemEvidence",
  "Document",
  "DocumentProcessingRun",
  "NormalizedQuantityRow",
  "SmartcheckAuditLog",
  "SmartcheckPilotCase",
  "SmartcheckPilotMeasurement",
] as const;

const blocks = new Map<string, string>();
for (const match of source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) blocks.set(match[1], match[2]);

const errors: string[] = [];
for (const model of requiredModels) {
  const block = blocks.get(model);
  if (!block) {
    errors.push(`missing_model:${model}`);
    continue;
  }
  if (!/\n\s+companyId\s+String\s+@map\("company_id"\)/.test(block) && model !== "Company" && model !== "Membership" && model !== "User") errors.push(`missing_tenant_key:${model}`);
}

for (const model of ["Document", "DocumentProcessingRun", "NormalizedQuantityRow", "QuotationItem", "QuotationItemEvidence", "SmartcheckPilotCase", "SmartcheckPilotMeasurement"]) {
  const block = blocks.get(model) ?? "";
  if (!block.includes("@@unique([id, companyId]")) errors.push(`missing_tenant_identity_unique:${model}`);
}

if (!source.includes("single write owner") || !source.includes("Express + Drizzle")) errors.push("missing_write_owner_guardrail");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Prisma shadow contract valid: ${requiredModels.length} tenant-aware models.`);
}
