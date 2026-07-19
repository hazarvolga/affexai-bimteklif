# SmartCheck Evaluation Baseline

**Design Status: Approved v1.3 — Core implementation completed**

Bu belge, SmartCheck Faz 1 kapsamında geliştirilecek olan deterministik değerlendirme altyapısının (Evaluation Harness) mimari tasarımını, veri yapılarını, metrik tanımlarını ve doğrulama mantığını açıklar.

---

## 1. Amaç ve Kapsam

Evaluation Harness'ın temel amacı, yapay zekâ entegrasyonu (OpenAI/Gemini) veya gerçek dosya ayrıştırma (OCR/Parsing) adımlarına başlamadan önce, sistem çıktı kalitesini ölçebilen deterministik ve tekrarlanabilir bir doğrulama iskeleti kurmaktır.

> [!IMPORTANT]
> **Temel İlke:** Ölçemediğimiz hiçbir yapay zekâ çıktısını veya kural adayını production pipeline’ına bağlamayacağız.

Bu milestone kapsamında:
- **Yasak Olanlar:** OpenAI/Gemini API çağrıları, gerçek OCR veya dosya parser entegrasyonları, S3/MinIO işlemleri, veritabanı yazma/okuma, yeni veritabanı migration'ları ve herhangi bir UI/Express endpoint geliştirmesi.
- **Kabul Edilenler:** Sadece sentetik fixture verileri, deterministik normalize/matching algoritmaları, metrik hesaplama motoru ve komut satırı arayüzü (CLI).

---

## 2. Dataset Ayrımı

Değerlendirme süreçlerinin doğruluğunu korumak ve model optimizasyonu (prompt tuning) sırasında veri sızıntısını (overfitting) önlemek amacıyla fixture'lar üç gruba ayrılır:

1.  **Development Set:** Model prompt'larını geliştirirken ve değerlendirme sistemini iyileştirirken kullandığımız açık vakalar.
2.  **Blind Evaluation Set:** Blind evaluation, güvenlik veya erişim gizliliği değil; development ve prompt-tuning sürecinden ayrı tutulan süreçsel bir değerlendirme setidir. Sonuçları development setinden ayrı aggregate ve rapor edilir.
3.  **Robustness Set:** Boş dosyalar, bozuk PDF'ler, parola korumalı belgeler, desteklenmeyen dosya formatları, karışık dilli veya bozuk tablolu girdiler gibi sistemin kararlılığını ölçen stres vakaları.

---

## 3. Planlanan Dosya Ağacı

Proje genelinde oluşturulacak klasör ve dosya yapısı aşağıdaki gibi olacaktır:

```text
fixtures/
└── smartcheck/
    └── v1/
        ├── development/
        │   ├── pdf-basic-001/
        │   │   ├── manifest.json
        │   │   ├── input.pdf
        │   │   ├── expected-rules.json
        │   │   └── candidate-output.json
        │   └── ...
        ├── blind-evaluation/
        ├── robustness/
        └── schemas/
            ├── manifest.schema.json
            └── expected-rules.schema.json

src/
└── smartcheck/
    └── evaluation/
        ├── types.ts                # Zod şemaları ve TS tipleri
        ├── normalize.ts            # Metinsel ve sayısal normalizasyon yardımcıları
        ├── matcher.ts              # Deterministik Fingerprint üretimi ve eşleştirme motoru
        ├── metrics.ts              # Precision, recall, f1 ve genel metrik hesaplama
        ├── evidence-metrics.ts     # Kaynak kanıt lokasyon doğruluğu metrikleri
        ├── fixture-loader.ts       # Fixture disk okuma ve şema validasyon katmanı
        ├── evaluator.ts            # Pipeline yürütücü
        └── cli.ts                  # CLI arayüzü
```

---

## 4. Veri Yapıları ve Zod Şemaları

Evaluation harness'ının bağımsız çalışabilmesi için veritabanı bağlantılarına ihtiyaç duymayan, ancak kavramsal olarak production şemaları ile tam uyumlu Zod şemaları ve tipleri oluşturulmuştur.

### A. Ortak Şemalar ve Enum Tanımları
```typescript
import { z } from 'zod';
import { SourceEvidenceSchema } from '../schemas/source-evidence.schema';

export const OperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'matches_regex',
  'greater_than',
  'less_than'
]);

export const ErrorCategorySchema = z.enum([
  'classification_code',
  'quantity_unit',
  'modeling_standard',
  'missing_duplicate',
  'pricing_margin'
]);

export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const RuleScopeTypeSchema = z.enum(['company', 'quotation']);

export const SourceEvidenceListSchema = z.array(SourceEvidenceSchema).min(1);
```

### B. Fixture Manifest Şeması (`manifest.json`)
Her bir test vakasının meta verisini ve beklentilerini tanımlar.

```typescript
export const ManifestExpectationOutcomeSchema = z.enum([
  'rules_found',
  'no_rules',
  'unsupported',
  'corrupt',
  'password_protected',
  'parse_failure'
]);

export const EvaluationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  caseId: z.string().min(1),
  dataset: z.enum(['development', 'blind-evaluation', 'robustness']),
  input: z.object({
    file: z.string().min(1),
    mimeType: z.string().min(1),
    language: z.array(z.string()).min(1)
  }),
  expectation: z.object({
    outcome: ManifestExpectationOutcomeSchema,
    expectedRuleCount: z.number().int().nonnegative()
  }),
  tags: z.array(z.string())
});

export type EvaluationManifest = z.infer<typeof EvaluationManifestSchema>;
```

### C. Expected Rule Şeması (`expected-rules.json`)
İnsan uzmanlar tarafından fixture içerisinden çıkarılması beklenen altın standart kuralları tanımlar.

```typescript
export const ExpectedRuleSchema = z.object({
  id: z.string().min(1), // Fixture içinde stabil referans (UUID değildir)
  title: z.string().min(1),
  canonicalStatement: z.string().min(1),
  discipline: z.string().min(1),
  objectType: z.string().min(1).nullable(),
  parameter: z.string().min(1).nullable(),
  operator: OperatorSchema.nullable(),
  expectedValue: z.string().nullable(),
  errorCategory: ErrorCategorySchema,
  severity: SeveritySchema,
  scopeType: RuleScopeTypeSchema,
  competencyArea: z.string().min(1).nullable(),
  sourceEvidence: SourceEvidenceListSchema
});

export const ExpectedRuleListSchema = z.array(ExpectedRuleSchema);
export type ExpectedRule = z.infer<typeof ExpectedRuleSchema>;
export type ExpectedRuleList = z.infer<typeof ExpectedRuleListSchema>;
```

### D. Candidate Rule Şeması (`candidate-output.json`)
Yapay zekâ sağlayıcısından geldiği varsayılan çiğ (raw) girdi formatını doğrulamak için kullanılır.

```typescript
export const RuleCandidateEvaluationInputSchema = z.object({
  candidateId: z.string().min(1), // Fixture içindeki tanısal referans
  title: z.string().min(1),
  canonicalStatement: z.string().min(1),
  discipline: z.string().min(1),
  objectType: z.string().min(1).nullable(),
  parameter: z.string().min(1).nullable(),
  operator: OperatorSchema.nullable(),
  expectedValue: z.string().nullable(),
  errorCategory: ErrorCategorySchema,
  severity: SeveritySchema,
  scopeType: RuleScopeTypeSchema,
  competencyArea: z.string().min(1).nullable(),
  sourceEvidence: SourceEvidenceListSchema
});

export type RuleCandidateEvaluationInput = z.infer<typeof RuleCandidateEvaluationInputSchema>;
```

---

## 5. Candidate Provider Arayüzü ve Sonuç Model

Harness'ın gerçek API sağlayıcılarından izole çalışabilmesi için discriminated union tabanlı bir sonuç modeli ve sağlayıcı arayüzü kurulmuştur.

```typescript
export const CandidateProviderSuccessSchema = z.object({
  status: z.literal('success'),
  candidates: z.array(z.unknown()), // Invalid schema testleri için unknown[] tutulur
  usage: z.object({
    durationMs: z.number().nonnegative().optional(),
    estimatedCostUsd: z.number().nonnegative().optional()
  }).optional()
});

export const CandidateProviderFailureSchema = z.object({
  status: z.enum([
    'unsupported',
    'corrupt',
    'password_protected',
    'parse_failure'
  ]),
  errorCode: z.string().optional(),
  safeMessage: z.string().optional()
});

export const CandidateProviderResultSchema = z.discriminatedUnion('status', [
  CandidateProviderSuccessSchema,
  CandidateProviderFailureSchema
]);

export type CandidateProviderResult = z.infer<typeof CandidateProviderResultSchema>;

export interface EvaluationFixture {
  manifest: EvaluationManifest;
  manifestPath: string;
  expectedRulesPath: string;
  candidateOutputPath: string;
}

export interface CandidateProvider {
  evaluate(fixture: EvaluationFixture): Promise<CandidateProviderResult>;
}
```

### İlk Sağlayıcı: `FixtureCandidateProvider`
FixtureCandidateProvider, sonraki Fixture Infrastructure diliminde geliştirilecek ilk provider adapter’ıdır. Evaluation Core implementasyonuna dahil değildir.

---

## 6. Eşleştirme (Matching) Stratejisi

Modelin ürettiği kural adayları (candidate) ile beklenilen altın kurallar (expected) arasındaki eşleştirme deterministik yöntemlerle yapılır. Bu aşamada anlamsal (semantic) veya LLM tabanlı yargılayıcılar (LLM-as-a-judge) kullanılmaz.

### A. Normalizasyon
Eşleştirme öncesinde kritik alanlara şu normalizasyon adımları uygulanır:
1.  **Unicode Normalization:** Unicode `NFC` formu uygulanır.
2.  **Boşluk Temizliği:** Satır başı/sonu boşlukları temizlenir, ardışık boşluklar tek boşluğa indirgenir.
3.  **Case Folding:** Türkçe karakter kuralları korunarak (örn: 'I' -> 'ı', 'İ' -> 'i') küçük harfe dönüştürülür.
4.  **Sayısal Standardizasyon:** Sayısal beklenen değerler stabil ve karşılaştırılabilir string formatına çevrilir (örn: "1.000" veya "1,0" -> "1").
5.  **Birim Standardizasyonu:** Birimler ortak kısaltmalara eşlenir (örn: "adet", "pcs", "tane" -> "pcs").

### B. Fingerprint Üretimi
Her kural için aşağıdaki ordered JSON tuple array preimage yapısının SHA-256 hash'i alınarak benzersiz bir **Fingerprint** üretilir:

```typescript
const fingerprintPayload = [
  normalizedDiscipline,
  normalizedObjectType,
  normalizedParameter,
  normalizedOperator,
  normalizedExpectedValue,
  normalizedScopeType,
  normalizedErrorCategory,
  normalizedCanonicalStatement
] as const;

const fingerprintPreimage = JSON.stringify(fingerprintPayload);
```

Fingerprint serialization sırasında nullable alanlar JSON `null` olarak korunur. Boş string ve literal metin değerleri null ile birleştirilmez.

*Not: Kural başlığı (`title`) fingerprint preimage'ına dahil edilmez.*

### C. Sıralama ve Eşleşme Mantığı
Determinizmi ve tekrarlanabilirliği garantilemek adına matching öncesinde candidate listesi şu alanlara göre stabil biçimde sıralanır:
1.  `fingerprint` (artan)
2.  `candidateId` (artan)
3.  `originalIndex` (geliş sırası, artan)

**Eşleşme Kuralları:**
- Aynı expected rule ile yalnızca tek bir candidate eşleşebilir.
- Bir candidate birden fazla expected rule ile eşleşemez.
- Aynı fingerprint'e sahip fazla candidate'lar **duplicate** ve **false positive** sayılır.
- **Ambiguity Kontrolü:** Eğer expected set içerisinde aynı fingerprint'e sahip birden fazla expected rule varsa, bu durum "fixture definition ambiguity" olarak işaretlenir. Expected rule ID'leri ve fingerprint'leri fixture içinde benzersiz olmalıdır.

### D. Tanısal Field-Level Mismatch Raporlama
Matcher, candidate ve expected kuralları arasında birebir eşleşme ararken, "yakınlık" gibi bulanık kriterler kullanmaz. Ancak hata gidermeyi kolaylaştırmak adına, adaylar ve kurallar arasında diagnostic (tanısal) bir eşleşme anahtarı tanımlanır:
`discipline` | `objectType` | `parameter` | `errorCategory`

Bu dört alanın birebir uyuştuğu ancak diğer alanlarda (örn: `expectedValue` veya `operator`) sapma gösteren durumlar için **RuleMismatchReport** üretilir. Bu rapor tamamen tanısal olup TP/FP/FN metrik sonuçlarını değiştirmez.

---

## 7. Metrikler ve Formüller

Metrikler, deterministik kalite metrikleri ve çalışmaya özgü metadata alanları olarak kesin biçimde ikiye ayrılır. Snapshot karşılaştırmaları yalnız deterministik kalite metrikleri üzerinden yapılır.

### A. Determinizm Ayrımı

#### 1. Deterministik Kalite Metrikleri
- `expectedRuleCount`: Beklenen kural sayısı.
- `candidateRuleCount`: Üretilen toplam aday sayısı.
- `truePositive` ($TP$): expected ile eşleşen geçerli aday sayısı.
- `falsePositive` ($FP$): expected ile eşleşmeyen geçerli aday sayısı ($FP = \text{duplicateCount} + \text{hallucinationCount}$).
- `falseNegative` ($FN$): Eşleşmeyen beklenen kural sayısı.
- `precision`: $\frac{TP}{TP + FP}$
- `recall`: $\frac{TP}{TP + FN}$
- `f1Score`: $2 \times \frac{\text{precision} \times \text{recall}}{\text{precision} + \text{recall}}$
- `duplicateCount`: expected ile eşleşmiş bir fingerprint'in fazladan tekrarları.
- `hallucinationCount`: expected set içinde karşılığı olmayan ve duplicate olmayan geçerli aday sayısı.
- `schemaValidCandidateCount`: safeParse sonucu başarılı olan aday sayısı.
- `schemaInvalidCandidateCount`: safeParse sonucu başarısız olan aday sayısı.
- `schemaValidityRate`: $\frac{\text{schemaValidCandidateCount}}{\text{candidateRuleCount}}$ (Eğer candidateRuleCount = 0 ise, schemaValidityRate = 1.0)
- `evidenceExactMatchRate`: Kanıt lokasyon doğruluk oranı. Matched rule sayısı = 0 ise `null` değerini alır. Matched rule sayısı > 0 olduğunda expected kural kanıt listesi şema gereği en az 1 kayıt taşıyacağından, 0.0 - 1.0 arasında hesaplanır. Boş expected evidence listesi şema doğrulama hatası (schema validation failure) üretir.


#### 2. Run Metadata (Deterministik Değerlendirmeyi Etkilemeyenler)
- `runId`
- `startedAt`
- `completedAt`
- `evaluationDurationMs`
- `estimatedCostUsd`
- `providerName`
- `providerVersion`

### B. Sıfıra Bölme ve `no_rules` Davranışları
- **$TP = 0$ ve $FP = 0$ ise:** $\text{precision} = 1.0$
- **$TP = 0$ ve $FN = 0$ ise:** $\text{recall} = 1.0$
- **$\text{precision} + \text{recall} = 0$ ise:** $\text{f1Score} = 0.0$
- **`no_rules` Senaryosu:** `expectedRuleCount = 0` ise, `candidateRuleCount = 0` olması durumunda Precision = 1.0, Recall = 1.0, F1 = 1.0, schemaValidityRate = 1.0 ve evidenceExactMatchRate = null üretilir. Eğer aday üretilmişse hepsi FP/Hallucination kabul edilir.

### C. Evidence-Location Accuracy ve Eşleştirme Algoritması
Her matched kural çifti ($TP$) için expected ve candidate evidence kayıtları stabil şekilde sıralanır. Eşleşme one-to-one mantığına göre yapılır. Her expected evidence en fazla bir candidate evidence ile eşleşebilir.

**Lokasyon Anahtarı Tanımları:**
- **PDF:** `sourceType` + `documentId` + `pageNumber`
- **DOCX:** `sourceType` + `documentId` + `paragraphIndex`
- **XLSX:** `sourceType` + `documentId` + `normalizedSheetName` + `normalizedCellRange`

$$\text{evidenceExactMatchRate} = \frac{\text{exactMatchedExpectedEvidence}}{\text{totalExpectedEvidenceForMatchedRules}}$$

*Fazladan candidate evidence kayıtları `extraCandidateEvidenceCount` olarak tanısal amaçla ayrıca raporlanır, ana skoru etkilemez.*

---

## 8. Outcome Matrisi ve Sonuç Model Union

Manifest beklentileri ile sağlayıcı çıktılarının karşılaştırılması için discriminated union biçiminde bir sonuç veri yapısı kurulmuştur.

```typescript
export type DatasetType = 'development' | 'blind-evaluation' | 'robustness';

export type ProviderFailureStatus = 'unsupported' | 'corrupt' | 'password_protected' | 'parse_failure';

export interface InvalidCandidateDiagnostic {
  candidateId: string;
  issues: string[];
}

export interface MatchRecord {
  expectedRuleId: string;
  candidateId: string;
  fingerprint: string;
}

export interface RuleExtractionEvaluationResult {
  resultType: 'rule_evaluation';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'rules_found' | 'no_rules';
  actualOutcome: 'success';
  outcomeMatched: boolean;
  qualityGatePassed: boolean;
  metrics: EvaluationMetrics;
  matches: MatchRecord[];
  unmatchedExpected: string[];
  unmatchedCandidates: string[];
  invalidCandidates: InvalidCandidateDiagnostic[];
  mismatches: RuleMismatchReport[];
}

export interface OutcomeEvaluationResult {
  resultType: 'outcome_evaluation';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'unsupported' | 'corrupt' | 'password_protected' | 'parse_failure';
  actualOutcome: CandidateProviderResult['status'];
  outcomeMatched: boolean;
  qualityGatePassed: boolean;
}

export interface UnexpectedProviderFailureResult {
  resultType: 'unexpected_provider_failure';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'rules_found' | 'no_rules';
  actualOutcome: ProviderFailureStatus;
  outcomeMatched: false;
  qualityGatePassed: false;
  errorCode?: string;
  safeMessage?: string;
}

export type CaseEvaluationResult =
  | RuleExtractionEvaluationResult
  | OutcomeEvaluationResult
  | UnexpectedProviderFailureResult;
```

### Outcome Uyumluluk Matrisi
| Manifest Expectation (`outcome`) | Provider Status (`status`) | Case Sonucu Sınıfı | `outcomeMatched` |
| :--- | :--- | :--- | :--- |
| `rules_found` | `success` | `RuleExtractionEvaluationResult` | `true` |
| `no_rules` | `success` | `RuleExtractionEvaluationResult` | `true` |
| `corrupt` | `corrupt` | `OutcomeEvaluationResult` | `true` |
| `corrupt` | `success` | `OutcomeEvaluationResult` | `false` |
| `rules_found` | `parse_failure` | `UnexpectedProviderFailureResult` | `false` |
| `no_rules` | `corrupt` | `UnexpectedProviderFailureResult` | `false` |

---

## 9. Loader Güvenlik ve Doğrulama Kuralları

`fixture-loader` bileşeni disk işlemleri ve girdi güvenliği için aşağıdaki kuralları katı bir biçimde uygulayacaktır:
1.  **Path Traversal Koruması:** Loader absolute path'leri doğrudan reddedecektir. `..` içeren path traversal girişimi olan fixture yolları çalıştırılmayacaktır.
2.  **Sınır Güvenliği:** Çözümlenen tüm dosya yollarının fixture root dizini sınırları içerisinde kaldığı doğrulanacaktır. Symlink üzerinden fixture kökü dışına taşan dosyalar reddedilecektir.
3.  **Cross-Validation & Manifest Kuralları:**
    *   Manifest'te belirtilen `input.file` dosyasının fiziksel varlığı kontrol edilir.
    *   Dataset klasör adı ile manifest dosyasındaki `dataset` alanının eşleşmesi zorunludur.
    *   Kayıtlı `caseId` değerlerinin sistem genelinde benzersiz (unique) olması şarttır; duplicate case ID'ler loader tarafından doğrudan engellenecektir.
    *   Zod refinement katmanında: `no_rules` için `expectedRuleCount` 0, `rules_found` için en az 1 olması, robustness çıktıları için expected count'un 0 olması ve expected-rules.json dosya boyutu ile manifest count'un eşleşmesi zorunlu kılınacaktır.

---

## 10. İlk Fixture Listesi

### A. Development Set
1.  `pdf-basic-001`: 2 beklenen kural, 2 ideal candidate (Beklenen: F1 = 1.0).
2.  `docx-basic-001`: 1 beklenen kural, 1 ideal candidate (Beklenen: F1 = 1.0).
3.  `xlsx-basic-001`: 3 beklenen kural, 3 ideal candidate (Beklenen: F1 = 1.0, scopeType: 'quotation').
4.  `no-rules-001`: Kuralsız girdi (Beklenen: expected = 0, candidate = 0, F1 = 1.0).
5.  `duplicate-candidates-001`: Aynı fingerprint'ten 2 adet candidate (Beklenen: duplicateCount = 1, FP = 1).
6.  `missing-rule-001`: Expected 2, Candidate 1 olan eksik kural durumu (Beklenen: FN = 1).
7.  `hallucinated-rule-001`: Expected 1, Candidate 2 olan uydurma kural durumu (Beklenen: FP = 1, hallucinationCount = 1).
8.  `invalid-schema-001`: Candidate formatının şemaya uymadığı durum (Beklenen: schemaInvalidCandidateCount = 1).

### B. Robustness Set
1.  `empty-file-001`: 0 byte boş girdi (Expectation: `parse_failure`).
2.  `corrupt-pdf-001`: Bozuk PDF dosyası (Expectation: `corrupt`).
3.  `password-protected-pdf-001`: Şifreli PDF (Expectation: `password_protected`).
4.  `unsupported-format-001`: `.txt` girdisi (Expectation: `unsupported`).
5.  `mixed-language-001`: Karışık dil girdisi (Expectation: `parse_failure`).
6.  `malformed-xlsx-001`: Hücre yapıları bozuk Excel (Expectation: `parse_failure`).

### C. Blind Evaluation Set
1.  `pdf-blind-001`: 3 beklenen kural.
2.  `docx-blind-001`: 2 beklenen kural.
3.  `xlsx-blind-001`: 4 beklenen kural.

---

## 11. CLI Davranışı ve Raporlama

Harness'ı çalıştırmak için aşağıdaki CLI arayüzü sunulacaktır:

```bash
npm run smartcheck:evaluate -- --dataset development --version v1
```

### Parametreler
- `--dataset`: `development`, `blind-evaluation`, `robustness` veya `all` (varsayılan: `development`).
- `--version`: `v1` (varsayılan: `v1`).
- `--enforce-quality-gate`: Quality gate başarısızlığında CLI'ın non-zero exit code dönmesini tetikleyen isteğe bağlı flag (varsayılan: false).

### Çıktılar
Değerlendirme sonucunda disk üzerinde aşağıdaki yapıda çıktılar üretilir:
`artifacts/evaluation/smartcheck/v1/<run-id>/`
- `result.json`: Tüm case detaylarını ve metrikleri içeren makine dostu çıktı.
- `summary.md`: Precision, recall ve invalid schema raporlarını içeren insan dostu özet rapor.

### Exit Code Kuralları
- `0`: Değerlendirme teknik olarak hatasız tamamlandı. (Düşük precision/recall skorları teknik bir crash kabul edilmez, 0 döner).
- `Non-zero`: Fixture yükleme hatası, geçersiz manifest şemaları, kod seviyesinde beklenmeyen runtime hataları veya `--enforce-quality-gate` açıkken kalite kapısının geçilememesi durumunda non-zero exit code fırlatılır.

---

## 12. Kalite Kapısı (Quality Gate) ve Test Planı

### A. Quality Gate Kriterleri
*   Expected rule ID'leri fixture içinde unique olmalıdır.
*   Expected fingerprint'leri fixture içinde benzersiz olmalıdır.
*   Candidate ID değerleri bir fixture case içinde unique olmalıdır. Duplicate candidateId, fixture/provider validation hatasıdır.
*   Manifest count ile expected-rules liste uzunluğu birebir eşit olmalıdır.
*   Tüm candidate raw girdileri safeParse edilmeli, invalid olanlar crash etmeden diagnostic olarak sayılmalıdır.
*   `falsePositive = duplicateCount + hallucinationCount` invariant eşitliği her durumda korunmalıdır.
*   Aynı fixture ve candidate girdi seti ardışık çalıştırıldığında tamamen aynı deterministik sonuç hash'ini üretmelidir.
*   Sistem hiçbir şekilde internet ve veritabanı bağlantısı gerektirmemelidir.
*   Fixture setinde hiçbir gerçek müşteri verisi kullanılmamalıdır.

### B. Test Planı
Tüm harness mantığı aşağıdaki 7 test dosyası üzerinden tamamen mock ve veri izole olarak test edilecektir:

1.  `normalize.test.ts`: Türkçe `I/İ/ı/i` case folding, Unicode NFC normalizasyonu, unit standardizasyonu ve sayısal normalizasyon testleri.
2.  `matcher.test.ts`: Ordered JSON tuple serialization (JSON null, boş string, literal "<null>", pipe karakteri içeren metin, alan sırası değişikliği, stabil SHA-256 sonucu), candidate sıralama bağımsızlığı, expected fingerprint ambiguity tespiti.
3.  `metrics.test.ts`: $TP, FP, FN$ ve precision/recall/f1 hesaplama motorunun sınır durumları ile sıfıra bölme testleri. Aşağıdaki senaryolar test edilmelidir:
    *   `expected = 0, candidates = 0` -> schemaValidityRate = 1, precision = 1, recall = 1, f1 = 1
    *   `expected > 0, candidates = 0` -> schemaValidityRate = 1, precision = 1, recall = 0, f1 = 0
4.  `evidence-metrics.test.ts`: One-to-one evidence matching, lokasyon anahtarları doğruluğu ve match rate hesaplamaları (matched rule olmadığında rate = null testi dahil).
5.  `fixture-loader.test.ts`: Path traversal engelleme, symlink dışı kalma kontrolü, duplicate case ID tespiti, manifest ile expected-rules adet eşleşmesi.
6.  `evaluator.test.ts`: `FixtureCandidateProvider` yardımıyla tüm pipeline'ın mock çalıştırılması ve kalite kapısı kontrolleri.
7.  `provider-result.test.ts`: Provider discriminated union sonuç formatı, robustness çıktılarının loader eşleşme testleri.

---

## 13. Core Geliştirme ve v1.3 Revizyonu (Uygulama ve İyileştirmeler)

Core Geliştirme Dilimi kapsamında `feat/smartcheck-evaluation-baseline` branch'inde (commit `a8fd6de35dc69339f602223311ee78c12dd4fadd`) gerçekleştirilen tüm teknik tasarım revizyonları, veri yapıları ve doğrulamalar aşağıda ayrıntılı olarak kayıt altına alınmıştır.

### A. Çakışmaya Dayanıklı Fingerprint (JSON Tuple Preimage)
Eski tasarımdaki pipe (`|`) ayraçlı birleşim yöntemi, kural alanlarında doğal olarak `|` bulunması durumunda çakışma (collision) ve yanlış eşleşme riski taşıdığı için iptal edilmiştir. Yerine **Ordered JSON Tuple Preimage** tasarımı uygulanmıştır.
*   **Payload Yapısı:**
    ```typescript
    const fingerprintPayload = [
      normalizedDiscipline,          // string
      normalizedObjectType,          // string | null
      normalizedParameter,           // string | null
      normalizedOperator,            // string | null
      normalizedExpectedValue,       // string | null
      normalizedScopeType,           // string
      normalizedErrorCategory,       // string
      normalizedCanonicalStatement   // string
    ] as const;
    ```
*   **JSON Serialization ve Null Koruması:** Serialization adımlarında nullable alanlar kesinlikle literal `"<null>"` string'ine çevrilmez, doğrudan JSON `null` değeri olarak korunur. Böylece veri kümesindeki şu üç kritik durum çakışmasız biçimde hashlenir:
    1.  `null` (tanımsız alan)
    2.  `""` (boş metin)
    3.  `"<null>"` (literal metin girdisi)
*   **SHA-256 Üretimi:** Preimage `JSON.stringify(fingerprintPayload)` ile üretilip `crypto.createHash('sha256')` yardımıyla hashlenir.

### B. Kanıt (Evidence) Eşleşme Oranı ve Sıfır Denominator Güvenliği
*   **Uygulanamaz Durum (Null):** Hiçbir kural eşleşmesi gerçekleşmediğinde (`matches.length === 0`), kanıt karşılaştırması anlamsız olacağı için `evidenceExactMatchRate` metriği doğrudan **`null`** döner.
*   **Denominator Garantisi:** Eşleşen kural sayısı $>0$ olduğunda, Zod şeması gereğince her bir expected kural en az bir kanıt taşımak zorunda olduğundan (`SourceEvidenceListSchema.min(1)`), `totalExpectedEvidenceCount` paydası her zaman $\ge 1$ olur. Bu durumda metrik `0.0` - `1.0` aralığında reel bir oran üretir.
*   **Mismatched Evidence:** Eşleşmiş bir kural olmasına rağmen kanıt lokasyon anahtarları (sayfa numarası, paragraf indeksi, sayfa adı ve hücre aralığı vb.) uyuşmuyorsa, oran başarıyla `0.0` olarak hesaplanır.

### C. Metrik Matematiksel Invariants ve Invalid Aday Yönetimi
*   **Matematiksel Eşitlikler:** Modül ve birim testler seviyesinde aşağıdaki 4 invariant her koşulda korunmaktadır:
    *   $\text{candidateRuleCount} = \text{schemaValidCandidateCount} + \text{schemaInvalidCandidateCount}$
    *   $\text{schemaValidCandidateCount} = \text{truePositive} + \text{falsePositive}$
    *   $\text{expectedRuleCount} = \text{truePositive} + \text{falseNegative}$
    *   $\text{falsePositive} = \text{duplicateCount} + \text{hallucinationCount}$
*   **Şema Uyumsuz Adaylar (Invalid Candidates):** Zod doğrulamasından geçemeyen adaylar TP, FP, Duplicate veya Hallucination metriklerine dahil edilmez. Yalnızca `schemaInvalidCandidateCount` metriğinde sayılarak izole edilir ve sistemin genel kalitesini (`schemaValidityRate`) düşürür.

### D. Sayısal Normalizasyon ve Locale Bağımsızlığı
Locale tabanlı hatalı çıkarımları engellemek adına belirsiz sayı formatlarının tahmin edilip dönüştürülmesi önlenmiştir:
*   **Belirsiz Değerler:** `"1.000"` veya `"1,250"` gibi (tek bir nokta/virgül sonrası tam 3 hane içeren) belirsiz değerler binlik/ondalık ayracı olarak tahmin edilmez; sadece whitespace ve Unicode normalizasyonuna uğratılarak aynen korunur.
*   **Açık Değerler:** Sadece JS standart float formatındaki (`"1.2"`) ve açıkça ondalık virgülü taşıyan (`"12,5"`) gibi net sayısal değerler standardize edilerek ondalık noktasına dönüştürülür.

### E. Bağımsızlık ve Determinizm Kriterleri
Evaluation Core katmanının tam izolasyonu ve determinizmi için kod seviyesinde şu kurallara riayet edilmiştir:
*   `Date.now()`, `new Date()`, `Math.random()`, UUID üreticileri gibi non-deterministic çağrılar bulunmaz.
*   `process.env` gibi ortam değişkeni okumaları, file-system (`fs`) okumaları, veritabanı bağlantıları (`pg`, `drizzle`), HTTP veya network çağrıları (`fetch`, `axios`) ve yapay zekâ kütüphane (`openai`, AI provider SDK) importları bulunmaz.
*   Tüm veri tipleri Zod ile tanımlanmıştır ve strict typecheck uyumludur; `any` veya `z.any()` kullanımı yasaktır (yalnızca candidate payload'ları `z.unknown()` ile taşınır).
*   Eşleştirme motorunun çıktısı candidate dizisinin geliş sırasından bağımsızdır (sıralama deterministiktir).
