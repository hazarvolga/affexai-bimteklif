export type ContractRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  operation: string;
  kind: "read" | "write";
};

export type BoundedContextContract = {
  context: string;
  version: string;
  writeOwner: "express-pilot" | "nestjs-target";
  routes: readonly ContractRoute[];
  cutoverStatus: "pilot-reference" | "foundation" | "cutover-ready";
};

/**
 * The inventory is intentionally small and explicit. It is the parity
 * checklist seed for a future apps/api NestJS module; it does not create a
 * second runtime or a second database write owner.
 */
export const contextContracts = [
  {
    context: "smartcheck",
    version: "smartcheck.v1",
    writeOwner: "express-pilot",
    cutoverStatus: "foundation",
    routes: [
      { method: "POST", path: "/api/smartcheck/documents/uploads", operation: "createUpload", kind: "write" },
      { method: "PUT", path: "/api/smartcheck/documents/:id/content", operation: "uploadContent", kind: "write" },
      { method: "POST", path: "/api/smartcheck/documents/:id/complete", operation: "completeUpload", kind: "write" },
      { method: "GET", path: "/api/smartcheck/documents/:id/preview", operation: "previewDocument", kind: "read" },
      { method: "PATCH", path: "/api/smartcheck/documents/:id/mapping", operation: "updateMapping", kind: "write" },
      { method: "POST", path: "/api/smartcheck/documents/:id/process", operation: "queueProcessing", kind: "write" },
      { method: "POST", path: "/api/smartcheck/documents/:id/retry", operation: "retryProcessing", kind: "write" },
      { method: "POST", path: "/api/smartcheck/documents/:id/recover-stale", operation: "recoverStaleProcessing", kind: "write" },
      { method: "GET", path: "/api/smartcheck/documents/:id/status", operation: "getDocumentStatus", kind: "read" },
      { method: "GET", path: "/api/smartcheck/documents/:id/rows", operation: "getNormalizedRows", kind: "read" },
      { method: "GET", path: "/api/smartcheck/queue", operation: "getProcessingQueue", kind: "read" },
      { method: "PATCH", path: "/api/smartcheck/rows/:id/review", operation: "reviewRow", kind: "write" },
      { method: "POST", path: "/api/smartcheck/documents/:id/transfer-to-quotation", operation: "transferApprovedRows", kind: "write" },
    ],
  },
  {
    context: "quotations",
    version: "quotation.v1",
    writeOwner: "express-pilot",
    cutoverStatus: "pilot-reference",
    routes: [
      { method: "GET", path: "/api/quotations/:id", operation: "getQuotation", kind: "read" },
      { method: "POST", path: "/api/quotations", operation: "createQuotation", kind: "write" },
      { method: "POST", path: "/api/quotations/:id/revision", operation: "createRevision", kind: "write" },
      { method: "GET", path: "/api/quotations/:id/pdf", operation: "generatePdf", kind: "read" },
    ],
  },
  {
    context: "academy",
    version: "academy.v1",
    writeOwner: "express-pilot",
    cutoverStatus: "pilot-reference",
    routes: [],
  },
] as const satisfies readonly BoundedContextContract[];

export function validateContextContracts(contracts: readonly BoundedContextContract[] = contextContracts): string[] {
  const errors: string[] = [];
  const contexts = new Set<string>();
  for (const contract of contracts) {
    if (contexts.has(contract.context)) errors.push(`duplicate_context:${contract.context}`);
    contexts.add(contract.context);
    if (!contract.version.includes(".v")) errors.push(`unversioned_context:${contract.context}`);
    const routeKeys = new Set<string>();
    for (const route of contract.routes) {
      const key = `${route.method} ${route.path}`;
      if (routeKeys.has(key)) errors.push(`duplicate_route:${contract.context}:${key}`);
      routeKeys.add(key);
      if (route.kind === "write" && contract.writeOwner !== "express-pilot" && contract.cutoverStatus !== "cutover-ready") {
        errors.push(`unsafe_write_owner:${contract.context}`);
      }
    }
  }
  return errors;
}
