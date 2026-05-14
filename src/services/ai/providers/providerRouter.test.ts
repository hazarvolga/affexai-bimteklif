import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AIProviderRouter } from "./providerRouter";
import type { AIProvider, AIQuotationInput, AIQuotationResult } from "./types";

function fakeProvider(name: string, configured: boolean, result?: AIQuotationResult): AIProvider {
  return {
    name,
    isConfigured: () => configured,
    generateQuotation: async () => {
      if (!result) throw new Error(`${name} failed`);
      return result;
    },
    improveQuotation: async () => {
      if (!result) throw new Error(`${name} failed`);
      return [];
    },
  };
}

const input: AIQuotationInput = {
  inputText: "villa tadilatı",
  industryId: "residential",
  plugin: {},
};

const quotation: AIQuotationResult = {
  projectType: "Residential - residential",
  confidence: 0.91,
  industryId: "residential",
  lineItems: [],
  assumptions: [],
  riskFlags: [],
  riskLevel: "low",
};

describe("AIProviderRouter", () => {
  it("falls back to the next configured provider when primary fails", async () => {
    const router = new AIProviderRouter([
      fakeProvider("primary", true),
      fakeProvider("fallback", true, quotation),
    ]);

    assert.deepEqual(await router.generateQuotation(input), quotation);
  });

  it("fails clearly when no provider is configured", async () => {
    const router = new AIProviderRouter([
      fakeProvider("primary", false),
      fakeProvider("fallback", false),
    ]);

    await assert.rejects(
      () => router.generateQuotation(input),
      /No AI provider is configured/
    );
  });
});
