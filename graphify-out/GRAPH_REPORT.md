# Graph Report - TeklifPro-repo  (2026-07-23)

## Corpus Check
- 225 files · ~213,797 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 750 nodes · 895 edges · 48 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `fetchWithAuth()` - 20 edges
2. `NotebookLibrary` - 18 edges
3. `startServer()` - 17 edges
4. `BrowserFactory` - 15 edges
5. `StealthUtils` - 15 edges
6. `AuthManager` - 15 edges
7. `exists()` - 15 edges
8. `BrowserSession` - 13 edges
9. `SkillEnvironment` - 9 edges
10. `ask_notebooklm()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `_inject_cookies()` --calls--> `exists()`  [INFERRED]
  notebooklm/scripts/browser_utils.py → scripts/allplan-source-inventory.mjs
- `syncAllplanLessonProgress()` --calls--> `fetchWithAuth()`  [INFERRED]
  src/academy/allplan/progress.ts → /Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo/src/lib/api.ts
- `syncAllplanLessonTime()` --calls--> `fetchWithAuth()`  [INFERRED]
  src/academy/allplan/progress.ts → /Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo/src/lib/api.ts
- `syncAllplanLessonCheckpoint()` --calls--> `fetchWithAuth()`  [INFERRED]
  src/academy/allplan/progress.ts → /Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo/src/lib/api.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [INFERRED]
  /Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo/src/components/auth/ProtectedRoute.tsx → src/hooks/useAuth.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (39): load(), ask_notebooklm(), Ask a question to NotebookLM      Args:         question: Question to ask, AuthManager, main(), Save browser state to disk, Save authentication metadata, Clear all authentication data          Returns:             True if cleared succ (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (25): Academy(), registerAcademyRoutes(), registerAiRoutes(), startServer(), checkRole(), registerAuthRoutes(), registerBillingRoutes(), registerClientRoutes() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (30): loadAcademy(), fetchWithAuth(), fetchClients(), handleCreate(), generateWithAi(), handleSave(), removeItem(), analyzeDeal() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (26): calculateRawPayloadHash(), canonicalJsonStringify(), evaluateFixture(), getZodIssues(), isPlainObject(), computeEvidenceMetrics(), getEvidenceLocationKey(), checkSymlink() (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (19): exists(), main(), ensure_venv_and_run(), Ensure virtual environment exists and run the requested script.     This is call, run(), ensure_venv(), get_venv_python(), main() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (17): main(), main(), NotebookLibrary, Remove a notebook from the library          Args:             notebook_id: ID of, Update notebook metadata          Args:             notebook_id: ID of notebook, Manages a collection of NotebookLM notebooks with metadata, Get a specific notebook by ID, List all notebooks in the library (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (11): AIService, calculateLineItemTotal(), calculateQuotationTotals(), normalizeLineItem(), roundMoney(), toFiniteNumber(), validateLineItem(), calculateQuotationFinancials() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (11): CleanupManager, main(), Get size of file or directory in bytes, Format size in human-readable form, Manages cleanup of NotebookLM skill data      Features:     - Preview what will, Perform the actual cleanup          Args:             preserve_library: Keep lib, Print a preview of what will be cleaned, Command-line interface for cleanup management (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (9): guardedRateLimit(), issueAuthAction(), smartcheckImportEnabled(), consumeRateLimit(), createActionToken(), hashActionToken(), rateLimitStorageKey(), featureGate() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (11): detectAndValidateFile(), sha256(), validateXlsxArchive(), suggestMapping(), validateRows(), fromMatrix(), headerIndex(), parseDocument() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (10): evaluateEvidenceFiles(), canReleaseAllplanLesson(), evaluateAllplanContentReview(), present(), normalizeLesson(), normalizeNode(), parseMinutes(), slugify() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (6): findLesson(), loadCertificationEligibility(), toCurriculumNode(), toLessonSummary(), validSlug(), evaluateCertificationEligibility()

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (4): GeminiProvider, OpenAIProvider, buildQuotationPrompt(), extractJsonObject()

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (9): runEvaluationCliEntry(), runCliMock(), EvaluationCliUsageError, setExitCode(), writeStderr(), writeStdout(), mapError(), parseArgs() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (9): SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (3): authenticate(), AuthService, verify()

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (7): cn(), Sheet(), SheetClose(), SheetDescription(), SheetPortal(), SheetTitle(), SheetTrigger()

### Community 17 - "Community 17"
Cohesion: 0.39
Nodes (5): fetchData(), handleInvite(), handleUpgrade(), industryEnabled(), toggleIndustry()

### Community 18 - "Community 18"
Cohesion: 0.48
Nodes (5): cn(), Dialog(), DialogClose(), DialogPortal(), DialogTrigger()

### Community 19 - "Community 19"
Cohesion: 0.48
Nodes (5): cn(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuPortal(), DropdownMenuTrigger()

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (1): AIProviderRouter

### Community 22 - "Community 22"
Cohesion: 0.53
Nodes (4): cn(), Table(), TableBody(), TableHeader()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): CustomClass

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (2): EvaluationError, EvaluationSuiteError

### Community 26 - "Community 26"
Cohesion: 0.7
Nodes (4): assertProductionEnvironment(), placeholderSecret(), validateProductionEnvironment(), validHttpsUrl()

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (2): finite(), validateCheckpointEvidence()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (2): Badge(), cn()

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (1): CRMIntelligenceService

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (1): RegulatoryIntelligenceService

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (2): CardAction(), cn()

### Community 33 - "Community 33"
Cohesion: 0.83
Nodes (3): expectUnauthorized(), main(), requestJson()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): present(), validatePilotAdmission()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (2): academyActivationSummary(), rate()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): isAcademyPaymentWebhookSecretConfigured(), verifyAcademyPaymentSignature()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (2): answerFromAllplanLessons(), tokens()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (2): ScrollArea(), ScrollBar()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (1): cn()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (1): cn()

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (1): cn()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (1): cn()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): cn()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (1): FixtureInfrastructureError

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): findAllplanEntitlement(), requireAllplanEntitlement()

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Configuration for NotebookLM Skill Centralizes constants, selectors, and paths

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Launch a persistent browser context with anti-detection features         and coo

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Inject cookies from state.json if available

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Type with human-like speed

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Click with realistic movement

## Knowledge Gaps
- **41 isolated node(s):** `Get the virtual environment Python executable`, `Ensure virtual environment exists`, `Configuration for NotebookLM Skill Centralizes constants, selectors, and paths`, `Manages skill-specific virtual environment`, `Ensure virtual environment exists and is set up` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 21`** (7 nodes): `AIProviderRouter`, `.constructor()`, `.generateQuotation()`, `.improveQuotation()`, `.isConfigured()`, `.tryProviders()`, `providerRouter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `createMockFixture()`, `createMockProvider()`, `CustomClass`, `.constructor()`, `evaluator.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `types.ts`, `EvaluationError`, `.constructor()`, `EvaluationSuiteError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (5 nodes): `acceptedStudyDelta()`, `finite()`, `requiredStudySeconds()`, `validateCheckpointEvidence()`, `checkpoint.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (5 nodes): `Badge()`, `cn()`, `QuoteDetail()`, `QuoteDetail.tsx`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (5 nodes): `CRMIntelligenceService`, `.analyzeDeal()`, `.constructor()`, `.generateFollowUpMessage()`, `crmService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (5 nodes): `RegulatoryIntelligenceService`, `.checkQuotationImpact()`, `.constructor()`, `.crawlAndAnalyze()`, `regulatoryService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `CardAction()`, `cn()`, `card.tsx`, `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `present()`, `readPilotAdmission()`, `validatePilotAdmission()`, `readiness.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `academyActivationSummary()`, `isAcademyAnalyticsAdmin()`, `rate()`, `activation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `isAcademyPaymentWebhookSecretConfigured()`, `parseAcademyPaymentEvent()`, `verifyAcademyPaymentSignature()`, `paymentWebhook.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `answerFromAllplanLessons()`, `excerpt()`, `tokens()`, `companion.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `ScrollArea()`, `ScrollBar()`, `scroll-area.tsx`, `scroll-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `cn()`, `tabs.tsx`, `tabs.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `cn()`, `label.tsx`, `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (3 nodes): `cn()`, `separator.tsx`, `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `cn()`, `button.tsx`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `utils.ts`, `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `FixtureInfrastructureError`, `.constructor()`, `fixture-errors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `findAllplanEntitlement()`, `requireAllplanEntitlement()`, `academyEntitlement.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (2 nodes): `Configuration for NotebookLM Skill Centralizes constants, selectors, and paths`, `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Launch a persistent browser context with anti-detection features         and coo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Inject cookies from state.json if available`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Type with human-like speed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Click with realistic movement`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `load()` connect `Community 0` to `Community 9`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `exists()` connect `Community 4` to `Community 0`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `fetchWithAuth()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `fetchWithAuth()` (e.g. with `syncAllplanProgress()` and `syncAllplanLessonProgress()`) actually correct?**
  _`fetchWithAuth()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `NotebookLibrary` (e.g. with `Ask a question to NotebookLM      Args:         question: Question to ask` and `main()`) actually correct?**
  _`NotebookLibrary` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `startServer()` (e.g. with `assertProductionEnvironment()` and `.get()`) actually correct?**
  _`startServer()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `BrowserFactory` (e.g. with `Ask a question to NotebookLM      Args:         question: Question to ask` and `AuthManager`) actually correct?**
  _`BrowserFactory` has 13 INFERRED edges - model-reasoned connections that need verification._