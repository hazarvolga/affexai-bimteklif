import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import officialCatalogs from '../src/server/crawler/data/csb-2026-official-catalogs.json';
import { parseCsbPdfText } from '../src/server/crawler/csb-pdf-parser';
import {
  assertCsb2026EvidenceParity,
  assertSha256Match,
  auditCsbCatalogs,
  compareCatalogReparse,
  CSB_2026_EXPECTED_TOTAL_ROWS,
  evaluateCommercialAuthorization,
  type AuditableCatalogMap,
  type CatalogReparseComparison,
  type CatalogSourceArtifact,
  type CommercialAuthorizationRecord,
} from '../src/services/pricing/catalog-audit';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_REGISTER_PATH = path.join(ROOT, 'docs/audits/phase-0/source-register.json');
const OUTPUT_DIR = path.join(ROOT, 'docs/audits/phase-1');
const JSON_OUTPUT = path.join(OUTPUT_DIR, 'CSB_2026_CATALOG_AUDIT.json');
const MARKDOWN_OUTPUT = path.join(OUTPUT_DIR, 'CSB_2026_CATALOG_AUDIT.md');
const AUDIT_PYTHON = process.env.CSB_AUDIT_PYTHON ?? path.join(ROOT, 'workers/ifc/.venv/bin/python');

interface SourceRegister {
  asOf: string;
  sources: Array<{
    id: string;
    commercialUseAuthorization?: CommercialAuthorizationRecord;
    artifacts?: CatalogSourceArtifact[];
  }>;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function safeEvidenceFile(relativePath: string, allowedExtensions: readonly string[]): string {
  const rootRealPath = fs.realpathSync(ROOT);
  const candidate = path.resolve(ROOT, relativePath);
  const candidateRealPath = fs.realpathSync(candidate);
  if (!candidateRealPath.startsWith(`${rootRealPath}${path.sep}`)) throw new Error(`Evidence path escapes repository: ${relativePath}`);
  const stat = fs.statSync(candidateRealPath);
  if (!stat.isFile() || stat.size > 64 * 1024 * 1024) throw new Error(`Evidence file is invalid or too large: ${relativePath}`);
  if (!allowedExtensions.includes(path.extname(candidateRealPath).toLowerCase())) throw new Error(`Evidence extension is not allowed: ${relativePath}`);
  return candidateRealPath;
}

function readSourceEvidence(): {
  asOf: string;
  authorization: CommercialAuthorizationRecord | undefined;
  artifacts: CatalogSourceArtifact[];
} {
  const register = JSON.parse(fs.readFileSync(SOURCE_REGISTER_PATH, 'utf8')) as SourceRegister;
  const source = register.sources.find((candidate) => candidate.id === 'CSB2026');
  if (!source?.artifacts || source.artifacts.length === 0) {
    throw new Error('CSB2026 source artifacts are missing from the Phase 0 source register.');
  }
  return {
    asOf: register.asOf,
    authorization: source.commercialUseAuthorization,
    artifacts: source.artifacts,
  };
}

function reparseArtifact(
  artifact: CatalogSourceArtifact,
  catalog: AuditableCatalogMap[string]
): { comparison: CatalogReparseComparison; extractedTextCharacters: number } {
  const text = execFileSync(
    AUDIT_PYTHON,
    [
      '-c',
      'import sys, pypdf; r=pypdf.PdfReader(sys.argv[1]); print("\\n".join(p.extract_text() or "" for p in r.pages))',
      safeEvidenceFile(artifact.localPath, ['.pdf']),
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 }
  );
  if (text.trim().length < 20) throw new Error(`pypdf produced no usable text for ${artifact.catalogId}`);
  const rows = parseCsbPdfText(text, 20_000);
  return {
    comparison: compareCatalogReparse(catalog.rows, rows),
    extractedTextCharacters: text.length,
  };
}

function buildMarkdown(report: ReturnType<typeof createReport>): string {
  const audit = report.structuralAudit;
  const exactBooks = report.sameImplementationReparse.books.filter(
    (book) => book.exactMatchCount === book.embeddedRowCount && book.reparsedRowCount === book.embeddedRowCount
  );
  const exactBookRows = exactBooks.reduce((sum, book) => sum + book.embeddedRowCount, 0);
  const incompleteBooks = report.sameImplementationReparse.books.filter((book) => !exactBooks.includes(book));
  const incompleteSummary = incompleteBooks
    .map(
      (book) =>
        `- \`${book.catalogId}\`: gömülü **${book.embeddedRowCount.toLocaleString('tr-TR')}**, yeniden parse **${book.reparsedRowCount.toLocaleString('tr-TR')}**, tam eşleşme **${book.exactMatchCount.toLocaleString('tr-TR')}**.`
    )
    .join('\n');
  const bookRows = report.sourceDocuments
    .map((source) => {
      const book = audit.books.find((candidate) => candidate.catalogId === source.catalogId)!;
      const reparse = report.sameImplementationReparse.books.find(
        (candidate) => candidate.catalogId === source.catalogId
      )!;
      return `| ${source.catalogId} | ${book.kind} | ${book.rowCount.toLocaleString('tr-TR')} | ${book.structurallyUsableCount.toLocaleString('tr-TR')} | ${reparse.exactMatchCount.toLocaleString('tr-TR')} / ${reparse.embeddedRowCount.toLocaleString('tr-TR')} | ${source.hashMatches ? 'eşleşti' : 'EŞLEŞMEDİ'} |`;
    })
    .join('\n');

  return `# ÇŞİDB 2026 katalog yapısal ve kaynak denetimi

**Tarih:** ${report.asOf}
**Kapsam:** Faz 1 / T05
**Veri seti:** ${audit.catalogCount} gömülü katalog, ${audit.totalRowCount.toLocaleString('tr-TR')} kayıt

## Sonuç

- Toplam kayıt: **${audit.totalRowCount.toLocaleString('tr-TR')}**; benzersiz kod: **${audit.uniqueCodeCount.toLocaleString('tr-TR')}**.
- Doğrudan birim fiyat/rayiç kaydı: **${audit.directPriceRowCount.toLocaleString('tr-TR')}**.
- Yapı yaklaşık maliyet sınıfı: **${audit.approximateCostClassRowCount}**; TÜİK endeks eşlemesi: **${audit.indexMappingRowCount}**. Bu iki grup doğrudan poz fiyatı sayılmadı.
- Yapısal olarak kullanılabilir kayıt: **${audit.structurallyUsableCount.toLocaleString('tr-TR')}**.
- Yapısal olarak doğrudan fiyat seçimine uygun kayıt: **${audit.structurallySelectableDirectPriceCount.toLocaleString('tr-TR')}**.
- Mevcut yayın/politika kapısında seçilebilir kayıt: **${report.releaseSelectionGate.selectableCount}**. Faz 0 ticari kullanım kaydı \`${report.commercialUseAuthorizationStatus}\`; ayrıca kayıt onayı, tenant kaynağı ve geçerlilik çözümü T08–T09 kapsamındadır. T05 yapısal uygunluğu tek başına yayın yetkisine dönüştürmez.
- Duplicate kod: **${audit.duplicateCodeCount}**; çelişkili duplicate: **${audit.conflictingCodeCount}**; eksik alan: **${audit.missingFieldRowCount}**; sıfır/negatif fiyat: **${audit.nonPositivePriceRowCount}**; geçersiz fiyat: **${audit.invalidPriceRowCount}**; poz biçimi hatası: **${audit.invalidCodeFormatRowCount}**; izin verilen normalize sözlük dışındaki birim: **${audit.nonCanonicalUnitRowCount}**.
- İzin verilen normalize birimler: ${audit.allowedNormalizedUnits.map((unit) => `\`${unit}\``).join(', ')}. Bu kontrol yalnız normalize sözlük üyeliğidir; pozun beklenen ölçü birimiyle semantik uygunluğu T06–T07 kapısındadır.

## Kitap ve kaynak doğrulaması

| Katalog | Tür | Gömülü satır | Yapısal kullanılabilir | Aynı uygulamayla yeniden parse tam eşleşme | PDF SHA-256 |
|---|---|---:|---:|---:|---|
${bookRows}

${report.sourceDocuments.length} kaynak PDF'nin hesaplanan SHA-256 değeri Faz 0 kaynak kaydı ve gömülü katalog metadata'sıyla birebir eşleşti. Sayım ve hash doğrulaması, katalog kullanım lisansı veya fiyat onayı değildir.

## Yeniden parse sınırı

Kaynak PDF'ler pinned extractor \`${report.sameImplementationReparse.extractor.name} ${report.sameImplementationReparse.extractor.version}\` ve \`parseCsbPdfText\` ile gömülü katalog kısa devresi kullanılmadan tekrar işlendi. Bu kontrol gömülü veriyi üreten **aynı uygulama satır parser'ını** kullandığı için bağımsız parser doğrulaması değildir.

- Aynı uygulamayla tam eşleşen kayıt: **${report.sameImplementationReparse.exactMatchCount.toLocaleString('tr-TR')} / ${audit.totalRowCount.toLocaleString('tr-TR')}** (**%${report.sameImplementationReparse.exactCoveragePercent.toLocaleString('tr-TR')}**).
- Tam eşleşen ${exactBooks.length} kitapta **${exactBookRows.toLocaleString('tr-TR')} / ${exactBookRows.toLocaleString('tr-TR')}** kayıt eşleşti.
${incompleteSummary || '- Eksik yeniden parse kitabı yok.'}
- Eksik yeniden parse kayıtları için bağımsız çıkarım veya satır/sayfa provenance kanıtı bulunmadığından kaynak-parite sonucu açık kaldı.
- Bilinen PDF hashleri normal \`parseCsbPdfDocument\` yolunda yeniden parse edilmeden gömülü JSON'a yönlenir. Bu denetim o kısa devreyi özellikle atladı; normal import başarısı bağımsız parse kanıtı sayılamaz.

## Kapanış yorumu

T05'in yapısal tarama bölümü tamamlandı: ${audit.totalRowCount.toLocaleString('tr-TR')} kayıt ${audit.catalogCount} katalog türüne ayrıldı; uydurma kod, duplicate, çelişki, eksik alan, poz biçimi, birim ve fiyat kontrolleri tam veri setinde çalıştırıldı. Ticari kullanım yetkisi ve ${audit.indexMappingRowCount.toLocaleString('tr-TR')} endeks kaydının bağımsız kaynak-paritesi açık olduğundan bunlar seçilebilir resmî fiyat kanıtı olarak yükseltilmedi.
`;
}

function createReport() {
  const catalogs = officialCatalogs as AuditableCatalogMap;
  const evidence = readSourceEvidence();
  assertCsb2026EvidenceParity(catalogs, evidence.artifacts);
  const structuralAudit = auditCsbCatalogs(catalogs);
  const authorizationArtifact = evidence.authorization?.evidenceArtifact;
  let actualAuthorizationEvidenceSha256: string | undefined;
  if (authorizationArtifact?.path) {
    try {
      const evidencePath = safeEvidenceFile(authorizationArtifact.path, ['.pdf', '.md', '.json', '.txt']);
      actualAuthorizationEvidenceSha256 = sha256(fs.readFileSync(evidencePath));
    } catch {
      actualAuthorizationEvidenceSha256 = undefined;
    }
  }
  const authorizationEvaluation = evaluateCommercialAuthorization(
    evidence.authorization,
    actualAuthorizationEvidenceSha256
  );
  const extractorVersion = execFileSync(AUDIT_PYTHON, ['-c', 'import pypdf; print(pypdf.__version__)'], {
    encoding: 'utf8',
  }).trim();
  const pinnedVersion = fs
    .readFileSync(path.join(ROOT, 'workers/ifc/requirements.txt'), 'utf8')
    .match(/^pypdf==(\S+)$/m)?.[1];
  if (!pinnedVersion || extractorVersion !== pinnedVersion) {
    throw new Error(`Pinned pypdf mismatch: runtime=${extractorVersion}, requirements=${pinnedVersion ?? 'missing'}`);
  }
  const sourceDocuments = evidence.artifacts.map((artifact) => {
    const catalog = catalogs[artifact.catalogId];
    if (!catalog) throw new Error(`Missing embedded catalog: ${artifact.catalogId}`);
    const buffer = fs.readFileSync(safeEvidenceFile(artifact.localPath, ['.pdf']));
    const actualSha256 = sha256(buffer);
    assertSha256Match(artifact.catalogId, artifact.sha256, actualSha256);
    return {
      catalogId: artifact.catalogId,
      localPath: artifact.localPath,
      expectedSha256: artifact.sha256,
      actualSha256,
      hashMatches: actualSha256 === artifact.sha256,
      byteLength: buffer.length,
      accessOrLicense: artifact.accessOrLicense,
    };
  });
  const reparseBooks = evidence.artifacts.map((artifact) => ({
    catalogId: artifact.catalogId,
    ...reparseArtifact(artifact, catalogs[artifact.catalogId]),
  }));
  const exactMatchCount = reparseBooks.reduce((sum, book) => sum + book.comparison.exactMatchCount, 0);

  return {
    schemaVersion: 1,
    asOf: evidence.asOf,
    task: 'T05',
    commercialUseAuthorization: {
      record: evidence.authorization ?? null,
      ...authorizationEvaluation,
    },
    commercialUseAuthorizationStatus: evidence.authorization?.status ?? 'missing',
    releaseSelectionGate: {
      evaluated: true,
      status: 'closed',
      selectableCount: 0,
      reasons: [
        ...authorizationEvaluation.reasons,
        'row approval, tenant source resolution and validity selection belong to T08-T09',
      ],
    },
    structuralAudit,
    sourceDocuments,
    sameImplementationReparse: {
      independent: false,
      extractor: {
        name: 'pypdf',
        version: extractorVersion,
        pythonExecutable: path.relative(ROOT, AUDIT_PYTHON),
        requirementsPath: 'workers/ifc/requirements.txt',
      },
      method: 'pypdf page text extraction + parseCsbPdfText; sealed-catalog shortcut bypassed',
      limitation:
        'The same application parser is used; this is reproducibility evidence, not an independently implemented parser or expert source-row verification.',
      exactMatchCount,
      exactCoveragePercent:
        structuralAudit.totalRowCount === 0
          ? 100
          : Math.round((exactMatchCount / structuralAudit.totalRowCount) * 10_000) / 100,
      books: reparseBooks.map(({ catalogId, extractedTextCharacters, comparison }) => ({
        catalogId,
        extractedTextCharacters,
        ...comparison,
      })),
    },
    conclusions: {
      embeddedCountProven: structuralAudit.totalRowCount === CSB_2026_EXPECTED_TOTAL_ROWS,
      hashesMatch: sourceDocuments.every((document) => document.hashMatches),
      structuralScanPassed:
        structuralAudit.structurallyUsableCount === structuralAudit.totalRowCount &&
        structuralAudit.duplicateCodeCount === 0,
      independentSourceParityProven: false,
      releaseSelectableDirectPriceCount: 0,
      auditStatus: 'pass_with_explicit_authorization_and_source_parity_gates',
    },
  };
}

const report = createReport();
const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = buildMarkdown(report);
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const currentJson = fs.existsSync(JSON_OUTPUT) ? fs.readFileSync(JSON_OUTPUT, 'utf8') : '';
  const currentMarkdown = fs.existsSync(MARKDOWN_OUTPUT) ? fs.readFileSync(MARKDOWN_OUTPUT, 'utf8') : '';
  if (currentJson !== json || currentMarkdown !== markdown) {
    throw new Error('Committed ÇŞİDB 2026 catalog audit outputs are stale.');
  }
} else {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUTPUT, json);
  fs.writeFileSync(MARKDOWN_OUTPUT, markdown);
}

console.log(
  JSON.stringify({
    output: path.relative(ROOT, JSON_OUTPUT),
    totalRows: report.structuralAudit.totalRowCount,
    directPriceRows: report.structuralAudit.directPriceRowCount,
    releaseSelectable: report.releaseSelectionGate.selectableCount,
    sameImplementationExactMatches: report.sameImplementationReparse.exactMatchCount,
  })
);
