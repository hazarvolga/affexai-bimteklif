# TeklifPro / BIMMetraj Repo Haritası (mühendislik açısından)

Repo: `TeklifPro-repo` (ürün adı BIMMetraj; eski TeklifPro / BIMPlan Academy). Stack: Vite + React 19, Express (server.ts), PostgreSQL + Drizzle, Graphile Worker, Python IfcOpenShell işçisi, Puppeteer PDF. Ajan bağlamı: `AGENTS.md`, `CLAUDE.md`, `docs/agent-memory/*`, `graphify-out/GRAPH_REPORT.md`.

## Ürün ilkeleri (PRODUCT.md) — mühendislik çıktısını bunlara uydur
- Kanıt önce: her metraj/maliyet kalemi şeffaf hesap adımıyla.
- İnsan onayı: AI/algoritma mühendis yerine hüküm vermez; bulgu + kanıt + kaynak sunar.
- "Versiyonlu kaynak kanıtı ve yetkin insan incelemesi olmadan mühendislik hesabı veya standart uyum iddiası yok."

## Hesap motorları
| Dosya | Ne yapar | Mühendis notu |
|---|---|---|
| `src/lib/calculations.ts` | Kalem toplamı: q·p·(1−iskonto), KDV (varsayılan %20), 2 hane yuvarlama | Satır bazında değil, toplamda yuvarlıyor — PDF ile kuruş farkı olabilir |
| `src/lib/financial-calculations.ts` | Maliyet = q·maliyetBF·(1+fire%), kategori kırılımı, eskalasyon = maliyet × ay × aylık volatilite% (doğrusal), karbon %, bilgi teslim % | Eskalasyon bileşik değil doğrusal; uzun projede yaklaşık. Maliyeti eksik kalem varsa primler 0 |
| `src/lib/quotation-audit.ts` | Kaynak doğrulanmamış / maliyet eksik / referans eksik uyarıları | `quantitySource`: manual, document, model, model_estimate, ai_estimate; `verificationStatus`: unverified, needs_review, verified |
| `src/ifc/quotation-transfer.ts` | IFC demo tahmininden kalem üretir; kiriş 3800, kolon 4200, döşeme 3600, perde 3900 TL/m³ sabit | Bu fiyatlar demo; gerçek teklif için ÇŞB/piyasa rayici ve birim fiyat analizi gerekir. Donatı/kalıp bilinçli olarak aktarılmıyor |
| `src/ifc/parser/*.ts`, `workers/ifc/ifc_extract.py` | IFC QTO çıkarımı (Qto → onaylı Pset → yok), birim ölçek, kat, Tr_Pset_CSB | Öncelik sırası doğru; geometri tahmini yapma |
| `src/smartcheck/rules/three-by-three.ts` | %3 metraj sapması, XC3 → paspayı ≥ 35 mm (EC2), taşıyıcı eleman STR disiplininde olmalı | %3 normatif değil, politika. XC3/35 mm EC2 kuralı; şirketin `activeStandard`'ı TBDY_TS500 ise TS 500 + TS EN 206 ile ifade et |
| `src/smartcheck/rules/epys.ts`, `ek6-dictionary.ts` | e-PYS Ek-3/6/7 ön kontrol, skor | Ceza puanları ürün sezgisi; "uygun" değil "ön kontrol" dili |
| `src/smartcheck/rules/governance.ts` | Kural yönetişimi: approved kural için resmi kaynak, SHA-256 hash, yürürlük, teknik onaylayan zorunlu. TS 500, TS 708, ÇŞİDB, YFK, KDV, tevkifat içeren kurallar varsayılan "advisory" | Yeni kural önerirken bu alanları doldur |
| `src/components/academy/ReinforcementEstimator.tsx` | EC2 benzeri bindirme demosu (fbd = 2.25η1η2fctd) | Demo; TS 500 bindirmesi değil — Akademi'de bunu açıkça belirt |
| `src/db/schema.ts` | companies.activeStandard ∈ {TBDY_TS500, EUROCODE_2, ACI_318}; classificationSystem ∈ {CSB_TR, DIN_276, CSI_MASTERFORMAT, NRM2_UK}; quote_items: wastePercent, costCategory, quantitySource, priceSource, verificationStatus | Hesap yaparken şirketin activeStandard'ına göre kural seç |

## Bu skill repo içinde nasıl kullanılır
1. Hesap/teklif sorusu: `scripts/eng_calc.py` ile hesapla, formül izini rapora koy; sonucu TeklifPro kalemine dönüştürürken `quantitySource`, `sourceReference` (pafta/IFC GUID/hesap dosyası), `verificationStatus: needs_review` öner.
2. Yeni SmartCheck kuralı: TypeScript'te `src/smartcheck/rules/` altında, kural ID + versiyon + kaynak + eşik + birim testi (mevcut desen: `three-by-three.ts` + `.test.ts`). `governance.ts` alanlarını doldur; TS 500/TBDY kuralları "advisory" başlar.
3. Mevcut koddaki mühendislik hatası: düzeltmeden önce kaynağı (madde no) göster, test yaz (`pnpm test` → `tsx --test "src/**/*.test.ts"`).
4. Akademi içeriği: hesap örneklerini script ile üret, "demo/eğitim amaçlı" ibaresini koru.
5. Python tarafı: `workers/ifc/` (pytest). Kod değiştiğinde `graphify update .`.

## Kaynak dokümanlar (repo içi)
- `docs/kaynaklar/İnşaat Metraj Doğrulama Araştırması.md` — minha, TS 708, TS 500 bindirme tartışması (bazı sayılar yeniden hesaplanmalı, bkz. metraj-olcu-esaslari.md §3).
- `docs/architecture/5d-bim-ihale-motoru-gap-notu.md` — eskalasyon/karbon/bilgi teslim primleri (hipotez, doğrulanmamış).
- `docs/kaynaklar/Projelerin ... Yönetmelik` — e-PYS mevzuatı.
- `IFC_GAP_RAPORU.md`, `docs/smartcheck/*gap-report*` — IFC eksikleri.
