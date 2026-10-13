# BIMMetraj GAP Raporu — 13 Ekim 2026

Oct 13, 2026 · @Hazar

**Karar (13 Ekim revizyonu): bimmetraj.com üretimde çalışıyor ve artık yeni müşteri kaydolabiliyor, ama hâlâ production-ready değil.** Transactional e-posta 13 Ekim'de canlıya çıktı. Kalan engeller: tahsilat yok, satılan IFC/e-PYS kapasitesi üretimde kullanılamıyor, AI/PDF/CRM limitleri paket kataloğuna bağlı değil ve para hesabında kuruş yuvarlama hatası vardı (düzeltildi, commit bekliyor).

## Canlı durum (13 Ekim 2026, 09:10 TSİ)

Altyapı sağlıklı; kayıt 13 Ekim'de açıldı, ticari akışın kalan iki kapısı (ödeme, SmartCheck) kapalı. Kontroller anonim HTTPS istekleriyle yapıldı.

| Kontrol | Sonuç (13 Ekim 09:10) | Yorum |
| --- | --- | --- |
| `bimmetraj.com`, `www` | 200, Cloudflare arkasında, HTTP → HTTPS 307 | Çalışıyor; `www` apex'e yönlenmiyor |
| Güvenlik başlıkları | HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy | **Content-Security-Policy yok** |
| `/api/health` | 200, DB bağlı, `emailDeliveryConfigured: true` | `smartcheckStorageConfigured: null` |
| Health revizyonu | `846139e` | Canlıdaki gerçek sürüm `a0bc784`; alan sabit env, güvenilmez |
| Kayıt (`POST /api/auth/register`) | Boş gövdeye doğrulama hatası | **Kayıt açık**; 12 Ekim'de e-posta kapalı diye reddediliyordu |
| E-posta DNS | SPF `mx -all`, DMARC `p=reject`, MX ve PTR `mail.affexai.tr` | **DKIM kaydı bulunamadı** (yaygın Stalwart seçicileri tarandı) |
| Korunan API'ler | 401 | Doğru |
| `/api/public/plans` | 200, 5 paket yayında | Katalog DB'den geliyor |
| SmartCheck içe aktarımı | Sunucu `SMARTCHECK_IMPORT_DISABLED` (404) dönüyor | Tarayıcıdaki IFC ön analizi çalışıyor ama yalnız `demo_estimate`; kanıt değil, kotaya sayılmıyor |
| `sitemap.xml` | 404 | SEO eksik |
| Coolify paneli | Okunamadı | Uygulama içi tarayıcıda oturum yok; bilgi repo kayıtlarından |

Üretim topolojisi (Compose): `app`, `worker`, `ifc-worker`, `migrate`, `backup`; host 8 CPU / 24 GB; günlük 03:00 yedek, R2'ye kopya ve restore tatbikatı başarılı.

## 8 Ekim'den bu yana kapananlar

8 Ekim raporundaki 12 P0'ın 11'i kodda kapatılmış ve kanıtlanmış; kalan P0-12 (pilot kanıtı) aşağıda P0-3 olarak duruyor.

| 8 Ekim P0 | Bugünkü kanıt |
| --- | --- |
| P0-01 Lint/test kırık | `tsc --noEmit` bugün 0 hata; CI (`verify.yml`) lint + test + build + migration + Prisma + audit kapıları içeriyor; son tam koşu 790 test (1 fixture hatası onarım bekliyor) |
| P0-02 JWT sabit fallback | `authService.ts` ve `production.ts` 32 karakter altı / placeholder secret'ta başlatmayı durduruyor |
| P0-03 Token'daki rol/şirkete güven | Middleware her istekte `memberships` tablosundan rol okuyor |
| P0-04 Anonim `/api/company` | Canlıda 401 |
| P0-07 PDF injection/SSRF | `escapeHtml`, istek yakalama açık, `--no-sandbox` yok (testle sabitlenmiş); Chromium seccomp profili |
| P0-08 Kota fail-open | Kota hatası 503 dönüyor; AI kotası rezervasyonla tüketiliyor |
| P0-09 Plaintext davet tokenı | `sha256:` hash'li saklama, tek kullanımlık transaction |
| P0-10 Deploy topolojisi yok | Coolify Compose: app + worker + ifc-worker + migrate + backup, healthcheck, runtime-only secret |
| P0-05 Migration zinciri | `drizzle-release/` 0000–0006 sürümlenmiş zincir; boş DB'den restore tatbikatında 68 tablo eşleşti |
| P0-06 Teklif/revizyon atomik değil | services/quotations/integrity.ts ve edit.ts db.transaction kullanıyor; quotations.integrity testi var |
| P0-11 Kritik/yüksek bağımlılık açıkları | CI'daki audit politikası high/critical bulguyu blokluyor; tek istisna extract-zip (yalnız indirme), 22 Ekim 2026'da süresi doluyor — o tarihten önce yükselt |

Ayrıca: yedekleme + restore drill, R2 ayrı kimlik bilgisi, sahte resmî fiyat denetiminin kaldırılması ve dinamik paket kataloğu canlıya çıktı.

## P0 — production öncesi zorunlu

Altı açık P0 var; P0-1 13 Ekim'de kapandı. P0-2, P0-3 ve P0-6 kapanmadan ürün söz verdiğini satamaz; P0-4, P0-5 ve P0-7 kapanmadan müşteri verisi ve rakamları güvenle taşınamaz.

| ID | GAP | Kanıt | Çıkış kriteri |
| --- | --- | --- | --- |
| P0-1 | ~~Transactional e-posta kapalı~~ **Kapandı (13 Ekim)** | `a0bc784` canlıda; Stalwart 465 TLS, sınırlı süre, fail-closed | Kalan: DKIM ve gelen kutusu yerleşimi (P1-8) |
| P0-2 | Tahsilat yok | Stripe yalnız test modunda; checkout/portal/webhook imza-replay testleri eksik | Sandbox abonelik döngüsü idempotent; mesafeli satış + KVKK metinleri hukuk onaylı |
| P0-3 | Satılan IFC/e-PYS kapasitesi üretimde kullanılamıyor | `SMARTCHECK_IMPORT_ENABLED=false`, S3 boş; "e-PYS & BIM Standart Denetçi" paketi (390 TL, 50 IFC/ay) ana işlevi kapalı satılıyor | Ya pilot tenant'ta açık + 5 dosyalık kanıt, ya da paket açıklaması "pilot/yakında" |
| P0-4 | Gözlemlenebilirlik yok | `SENTRY_DSN` var, kodda Sentry yok; alarm yok; revizyon sabit env | Hata izleme + kuyruk metrikleri + çalışan alarm; revizyon build'den |
| P0-5 | Release kapısı ve güvenlik incelemesi | Bağımsız güvenlik incelemesi yok; CSP yok | Temiz ağaçtan tam suite yeşil; harici inceleme; CSP |
| P0-6 | Paket limitlerinin çoğu DB planına bağlı değil | AI/PDF/CRM/mevzuat/kârlılık limitleri kod içindeki `PLAN_LIMITS.starter`'dan; her yeni kayıt `starter` | Her limit `plans` tablosunda; 5 paketin her biri için limit testi; kullanım raporu aynı kaynaktan |
| P0-7 | Hesap doğruluğu | Yuvarlama hatası düzeltildi (commit bekliyor); ekran marjı ile sunucu marjı farklı; eskalasyon formülü 1,9 kat fazla | Aşağıdaki "Hesap doğruluğu ve paket limitleri" tablosunun tüm satırları kapalı |

## P1 — pilot kalitesi ve ticari kullanılabilirlik

P1'ler satışı durdurmaz ama ilk ücretli müşteride güveni ve marjı korur.

| ID | GAP | Neden önemli | Çıkış kriteri |
| --- | --- | --- | --- |
| P1-1 | Uygulama ve worker DB'ye migration sahibi rolüyle bağlanıyor | Bir SQL injection veya hatalı kod şemayı silebilir | Ayrı runtime DML rolü; Graphile kuyruğu için bootstrap + RLS |
| P1-2 | Resmî fiyat verisi yok | YFK ticari kullanım için yazılı izin istiyor; canlıda 5 kaynak meta verisi, 0 fiyat satırı | Lisans/izin yazılı; lisanslı CSV içe aktarımı insan onayıyla canlıda |
| P1-3 | IFC'den teklife aktarımda sabit demo m³ fiyatları (3600–4200 TL) | `CreateQuote` → `quotation-transfer.ts`; kalemler `needs_review` ama fiyat gerçek gibi görünüyor | Aktarımda fiyat boş gelsin veya onaylı fiyat kaynağından dolsun |
| P1-4 | `www` ve apex ayrı sunuluyor, sitemap yok, CSP yok | SEO bölünmesi, XSS etkisini sınırlayan katman eksik | `www` → apex 301, `sitemap.xml`, CSP |
| P1-5 | Kurumsal paket 250 MB IFC vaat ediyor, platform 100 MB'de kesiyor | Satış vaadi ile teknik sınır çelişiyor | Paket metni ile gerçek limit eşit |
| P1-6 | Mevzuat taraması ve AI akışları sağlayıcı anahtarı olmadan | Üretimde AI kapalı; değerlendirme seti yok | Anahtarlar runtime secret; AI çıktıları için küçük eval seti ve maliyet tavanı |
| P1-7 | Ajan hafızası şişti ve çelişiyor | `WORKING_STATE.md` 1.409 satır; eski yollar (`/Users/hazarekiz/...`) ve Vercel notları güncel Coolify gerçeğiyle karışık | Tek sayfalık güncel durum + arşiv; Graphify HEAD ile eşit |
| P1-8 | bimmetraj.com için DKIM yok | DMARC p=reject; yalnız SPF hizalamasına dayanıyor, yönlendirilen postalar reddedilir, gelen kutusu yerleşimi zayıflar | Stalwart'ta bimmetraj.com için DKIM anahtarı, DNS'te yayında; Gmail/Outlook'ta gelen kutusu testi |

## Hesap doğruluğu ve paket limitleri (13 Ekim denetimi)

Teklif ve IFC sayaçları doğru kurulmuş: DB kilitli, hata halinde kapanıyor, 14 günlük deneme bitişi zorlanıyor. Sorunlar para yuvarlamasında, ekran ile sunucu arasındaki farklarda ve paket kataloğuna bağlanmamış limitlerde.

| ID | Bulgu | Ölçüm / kanıt | Durum |
| --- | --- | --- | --- |
| L-1 | `roundMoney` yarım kuruşu yanlış yuvarlıyordu | `toFixed(2)`: 1,005 → 1,00; 3 × 0,335 TL satırı 1,00 TL çıkıyordu (doğrusu 1,01) | **Düzeltildi**, commit bekliyor |
| L-2 | Satır toplamları ile genel toplam ayrı yuvarlanıyordu | 100.000 rastgele teklifin %53'ünde PDF satırlarının toplamı ara toplamdan farklı (en çok 4 kuruş) | **Düzeltildi**: toplamlar kuruş cinsinden satırlardan türetiliyor; 20.000 senaryoluk test |
| L-3 | Teklif ekranı kendi hesabını yapıyordu | `CreateQuote.tsx` ayrı formül; kullanılmayan `QuoteEditor.tsx` satır toplamına KDV ekliyor | **Düzeltildi**: ekran `calculations.ts`'e bağlandı. `QuoteEditor.tsx` silinmeli |
| L-4 | Ekrandaki marj risk primlerini içermiyor, sunucudaki içeriyor | Aynı teklif için oluşturma ekranı ile kârlılık raporu farklı marj gösterir | Açık |
| L-5 | Eskalasyon primi doğrusal ve tüm maliyete sürenin tamamı kadar uygulanıyor | 1 M TL, 12 ay, aylık %2: kod 240.000 TL; harcama süreye yayıldığında bileşik ≈ 126.162 TL (≈ 1,9 kat fazla). Demo şablonu aylık %8 × 6 ay = maliyetin %48'i | Açık — formül kararı gerekli |
| L-6 | AI/PDF/CRM/mevzuat/kârlılık limitleri DB planından gelmiyor | `ai-quota.ts` ve `usage-report.ts` `PLAN_LIMITS[subscription.plan]` okuyor; kayıt her zaman `starter` yazıyor → 8.900 TL paket de ayda 20 AI teklifi; PDF/CRM/mevzuat/kârlılık yalnız loglanıyor, sınırlanmıyor | Açık (P0-6) |
| L-7 | Deneme paketi "ilk ücretsiz aktif plan" diye seçiliyor | `monthlyPrice = 0 AND isActive LIMIT 1`; ikinci ücretsiz plan eklenirse belirsiz | Açık: açık `isTrial` bayrağı veya sabit kimlik |
| L-8 | Depolama limitleri pakete bağlı değil | 2 GB ve 1.000 doküman tüm tenant'lar için tek env değeri | Açık |
| L-9 | Tarayıcı IFC ön analizi kotaya sayılmıyor | `/app/ifc-parser` sunucuya gitmiyor; `consumeIfcUsage` yalnız SmartCheck başarılı run'ında | Açık: ya sayılmalı ya pakette "sınırsız ön analiz" denmeli |
| L-10 | Vergi/tevkifat hesabı doğru | Tevkifat = KDV × oran; ödenecek = matrah + KDV − tevkifat | Doğru |

Doğrulama: `tsc --noEmit` 0 hata; `src/lib` hesap testleri 16/16 geçti. DB gerektiren entegrasyon testleri ortak veritabanında çalışmayı reddetti (beklenen koruma); Codex tarafında izole DB ile koşturulmalı.

## Mühendislik ve BIM doğruluğu

Ürünün "bilmediğini bilen" IFC politikası doğru kurulmuş, ama vaat edilen mühendislik denetiminin çoğu kodda tanımlayıcı metin veya çağrılmayan fonksiyon olarak duruyor. Bu bölüm yüksek mühendis/mimar, AI BIM Director ve BIM Knowledge Engineer bakış açılarının ortak bulgusudur.

| ID | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- |
| E-1 | 3x3 kural paketi hiçbir akışta çalışmıyor | `validateThreeByThreeRules` yalnız kendi test dosyasından çağrılıyor; CLAUDE.md ve Director skill'i "zorunlu" diyor | SmartCheck run'ına bağla, sonucu kanıt satırı olarak sakla |
| E-2 | Beyan edilen ve uygulanan 3x3 farklı | CLAUDE.md: %3 metraj, %3 paspayı, %3 poz birimi. Kod: %3 metraj, XC3 ≥ 35 mm (mutlak), taşıyıcı = STR | Tek tanım seç. Paspayı yüzde ile denetlenmez; TS 500 minimum net örtü (iç 20, dış 25, döşeme 15 mm) ve uygulama toleransı mm cinsindendir |
| E-3 | %3 eşiği normatif gibi etiketli | Kod yorumu "TS 500 / ISO 19650" diyor; iki standartta da böyle bir metraj toleransı yok | "Şirket politikası" olarak etiketle, kurala kaynak alanı ekle |
| E-4 | XC3/35 mm kuralı Eurocode 2 kaynağlı, varsayılan standart TBDY/TS 500 | `activeStandard` varsayılanı `TBDY_TS500`; kural EN 1992-1-1 Tablo 4.4N | Kuralı `activeStandard`'a göre seç; TS 500 + TS EN 206 karşılığını ekle |
| E-5 | Akademi bindirme simülatörü TS 500 sonucundan %27 kısa | `ReinforcementEstimator`: C30, Ø16, iyi aderans, orta yük → 600 mm. TS 500 Denk. 9.1–9.2 (r = 1): lb = 549, l0 = 823 mm | Demoya TS 500 modu ekle; uyarı metni zaten var, ama Türk kullanıcı varsayılanı TS 500 olmalı |
| E-6 | e-PYS doğrulaması yalnız tarayıcıda | `validateEpysRules` yalnız `BimIfcParser.tsx` içinde; sunucu SmartCheck hattında yok | Sunucu tarafı kural paketi; skor kanıt olarak saklansın |
| E-7 | Donatı ve kalıp metrajı yok | IFC aktarımı bu kalemleri bilinçli olarak atlıyor (doğru); ama bunlar betonarme maliyetinin büyük payı | TS 708 kütle, TS 500 kenetlenme/bindirme ve kırık ölçü kalıp motoru (skill'deki `eng_calc.py` referans alınabilir) |
| E-8 | İnce işlerde minha motoru yok | ÇŞB (tüm boşluklar düşülür, iç dişler eklenir) ile DIN 18350 (≤ 2,5 m² düşülmez) arasındaki fark tek duvarda bile %15 çıkıyor | Sözleşme ölçü esası proje parametresi + kural |
| E-9 | Reviewer yetkinlik/disiplin kapsamı yok | Review kararı var; kim neyi onaylayabilir modeli yok. Pilot metrikleri `accepted_exception`'ı onaylı sayarak KPI'yı şişiriyor | Reviewer disiplin kapsamı; metrikte istisnayı ayrı say |
| E-10 | ISO 19650 runtime'da yok | EIR/BEP, CDE durumları, suitability kodları yalnız Akademi içeriğinde | Pilot sonrası; pazarlamada "ISO 19650 uyumlu" denmesin |
| E-11 | Repo araştırma dokümanında hatalı değerler | Ø18 için 1,997 kg/m "yasal" deniyor; π·18²/4·7,85e-3 = 1,998 kg/m, EN 10080 tablosu 2,00 | Akademi içeriği yayın öncesi teknik review'dan geçsin |

## Ajan bağlamı ve skill çelişkileri

Üç BIM skill'i (`~/.agents/skills` ve repodaki `.agent/skills` kopyaları aynı) 19–21 satırlık rol tanımları; birkaç maddesi bugünkü mimariyle çelişiyor ve Codex/Antigravity ajanlarını yanlış yöne itebilir.

| Skill | Çelişki | Düzeltme |
| --- | --- | --- |
| bim-software-architect | Vercel serverless (`vercel.json`, `api/index.ts`) diyor; üretim Coolify + Docker Compose | Coolify topolojisini, migration job'ını ve secret politikasını yaz; Vercel'i "eski" diye işaretle |
| bim-software-architect + CLAUDE.md | "Dev Demo / Guest Login Bypass korunmalı" | Kod bunu yalnız `import.meta.env.DEV`'de açıyor (doğru). Skill'e "üretimde asla" kuralı eklenmeli |
| bim-knowledge-engineer | Bindirme/kenetlenme için Eurocode 2 | Türkiye projelerinde TS 500 + TBDY 2018; EC2 yalnız `activeStandard = EUROCODE_2` ise |
| bim-knowledge-engineer | `DEMO-15.120.1001` gibi poz örnekleri | Canlıda onaylı fiyat yok; demo pozlar gerçek poz gibi önerilmemeli |
| ai-bim-director | 3x3'ü "izliyor" ve "tek tıkla düzeltme" öneriyor | Kurallar çalışmıyor (E-1); otomatik düzeltme ürün ilkesiyle (insan onayı) çelişir — "önerilen düzeltme" olmalı |
| ai-bim-director | Faz 1 → Faz 2 (IFC parser) geçişi | IFC parser yazıldı; asıl kapı pilot kanıtı (P0-3) |

**13 Ekim: üç skill bu tabloya göre yeniden yazıldı** (`~/.agents/skills`, `~/.gemini/antigravity-cli/skills`, `~/.gemini/config/skills` ve repodaki `.agent/skills` kopyaları). Adlar aynı; her biri güncel üretim gerçeğini, bilinen boşlukları ve kanonik 3x3 tanımını taşıyor, sayısal hesapları `yuksek-muhendis-mimar` skill'ine devrediyor. Repodaki değişiklik commit bekliyor.

## Yol haritası

1. **Faz 1 — Doğruluk:** hesap düzeltmeleri canlıda, paket limitleri DB kataloğundan, satış vaatleri gerçek limitlerle eşit. *Kapı A:* L-1…L-9 kapalı, 5 paket için limit testi yeşil.
2. **Faz 2 — Gözlem ve güvenlik:** hata izleme + alarm, CSP, `www` → apex, DKIM, ayrı runtime DB rolü. *Kapı B:* bir alarm gerçekten tetiklendi; harici güvenlik incelemesi yapıldı.
3. **Faz 3 — Tahsilat:** Stripe sandbox abonelik döngüsü, webhook imza/replay testleri, hukuk onaylı metinler. *Kapı C:* sandbox'ta uçtan uca ödeme + iptal + yenileme.
4. **Faz 4 — Pilot:** SmartCheck pilot tenant'ta açık, 3x3 ve e-PYS sunucuda, 5 dosyalık kanıt.

Sıra önemli: kayıt açılmadan tahsilat, tahsilat ve alarm olmadan pilot müşteri anlamsız. Fazlara tarih verilmedi; her kapı geçişi kanıtla kapanır.

## Hareket planı

Öncelik sırasıyla; her madde kabul kriteriyle kapanır. Sahip: kodu Codex, karar ve hesapları Hazar, inceleme ve hesap doğrulamasını Claude üstlenir.

- [ ] **1. Hesap düzeltmesini commit et ve canlıya al** (Codex) — `calculations.ts`, test dosyası, `CreateQuote.tsx`; lint + tam test + build yeşil; canlıda 3 × 0,335 TL satırı 1,01 TL. Mevcut tekliflerin toplamları yeniden kaydedilene kadar eski değerle kalır.
- [ ] **2. Paket limitlerini DB kataloğuna taşı** (Codex) — `plans` tablosuna AI, PDF, CRM, mevzuat, kârlılık, depolama limitleri; `ai-quota.ts` ve `usage-report.ts` yalnız plandan okusun; 5 paketin her biri için limit testi; deneme paketi açık bayrakla seçilsin.
- [ ] **3. IFC/e-PYS vaadi kararı** (Hazar) — SmartCheck açılana kadar "e-PYS & BIM Standart Denetçi" ve IFC kotaları "pilot" diye mi satılacak, yoksa yayından mı kalkacak?
- [ ] **4. SmartCheck pilot ortamı** (Hazar + Codex) — R2 bucket ve kimlik, `SMARTCHECK_IMPORT_ENABLED=true` yalnız pilot şirket kimliklerinde; 3x3 ve e-PYS kuralları sunucu run'ına bağlı; 5 izinli dosyada parse + review + aktarım.
- [ ] **5. Eskalasyon formülü ve ekran marjı** (Hazar karar, Codex uygulama) — öneri: harcamanın süreye yayıldığı bileşik formül, *eskalasyona açık maliyet payı* (malzeme + işçilik; sabit/peşin kalemler hariç) × ((1 + v)^(T/2) − 1). T/2 orta nokta yaklaşımıdır; düzgün yayılmış harcamada gerçek değer 1 M TL / 12 ay / %2 örneğinde ≈ 118–140 bin TL aralığındadır; ekran marjı sunucunun `calculateQuotationFinancials` sonucunu göstersin; demo şablonundaki aylık %8 değeri düzeltilsin.
- [ ] **6. DKIM ve gelen kutusu testi** (Hazar) — Stalwart'ta bimmetraj.com DKIM anahtarı, DNS kaydı, Gmail ve Outlook'ta spam dışı teslim.
- [ ] **7. Hata izleme ve alarm** (Codex) — Sentry (veya eşdeğeri), kuyruk/worker metrikleri, bir alarmın gerçekten tetiklenmesi; health revizyonu build'den.
- [ ] **8. Tahsilat** (Codex + Hazar) — Stripe sandbox abonelik döngüsü, webhook imza/replay testleri, mesafeli satış ve KVKK metinleri.
- [ ] **9. Ajan bağlam dosyaları** (Codex) — `CLAUDE.md`, `AGENTS.md`, `CODEX.md` hâlâ "%3 paspayı" ve "Vercel SPA rewrites" diyor; skill'lerdeki kanonik 3x3 tanımı ve Coolify gerçeğiyle eşitlensin (E-2, skill tablosu).
- [ ] **10. extract-zip istisnası** (Codex) — CI audit istisnası **22 Ekim 2026**'da doluyor; bağımlılığı yükselt veya istisnayı kaldır, CI'ın kırmızıya düşmesini bekleme.
- [ ] **11. IFC aktarımında demo fiyatlar** (Codex) — P1-3: `quotation-transfer.ts` sabit m³ fiyatı yazmasın; birim fiyat boş ve `needs_review` gelsin.
- [ ] **12. 250 MB / 100 MB çelişkisi** (Hazar karar, Codex) — P1-5: paket metni gerçek platform limitine çekilsin ya da limit paket bazlı yapılsın.
- [ ] **13. Ayrı runtime DB rolü** (Codex) — P1-1: uygulama ve worker DML yetkili ayrı rolle bağlansın; migration yalnız `migrate` job'ında.
- [ ] **14. Tarayıcı IFC ön analizi kotası** (Hazar karar) — L-9: sayılsın mı, yoksa pakette "sınırsız ön analiz" mi yazılsın?
- [ ] **15. Temizlik** (Codex) — `QuoteEditor.tsx` sil; Akademi bindirme simülatörüne TS 500 modu; repodaki `.agent/skills/yuksek-muhendis-mimar.tgz` sil, `.agent/skills/yuksek-muhendis-mimar/` klasörünü diğer skill'ler gibi commit et; `src/server/crawler/price-parser.ts` `toFixed(2)` yerine `roundMoney` kullansın; `www` → apex 301, `sitemap.xml`, CSP.

## Yöntem ve kaynaklar

Repo `main` HEAD `f915099` (13 Ekim 09:09); canlı sürüm `a0bc784`. Çalışma ağacında bu raporla gelen commit edilmemiş değişiklikler var: `src/lib/calculations.ts`, `src/lib/calculations.test.ts`, `src/pages/CreateQuote.tsx` ve üç skill dosyası. Typecheck 0 hata, `src/lib` testleri 16/16; DB entegrasyon testleri izole veritabanı gerektirdiği için bu ortamda koşturulmadı.

- Repo: `docs/agent-memory/WORKING_STATE.md`, `REMEDIATION_ACCEPTANCE_2026-10-11.md`, `docs/GAP_RAPORU_2026-10-08.md`, `docs/GECMIS_COMMIT_CANLI_PARITE_2026-10-11.md`, `compose.coolify.yaml`, `.github/workflows/verify.yml`, ilgili kaynak dosyalar (tabloda anıldı)
- Canlı: [bimmetraj.com](https://bimmetraj.com), [/api/health](https://bimmetraj.com/api/health), [/api/public/plans](https://bimmetraj.com/api/public/plans)
- Skill'ler: `ai-bim-director`, `bim-knowledge-engineer`, `bim-software-architect`, `yuksek-muhendis-mimar`
- Standartlar: TS 500:2000 Madde 7.3, 9.1.2, 9.2.5; TBDY 2018; TS 708 / EN 10080; Binaların Yangından Korunması Hakkında Yönetmelik Md. 23
- Coolify paneli okunamadı (oturum yok); altyapı bilgisi repo kayıtlarından.
