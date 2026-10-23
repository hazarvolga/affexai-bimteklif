# Faz 0 — Kapsam ve kanıt sözleşmesi

**Tarih:** 23 Ekim 2026
**Kod baseline:** `e748481684b296cc6a1cd5de0365136b47384d2b`
**Durum:** TAMAMLANDI — geliştirme kanıt sözleşmesi hazır; dış kabul kapıları Faz 9/T50–T51'de açık
**Dağıtım:** Yasak — 12 faz tamamlanmadan production deployment yapılmaz

## Kapanış kararı

Faz 0, sonraki geliştirmelerin kanıt sınırını sabitler. Bu kayıtlar bir hesap motorunu, mevzuat uygunluğunu veya ticari iddiayı onaylamaz. Açık dış bağımlılıklar görünür blocker olarak korunur. `PHASE_0_GATE_DECISION_2026-10-23.md` ile geliştirme kapısı ve Faz 9 yayın kabulü ayrılmıştır. Envanter, edinim protokolü, senaryo/uzman matrisi, trust-store ve validator hazır olduğu için Faz 0 geliştirme kapısı kapanmıştır; gerçek uzman/vendor/müşteri kabulü kapanmamıştır.

| İş | Sonuç | Kanıt | Kalan kapı |
|---|---|---|---|
| T01 | 31/31 bulgu tekil ID, karar ve To-Do ile kaydedildi | `finding-register.json` | Kod/test kapanışları ilgili fazlarda |
| T02 | 12 kaynak alanı; sürüm, erişim, tarih ve belirsizlik sınıflarıyla kaydedildi | `source-register.json` | TS 500, TS 708 ve ISO 19650 lisanslı nüshaları; konsolide imar/yangın/4734/4735/KDV kapsamı |
| T03 | Registry’deki 19/19 capability gerçek davranış ve dört ayrı iddia sınırıyla kaydedildi; “Türkiye’de tek” araştırma protokolü önceden sabitlendi | `capability-claim-register.json` | Rakip araştırması ve hukuk/reklam incelemesi Faz 10’da |
| T04 | **Geliştirme sözleşmesi tamamlandı.** Fixture/vendor edinim protokolü, üçlü senaryo matrisi, altı uzman kapsamı, trust-store ve beş açık lisanslı teknik fixture kayda bağlandı | `reference-register.json`, `open-source-fixture-register.json`, `expert-assignment-register.json`, `expert-trust-store.json`, `EXPERT_REVIEW_DOSSIER_2026-10-23.md` | İzinli gerçek vendor/müşteri dosyaları, bağımsız beklenen çıktılar ve isimli insan uzmanları T50–T51 yayın kapısında açık |

## Kanıt katmanları

Git, uzak Git, CI, canlı uygulama ve worker tek bir “çalışıyor” sonucu altında birleştirilmez. `phase-0-verification.json` her katmanın komutunu, sonucunu ve sınırını ayrı tutar.

- Yerel ve uzak `main`: `e748481684b296cc6a1cd5de0365136b47384d2b`.
- GitHub Verify: run `39792099960`, başarılı.
- Canlı health: sağlıklı, revision `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e`.
- Canlı ile HEAD arasındaki izlenen fark yalnız `docs/agent-memory/WORKING_STATE.md`; çalışan imaj içeriği doğrudan incelenmedi.
- Worker/container runtime: doğrulanmadı; production erişimi veya mutation yapılmadı.

## Kaynak kararları

- `public_verified`, yalnız erişilen resmî kamu kaynağını gösterir; tüm konsolide mevzuatın eksiksiz doğrulandığı anlamına gelmez.
- `local_reference`, depodaki dosyanın hashini korur; ticari kullanım hakkı veya güncel fiyat olduğunu kanıtlamaz.
- `access_required`, `scope_pending`, `expert_review_required` ve `identity_pending` kaynaklar normatif eşik onayı veremez.
- e-PYS depo PDF’sinin dosya adı “Taslağı” içerir. Resmî nihai metinle kimlik/hash eşleşmeden nihai mevzuat kanıtı sayılmaz.
- Sentetik fixture, gerçek müşteri kabulü veya L4 kanıtı değildir.

## Uzman ve gerçek dosya kapıları

STR, ARC, MEP, COST, vergi ve ihale disiplinlerinde isimli bağımsız insan uzman atanmadı. AI/agent incelemesi uzman imzası sayılmaz. ALLPLAN, Revit, ArchiCAD ve Tekla için yazılı kullanım izni bulunan gerçek pilot dosyaları ile imzalı PDF örneği de mevcut değildir. Bu eksikler geliştirmeyi değil T50–T51 bağımsız kabul ve yayın kapısını bloke eder.

Açık lisanslı teknik referans araştırması tamamlandı. buildingSMART IFC2X3,
IFC4 ve IFC4X3 dosyaları ile veraPDF PDF/A-2b PASS/FAIL çifti immutable hash,
lisans, upstream commit ve makine çıktısıyla kayda bağlandı. Bu set vendor
uyumluluğu, bağımsız mühendislik sonucu veya L3/L4 kabulü sayılmaz. Vendor
edinim sonucu `VENDOR_FIXTURE_RESEARCH_2026-10-23.md`, uzmanlara bırakılan
minimum iş ise `EXPERT_REVIEW_DOSSIER_2026-10-23.md` içindedir.

## Makine doğrulaması

```bash
pnpm exec tsx --test scripts/phase-0-evidence-validator.test.ts
pnpm exec tsx scripts/phase-0-evidence-validator.ts .
pnpm exec tsx --test src/capabilities/registry.test.ts
```

Validator şu hatalarda başarısız olur: 31 bulgudan veya 19 capability’den eksik/tekrar kayıt, erişilemeyen standardı hashli onay kanıtı gibi sunma, fixture hash sapması, sentetik kanıtı L4 sayma, eksik senaryoyu blocker olmadan bırakma ve Git/CI/live/worker katmanlarını eksiltme.

## Dış kabul için gereken girdiler

1. STR, ARC, MEP, COST, vergi ve ihale kapsamları için isim, yetkinlik, çıkar çatışması beyanı ve kabul tarihi bulunan bağımsız insan uzman ataması.
2. Yazılı kullanım izni ve PII kararı bulunan ALLPLAN, Revit, ArchiCAD ve Tekla IFC örnekleri ile boş, nested, 21+ sayfalı ve geçerli imzalı PDF örnekleri.
3. Her motor için normal, sınır ve eksik/hatalı senaryoların bağımsız insan tarafından hazırlanmış beklenen çıktı dosyaları.
4. TS 500, TS 708 ve ISO 19650 için kullanılacak sürüme yetkili erişim/lisans kaydı.
5. Altı ÇŞB katalog artefaktı için kapsamı ve tarihi belli ticari kullanım yetkisi kaydı.

Bu girdiler tamamlanınca validator yeniden çalıştırılır; `externalAcceptanceReady=true` ve `closureEligible=true` ancak semantik kapılar gerçekten sağlandığında üretilebilir. Faz 0 geliştirme sonucu `developmentGateReady=true` olarak ayrıca korunur.
