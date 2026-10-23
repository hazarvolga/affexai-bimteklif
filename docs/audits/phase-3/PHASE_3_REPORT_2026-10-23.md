# Faz 3 kapanış raporu — mevzuat ve hesap motorları

**Tarih:** 23 Ekim 2026
**Kapsam:** T19–T26
**Başlangıç baseline:** `a836b6ed384e84afd377d3f7cead434a37a4210b`
**Durum:** geliştirme ve otomatik doğrulama tamamlandı; L3 uzman, lisanslı standart, gerçek vendor dosyası ve production kabulü açık.

## Sonuç

Faz 3 motorları eksik, doğrulanmamış veya kapsam dışı kanıttan olumlu mevzuat kararı üretmeyecek biçimde kapatıldı. Ortak kaynak manifestosu ve yeniden kullanılabilir `EvaluationEnvelope` referans sözleşmesi eklendi; mevcut motorların farklı sonuç tipleri tek tipe dönüştürülmüş gibi gösterilmedi. Kamu/standart kaynaklarının erişim ve kimlik durumu sonuçlarda korunur.

| İş | Uygulanan kapanış | Otomatik kanıt | Uzmanda kalan iş |
|---|---|---|---|
| T19 YAMBİS | Değerlendirme tarihi, 31.12.2026 geçiş sınırı, kesin/potansiyel grup ve banka kanıtı ayrıldı. | Tarih sınırı, eksik/yetersiz/yeterli banka ve grup testleri. | Bakanlık metni ve gerçek başvuru dosyası üzerinden imzalı kabul. |
| T20 KİK ADT/%80 | İdare YM cetveli teklif satırlarından ayrıldı; kurum, belge kimliği ve SHA-256 ile doğrulanmamış cetvel resmî liste üretmez; YM kuruş mutabakatı ve deterministik sınır kalemi uygulanır. | KİK örneği, N sınırları, Türkçe sayı, sıralama, teklif bağımsızlığı ve user-asserted negatif testleri. | Yetkili ihale uzmanının gerçek EKAP/idare paketiyle kabulü. |
| T21 4735 | 01.09.2025 rejimi; ihale/sözleşme tarihi, iş programı, gecikme, avans/mahsup, resmî TÜİK HTTPS kaynak ve dönem/yayın kronolojisi bağlandı. Kullanılan seri, dönem, URL ve yayın tarihi sonuçta değişmez kanıt snapshot'ı olarak korunur. | Normal, eski rejim, gecikme, negatif fark, eksik kaynak, ters kronoloji ve provenance snapshot testleri. | Sözleşmeye özel hukuk/idare ve maliyet uzmanı karşı hesabı. |
| T22 Kat karşılığı/KDV | Ruhsat/teslim tarihi, 6306 kanıtı, mükellef/faaliyet, konut/işyeri, net alan ve satır matrahı ayrıldı; sıfır matrah exception yerine manuel inceleme üretir. | Karma proje, oran dilimleri, 6306, arsa payı, eksik statü, eski dönem ve sıfır matrah testleri. | Mali müşavir/vergi uzmanı kapsam ve oran kabulü. |
| T23 Pre-BIM | Dahil/sınırlı muaf/tam muaf alan kimlikleri ayrıldı; çift sayım engellendi; plan kararı yalnız verified kurum+belge+tarih+SHA-256 artifact'ıyla üretilebilir. | Muaf havuz, duplicate, legacy toplam, CSV/XLSX ve geçersiz/user-asserted plan kanıtı testleri. | Belediye plan notu ve bağımsız inşaat mühendisi örneği. |
| T24 Minha | Host+satır+bitiş katmanı kompozit anahtarı, normalize açıklık kimliği, brüt/net koruması ve doğrulanmış sözleşme baskısı eklendi. CSB söve alanı yalnız kaynaklı derinlikle geri eklenir; uygulanan baskı kimliği/hash'i sonuçta değişmez snapshot olarak kalır. | Profil provenance, duplicate, farklı hostta aynı line id, aşırı düşüm, net QTO ve 2×1 açıklık/söve regresyonları. | Proje özel şartnamesi/CSB/DIN lisanslı baskı ve gerçek vendor model kabulü. |
| T25 TS/TBDY/3×3 | Şirket %3/STR politikası normatif gözlemden ayrıldı; açık standart seçimi, temel/zemin koruması ve server context aktarımı eklendi. Worker'daki kaynaklı zemin teması Python→Zod→kanıt→kural zincirinde taşınır; belirsiz bağlam `unknown` ile fail-closed kalır. Normatif paket değerlendirilemiyorsa global PASS yoktur. | Sınır değerler, standart seçimi, foundation/soil, worker metadata, policy/norm ayrımı ve server-path testleri. | TS 500/TS 708 lisanslı metin ve bağımsız yapı mühendisi hesabı. |
| T26 e-PYS/ISO | EK-9 satır modu/kanıtı, schema v2, identity/access kapıları, CDE tuple ve LOIN ayrımı eklendi. e-PYS/ISO legacy `isValid` yanlış yeşil vermez; ham mahal/malzeme adları kalıcı ref'e yazılmaz; PozNo malzeme ile ikame edilmez. | Python rapor, Zod v1/v2, server persist, CDE/LOIN, eksik otomatik kanıt ve veri minimizasyonu testleri. | Resmî e-PYS dosya kimliği/hash'i, ISO lisanslı metin ve kurum kabulü. |

## Başlıca kod yüzeyleri

- `src/lib/regulatory/*`, `src/lib/yambis-classification.ts`, `src/lib/kik-adt.ts`
- `src/lib/price-escalation.ts`, `src/lib/kat-karsiligi.ts`, `src/lib/pre-bim-feasibility.ts`
- `src/smartcheck/rules/minha.ts`, `three-by-three.ts`, `epys.ts`, `iso19650.ts`
- `src/smartcheck/import/epys-preflight-runner.ts`, `processor.ts`, `ifc-python-runner.ts`
- `workers/ifc/epys_preflight.py`, `workers/ifc/ifc_extract.py`
- İlgili hesaplayıcılar, SmartCheck UI, landing/mevzuat/sözlük ve admin roadmap yüzeyleri.

## Kaynak durumu

- YAMBİS Bakanlık duyurusu: `https://meslekihizmetler.csb.gov.tr/haberler/yapi-muteahhitligi-yonetmeliginde-degisiklik-resmi-gazete-de-yayimlandi-305161`
- KİK m.45.1.2 karar örneği: `https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=26178bd78b9730925abbf20cecee0c1b9668cd30333cd4f9b4e9dde116a58a53`
- KİK fiyat farkı/RG 32971: `https://kik.gov.tr/Mevzuat.aspx?AnaSayfa=true&keyword=fiyat+fark%C4%B1+kararnamesi`
- TBDY 2018: `https://resmigazete.gov.tr/eskiler/2018/03/20180318M1-2.htm`
- ISO 19650 katalog kaydı: `https://www.iso.org/standard/68078.html`
- TS 500/TS 708 ve ISO tam metinleri `access_required`; e-PYS nihai belge kimliği `identity_pending`; vergi ve proje özel sözleşme yorumları `expert_review_required` kalır.

## Doğrulama

- Faz 3 odaklı TypeScript: **168/168 geçti**, skip yok.
- Tam TypeScript paketi, yalnız geçici `teklifpro_bootstrap_test` PostgreSQL üzerinde: **1204 geçti, 0 başarısız, 5 koşullu skip**. Testten sonra geçici container kaldırıldı; mevcut yerel veritabanlarına dokunulmadı.
- Python IFC/e-PYS/vendor paketi: **68/68 geçti**.
- `pnpm run lint`: geçti.
- `pnpm run build`: geçti; yalnız mevcut büyük Vite chunk uyarıları var.
- Admin roadmap içerik testleri: odaklı paketin içinde geçti.
- Kod incelemesi ve güvenlik incelemesi: ilk HIGH/MEDIUM bulgular ile son provenance bulguları kapatıldı; kapanışta yeni CRITICAL/HIGH/MEDIUM bulunmadı.

## Kapanış sınırı

Bu rapor yazılım geliştirme ve otomatik doğrulama kapanışıdır. Resmî uygunluk, bağımsız uzman imzası, gerçek müşteri/vendor dosyası kabulü veya production deploy kanıtı değildir. Aşağıdaki girdiler Faz 9 T50–T52 kapısında açık kalır:

1. TS 500, TS 708, DIN ve ISO lisanslı baskılarının yetkili kapsam/madde kabulü.
2. e-PYS resmî dosya kimliği, sürümü ve hash'i.
3. Vergi, ihale ve sözleşme rejimlerinin isimli uzman karşı hesapları.
4. İzinli gerçek vendor/müşteri dosyalarıyla STR/ARC/MEP/COST kabul paketi.
5. Kullanıcı onaylı release adayı, migration/restore/rollback ve canlı smoke kanıtı.

Faz 4 geliştirme sırası açılmıştır. Production deployment yapılmamıştır.
