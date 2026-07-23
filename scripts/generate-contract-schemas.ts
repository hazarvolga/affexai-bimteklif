import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { contextContracts } from "../src/contracts/context-contracts";
import {
  SMARTCHECK_CONTRACT_VERSION,
  smartcheckCompleteRequestSchema,
  smartcheckMappingRequestSchema,
  smartcheckRowReviewRequestSchema,
  smartcheckTransferRequestSchema,
  smartcheckUploadRequestSchema,
} from "../src/contracts/smartcheck";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs/architecture/generated");

const schemas = {
  SmartCheckUploadRequest: zodToJsonSchema(smartcheckUploadRequestSchema, { $refStrategy: "none" }),
  SmartCheckCompleteRequest: zodToJsonSchema(smartcheckCompleteRequestSchema, { $refStrategy: "none" }),
  SmartCheckMappingRequest: zodToJsonSchema(smartcheckMappingRequestSchema, { $refStrategy: "none" }),
  SmartCheckRowReviewRequest: zodToJsonSchema(smartcheckRowReviewRequestSchema, { $refStrategy: "none" }),
  SmartCheckTransferRequest: zodToJsonSchema(smartcheckTransferRequestSchema, { $refStrategy: "none" }),
} as const;

const requestSchemaByOperation: Record<string, keyof typeof schemas> = {
  createUpload: "SmartCheckUploadRequest",
  completeUpload: "SmartCheckCompleteRequest",
  updateMapping: "SmartCheckMappingRequest",
  reviewRow: "SmartCheckRowReviewRequest",
  transferApprovedRows: "SmartCheckTransferRequest",
};

function operationPath(pathname: string) {
  return pathname.replaceAll(":id", "{id}").replaceAll(":sourceId", "{sourceId}").replaceAll(":snapshotId", "{snapshotId}");
}

function responseSchema() {
  return { type: "object", additionalProperties: true };
}

const paths: Record<string, Record<string, unknown>> = {};
for (const contract of contextContracts) {
  for (const route of contract.routes) {
    const pathname = operationPath(route.path);
    const method = route.method.toLowerCase();
    const requestSchemaName = requestSchemaByOperation[route.operation];
    const operation: Record<string, unknown> = {
      operationId: route.operation,
      tags: [contract.context],
      security: [{ bearerAuth: [] }],
      responses: {
        "2XX": { description: "Successful response", content: { "application/json": { schema: responseSchema() } } },
        "4XX": { description: "Client or authorization error" },
      },
      "x-write-owner": contract.writeOwner,
      "x-contract-status": contract.cutoverStatus,
    };
    if (requestSchemaName) {
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: { $ref: `#/components/schemas/${requestSchemaName}` } } },
      };
    }
    (paths[pathname] ??= {})[method] = operation;
  }
}

const openApi = {
  openapi: "3.1.0",
  info: {
    title: "TeklifPro pilot contract surface",
    version: SMARTCHECK_CONTRACT_VERSION,
    description: "Generated request-boundary and cutover inventory. Express remains the pilot write owner.",
  },
  servers: [{ url: "/" }],
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    schemas,
  },
} as const;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "smartcheck.v1.json"), `${JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://teklifpro.local/contracts/smartcheck.v1.json", title: "TeklifPro SmartCheck transport contracts", type: "object", properties: schemas }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "teklifpro.openapi.json"), `${JSON.stringify(openApi, null, 2)}\n`);

console.log(`Generated ${Object.keys(schemas).length} schemas and ${Object.keys(paths).length} paths.`);
