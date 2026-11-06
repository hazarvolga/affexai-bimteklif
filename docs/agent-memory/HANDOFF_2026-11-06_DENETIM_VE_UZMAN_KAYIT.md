# Devir: 6 Kasım 2026, dış denetim düzeltmeleri ve uzman dönemi kayıt sayfası

Canlı: `https://bimmetraj.com`, sürüm `e3b6586` (= o günkü `main`). Bu oturumdaki 3 PR birbirinin üstüne kurulu; hiçbiri merge edilmedi, hiçbiri canlıda değil. Merge canlıya çıkarmaz: Coolify'da Deploy gerekir (`scripts/require-green-ci.sh <sha>`, `scripts/release-preflight.sh`).

Kaynak: kök dizindeki `Quder-rapor.md` (dış denetim, 27 bulgu, git'te izlenmiyor). Bulgular tek tek kodda ve canlıda doğrulandı; doğrulama sonucu aşağıda.

## Bu oturumun PR'ları

| PR | Dal | Rev. | Ne |
|---|---|---|---|
| [#64](https://github.com/hazarvolga/affexai-bimteklif/pull/64) | `chore/remove-firebase` → `main` | 159 | Kullanılmayan Firebase katmanı silindi: `src/lib/firebase.ts`, `firebase-applet-config.json`, AI Studio `metadata.json`, `firebase` bağımlılığı (protobufjs ve @grpc/grpc-js de ağaçtan çıktı). Academy tipleri `src/features/academy/types.ts`. CSP testi Firebase adreslerinin yokluğunu doğrular. CI yeşil. |
| [#65](https://github.com/hazarvolga/affexai-bimteklif/pull/65) | `chore/release-hygiene-p2` → #64 | 160 | PERF-01 (entry artık charts chunk'ını çekmez, ilk yükleme 126 KB → 8,7 KB gzip; T45-2 kontrolü), SEO-01 (meta kaydı olmayan rotalar `noindex`, token yolları robots.txt'de kapalı), SEO-02 (`/academy*` 301), A11Y-01/02 (320–1200 px taşma yok, hedefler ≥ 24 px), eski `package-lock.json` silindi, `.dockerignore`. Ana sayfada Paketler ve 14 gün deneme bölümleri gizlendi. |
| [#66](https://github.com/hazarvolga/affexai-bimteklif/pull/66) | `feat/register-simple` → #65 | 161 | Uzman dönemi için ayrı, sade kayıt sayfası `src/pages/RegisterSimple.tsx`. Orijinal `src/pages/Register.tsx` hiç değişmedi. Ana sayfa ve giriş butonlarında deneme ibaresi yerine "Kayıt Ol / Kaydolun". `/register` meta başlığı "Kayıt Ol \| BIMMetraj". |

| [#67](https://github.com/hazarvolga/affexai-bimteklif/pull/67) | `fix/brand-visible-bimmetraj` → #66 | 162 | Görünür "TeklifPro" metinleri BIMMetraj oldu (arayüz, Academy, `llms.txt`, AI asistanı, indirme adı, demo şirket, User-Agent). JSON-LD `WebSite` + `alternateName` (BIM Metraj, Bimmetraj); ana sayfa açıklaması iki yazımı içerir. İç adlar (`teklifpro_queue`, `teklifpro_release`, test DB'leri) bilerek kaldı. |
| [#68](https://github.com/hazarvolga/affexai-bimteklif/pull/68) | `feat/academy-library` → #67 | 163 | Yalın Akademi: `/academy` ve beş ortak konu, tek kalıp, kayıtsız. Laboratuvar, alt rehber, sınav, sertifika ve marka dersleri kapalı; sayı içeren içerik doğrulamadan sonra. |
| [#69](https://github.com/hazarvolga/affexai-bimteklif/pull/69) | `feat/academy-guides-p1` → #68 | 164 | Akademi rehberleri 1. paket: 12 rehber kendi sayfasında (`/academy/{konu}/{rehber}`), sayı, marka ve ham formül yok; 4 BIMMetraj notu pilot yeteneklere bağlı. |
| (bu dal) | `feat/academy-guides-p2` → #69 | 165 | Rehberler 2. ve 3. paket: 24 eski rehberin tamamı işlendi (22 sayfa). Sayılar yalnız inceleme kaydı olan rehberlerde (minha, LOA, donatı); karbon ve nokta bulutu sayısız. |

Auto-fix #64 ve #65 için açık (CI hatası, çakışma, inceleme yorumu olursa oturum uyanır).

## Bayraklar (`src/config/features.ts`)

Hepsi `false`. Tek satırla geri açılır; kod silinmedi.

| Bayrak | Kapalıyken | Ne zaman açılır |
|---|---|---|
| `ACADEMY_ENABLED` | Academy menüsü, linkleri yok; `/academy*` → 301 `/` (Rev. 160, sunucuda) | Academy yeniden açılınca (ayrı konuşulacak) |
| `PRICING_SECTION_ENABLED` | Ana sayfadaki Paketler bölümü ve 3 "Paketler" linki yok. `/pricing` aynı ana sayfayı render ettiği için orada da kart yok; sunucu meta'sı ve sitemap `/pricing`'i hâlâ listeler | Hazar'ın kararıyla (geçici) |
| `TRIAL_SECTION_ENABLED` | "14 Gün Ücretsiz Deneyin" bölümü, footer linki yok; ana sayfa ve giriş butonları "Kayıt Ol / Kaydolun" der | Uzman testleri bitince |
| `REGISTER_PLAN_PICKER_ENABLED` | `/register` sade formu (`RegisterSimple`) gösterir: paket, fiyat, iskonto, havale yok. İstek `selectedPlanId` göndermez, ödeme siparişi oluşmaz. `?intent=academy` (Academy açıkken) orijinal sayfaya gider | Gerçek kullanıcılara açılırken |

## Paket ve rol: uzman kayıtları ne alır (kodda doğrulandı)

- Kayıt her zaman **deneme planını** açar (`selectTrialPlan`: `isTrial` işaretli aktif plan), dönem **14 gün** (`src/server/routes/auth.ts`, `currentPeriodEnd = now + 14 gün`). Kayıt sayfasında yazmasa da süre işler. Paket/plan sistemi değişmedi.
- **UZMAN yetkisi paketi değiştirmez.** `isUserExpertReviewer` yalnız Uzman Önizlemesi, Geri Bildirim düğmesi ve hesap doğrulama kartlarını açar; kota ve limitler yine plandan gelir.
- **Risk:** 14 gün dolunca kota kapılı işlemler (teklif, IFC, PDF) `SUBSCRIPTION_INACTIVE` ile reddedilir (`src/services/billing/quota-policy.ts:45`). Admin paneli planı, durumu ve bonus kotayı değiştirebilir ama **dönem bitişini (`currentPeriodEnd`) uzatamaz** (`updateSubscriptionInput`, `src/server/admin/input.ts`); plan değiştirmek de bitiş tarihini değiştirmez. Uzun süren uzman testi için ya admin'e "dönemi uzat" alanı ya da süresiz bir "uzman/pilot" planı gerekir. Henüz yapılmadı; karar Hazar'da.

## Denetim raporunun doğrulama sonucu

- **Doğru çıkanlar:** SEC-01, SEC-02, SEC-03, OPS-02, OPS-04, ARCH-01, ARCH-03, DB-01, TEST-01..03, PERF-01, PERF-02, A11Y-01/02, SEO-01/02/04 (canlıda http → 307, rapor 302 diyordu).
- **Yanlış çıkanlar:** ARCH-02 (async handler'lar `app.ts:14-33` global Express yamasıyla `next(err)`'e gider; yamanın testi yok). SEC-04 kritik/24 yüksek: eski `package-lock.json`'dan (2026-07-24) okunmuş; `pnpm audit --prod` 5 orta, 0 yüksek/kritik. `prisma` kullanılmıyor değil (`prisma/shadow`, CI'da `prisma:validate:shadow`).
- **Abartılı:** OPS-01 (Coolify git clone'dan build eder, büyük dizinler izlenmiyor; yalnız yerel build), OPS-03 (CI'da zaten bloklayıcı `dependency-audit-policy.mjs` var; SBOM/secret-scan/SAST/Dependabot yok), SEC-01 önemi (anahtar üretim bundle'ında kullanılmıyordu).
- Rapordaki bulgu sayısı "24" diyor, gerçekte 27.

## Açık işler (öncelik sırasıyla)

1. **Hazar, kod dışı:** iki Firebase projesini (`gen-lang-client-0518126114`, `gen-lang-client-0852060838`) Console'da sil veya kuralları kapatıp anahtarları döndür; repoyu private yap. Anahtar ve kişisel e-posta git geçmişinde kalıyor. Eski Academy dokümanı Firestore kurallarının herkese açık olduğunu yazıyordu.
2. #64 → #65 → bu PR sırasıyla merge, sonra Deploy. Deploy sonrası canlıda: `/app` ve `/reset-password/x` HTML'inde `noindex`, `/academy` → 301, `/register` sade form, Lighthouse mobil.
3. **Uzman hesaplarının 14 gün sonra kilitlenmesi** (yukarıdaki risk): admin'e dönem uzatma veya uzman planı.
4. **Paket 3, SEC-02:** süper admin MFA zorunluluğu. Yanlış kurgulanırsa Hazar'ın hesabını kilitler; başlamadan akış onayı alınacak.
5. **Paket 4, TEST-01:** CI'da çalışmayan 4 pgtest (`database-role-provision`, `finance-quotation-rls`, `t44-recovery-drill`, `process-heartbeat`) CI'a bağlanacak; CI bootstrap'ına `provisionDatabaseRoles`.
6. Sonra: graceful shutdown (OPS-04), Express async yamasına test, global hız sınırı (SEC-03), origin sıkıştırması (PERF-02), PITR (OPS-02), `strict` + ESLint (ARCH-01).
7. Akademi ikinci aşama: eski 24 alt rehber (`src/academy/subGuidesData.ts`) **yan panelde değil, kendi sayfalarında** gösterilecek (Hazar, 6 Kasım 2026): `/academy/{konu}/{rehber}`, konu sayfasındaki modülden "Ayrıntılı rehber" linki, aynı sayfa kalıbı, sitemap ve meta kaydı. 24 rehberin hepsinde formül ham LaTeX (düz metne çevrilecek), 9'unda birimli sayı (`yuksek-muhendis-mimar` ile doğrulanacak), 3'ünde yazılım markası var; yalnız onaylanan rehberler yayınlanır. **1. paket bitti (Rev. 164, 12 sayfa). 2. ve 3. paket bitti (Rev. 165, toplam 22 sayfa).** Açık kalan: USIBD LOA özgün belgesiyle teyit; minha 15.275/15.380 uzman görüşü; TBDY kanca uç uzunluğu referansa eklenmeden yayınlanmadı. Envanter düzeltmesi: ilk tarama Türkçe "%35" yazımını ve bileşik birimleri kaçırmıştı; 1. paketteki rehberlerde de doğrulanmamış sayılar vardı, yazılırken çıkarıldı. Kalan: 2. paket (EVM, ISO teslim örneği, 4D iş programı, çakışma, IFC/BCF) ve 3. paket (minha, karbon, LOA, nokta bulutu eşikleri, donatı, ikinci LOIN rehberi). Sonra markaya özgü rehberler, her marka ayrı (Hazar: önce ortak temeller).
8. **Arama:** "BIM Metraj" genel sektör terimi de olduğu için sıralama garantisi yok. Deploy sonrası Google Search Console'da sorgu raporu ve Zengin Sonuçlar Testi ile `WebSite` verisi izlenmeli.
9. Uygulama içi (giriş sonrası) abonelik ve kota ekranlarındaki deneme ifadeleri bu oturumda değişmedi.

## Doğrulama notları

- Yerelde `pnpm test` 80 test DB olmadığı için düşer (`ECONNREFUSED 5432`, `DATABASE_URL is required`); `main` üzerinde de aynı. Gerçek kapı CI (disposable PostgreSQL).
- T45 bundle testi `REQUIRE_PRODUCTION_BUNDLE=true` ve `pnpm run build` sonrası `dist/` ile koşar.
- 320 px ölçümü iframe ile yapılamaz (`frame-ancestors 'none'`); rota rota gezilip `document.documentElement.scrollWidth` okunur.
