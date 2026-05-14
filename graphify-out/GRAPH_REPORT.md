# Graph Report - TeklifPro-repo  (2026-05-14)

## Corpus Check
- 92 files · ~37,547 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 237 nodes · 229 edges · 25 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `fetchWithAuth()` - 10 edges
2. `startServer()` - 6 edges
3. `IndustryRegistry` - 6 edges
4. `OpenAIProvider` - 6 edges
5. `AIProviderRouter` - 6 edges
6. `AuthService` - 5 edges
7. `AIService` - 5 edges
8. `GeminiProvider` - 5 edges
9. `useAuth()` - 4 edges
10. `fetchData()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `generateWithAi()` --calls--> `fetchWithAuth()`  [INFERRED]
  src/components/QuoteEditor.tsx → src/lib/api.ts
- `startServer()` --calls--> `registerAuthRoutes()`  [INFERRED]
  src/server/app.ts → src/server/routes/auth.ts
- `startServer()` --calls--> `registerBillingRoutes()`  [INFERRED]
  src/server/app.ts → src/server/routes/billing.ts
- `startServer()` --calls--> `usageTracker()`  [INFERRED]
  src/server/app.ts → src/server/middleware/usage.ts
- `fetchWithAuth()` --calls--> `removeItem()`  [INFERRED]
  src/lib/api.ts → src/pages/CreateQuote.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (9): startServer(), authenticate(), checkRole(), registerAuthRoutes(), AuthService, registerBillingRoutes(), registerCompanyRoutes(), usageTracker() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (10): fetchWithAuth(), fetchClients(), handleCreate(), generateWithAi(), handleSave(), removeItem(), analyzeDeal(), fetchData() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (3): AIService, ProfitService, IndustryRegistry

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (4): GeminiProvider, OpenAIProvider, buildQuotationPrompt(), extractJsonObject()

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (9): SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.39
Nodes (7): cn(), Sheet(), SheetClose(), SheetDescription(), SheetPortal(), SheetTitle(), SheetTrigger()

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (4): Login(), ProtectedRoute(), Register(), useAuth()

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (5): cn(), Dialog(), DialogClose(), DialogPortal(), DialogTrigger()

### Community 8 - "Community 8"
Cohesion: 0.48
Nodes (5): cn(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuPortal(), DropdownMenuTrigger()

### Community 9 - "Community 9"
Cohesion: 0.48
Nodes (5): fetchData(), handleInvite(), handleUpgrade(), industryEnabled(), toggleIndustry()

### Community 10 - "Community 10"
Cohesion: 0.38
Nodes (1): AIProviderRouter

### Community 11 - "Community 11"
Cohesion: 0.53
Nodes (4): cn(), Table(), TableBody(), TableHeader()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (1): generateWithAi()

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (5): calculateLineItemTotal(), calculateQuotationTotals(), normalizeLineItem(), roundMoney(), toFiniteNumber()

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (2): Badge(), cn()

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (1): CRMIntelligenceService

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (1): RegulatoryIntelligenceService

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): CardAction(), cn()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): ScrollArea(), ScrollBar()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): cn()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): cn()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): cn()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): cn()

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (1): Input()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (1): cn()

## Knowledge Gaps
- **Thin community `Community 10`** (7 nodes): `AIProviderRouter`, `.constructor()`, `.generateQuotation()`, `.improveQuotation()`, `.isConfigured()`, `.tryProviders()`, `providerRouter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (6 nodes): `addItem()`, `calculateTotals()`, `generateWithAi()`, `removeItem()`, `updateItem()`, `QuoteEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (5 nodes): `Badge()`, `cn()`, `QuoteDetail()`, `badge.tsx`, `QuoteDetail.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (5 nodes): `CRMIntelligenceService`, `.analyzeDeal()`, `.constructor()`, `.generateFollowUpMessage()`, `crmService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (5 nodes): `RegulatoryIntelligenceService`, `.checkQuotationImpact()`, `.constructor()`, `.crawlAndAnalyze()`, `regulatoryService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `CardAction()`, `cn()`, `card.tsx`, `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `scroll-area.tsx`, `ScrollArea()`, `ScrollBar()`, `scroll-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `tabs.tsx`, `tabs.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `label.tsx`, `cn()`, `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `separator.tsx`, `cn()`, `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `cn()`, `button.tsx`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `input.tsx`, `Input()`, `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `utils.ts`, `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetchWithAuth()` connect `Community 1` to `Community 12`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `fetchWithAuth()` (e.g. with `generateWithAi()` and `removeItem()`) actually correct?**
  _`fetchWithAuth()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `startServer()` (e.g. with `registerAuthRoutes()` and `registerBillingRoutes()`) actually correct?**
  _`startServer()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._