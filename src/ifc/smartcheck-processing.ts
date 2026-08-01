import { parseIfcText } from "./parser/legacy-parser";
import { buildIfcSmartCheckEvidenceArtifact, type IfcEvidenceDocumentContext, type IfcSmartCheckEvidenceArtifact } from "./smartcheck-evidence";

export interface IfcSmartCheckProcessingInput {
  fileName: string;
  checksumSha256: string;
  content: Buffer;
  parserVersion?: string;
}

function extractIfcSchemaName(ifcText: string): string | undefined {
  return ifcText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)?.[1];
}

export function buildIfcSmartCheckEvidenceFromContent(input: IfcSmartCheckProcessingInput): IfcSmartCheckEvidenceArtifact {
  const ifcText = input.content.toString("utf8");
  const parsed = parseIfcText(ifcText);
  const document: IfcEvidenceDocumentContext = {
    fileName: input.fileName,
    checksumSha256: input.checksumSha256,
    schemaName: extractIfcSchemaName(ifcText),
    parserVersion: input.parserVersion ?? "legacy-ifc-evidence-v1",
  };

  return buildIfcSmartCheckEvidenceArtifact(parsed.elements, parsed.summary, document);
}
