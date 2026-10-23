# Faz 1 — Poz, Birim ve Fiyat Kanıt Zinciri

**Tarih:** 23 Ekim 2026
**Kapsam:** T05–T09
**Teknik kapı:** Geçti
**Bağımsız uzman / ticari kullanım kapısı:** Açık; üretim yayınına izin vermez

## Sonuç

Faz 1, kod tarafındaki fiyat uydurma ve sessiz birim dönüşümü yollarını kapatır. Bu sonuç, ÇŞİDB/YFK kataloglarının ticari kullanım izni veya bağımsız maliyet uzmanı kabulü değildir. Resmî kaynaklar izin kanıtı gelene kadar `pending` kalır ve fiyat döndüremez.

| İş | Teknik durum | Kanıt | Açık kabul |
|---|---|---|---|
| T05 — 18.848 satır katalog denetimi | Tamamlandı | 6 PDF SHA-256 eşleşti; 18.809 doğrudan fiyat/rayiç, 18 yaklaşık maliyet sınıfı, 21 endeks; yayın seçilebilir 0 | TÜİK kitabı bağımsız reparse paritesi ve ticari kullanım izni |
| T06 — imalat → poz çözümü | Tamamlandı, fail-closed | Exact kod + birim + semantik + koşul resolver; bilinen 4 yanlış poz üretimde `UNRESOLVED` | Bağımsız maliyet uzmanının doğru poz/ölçü esası kabulü |
| T07 — miktar/birim sözleşmesi | Tamamlandı | m²/m³/m/kg/ton/adet; kanıtlı kalınlık/yükseklik/çevre; brüt/minha/net/fire/maliyet/teklif/hakediş ayrı ledger | Eski metraj modüllerinin tamamına yaygın entegrasyon sonraki fazlarda izlenecek |
| T08 — BYOL / ÇŞB kaynak seçimi | Tamamlandı | Tenant izolasyonu; BYOL ve resmî kaynak havuzları ayrıldı; resmî kaynak kullanıcı beyanıyla yetkilendirilemez | ÇŞİDB/YFK izin kaydı |
| T09 — fiyat provenance ve kilit | Tamamlandı | Gerçek satır manifesti hash'i, kapsam, karar veren kullanıcı, review, tarih, currency ve geçerlilik; transaction içi satır-snapshot eşdeğerliği | Bağımsız COST kabulü |

## Katalog denetimi

- Toplam gömülü satır: **18.848**.
- Doğrudan birim fiyat/rayiç: **18.809**.
- Yapı yaklaşık maliyet sınıfı: **18**.
- TÜİK endeks eşlemesi: **21**.
- Duplicate, conflict, eksik alan, geçersiz kod, sıfır/negatif fiyat ve sözlük dışı normalize birim: **0**.
- Pinned `pypdf 6.19.0` ve aynı uygulama parser'ı ile exact reparse: **18.827/18.848 (%99,89)**.
- İlk beş kitap tam eşleşti. TÜİK kitabı `21 embedded / 20 reparsed / 0 exact`; bağımsız kaynak paritesi açık bırakıldı.
- Ayrıntılı rapor: `docs/audits/phase-1/CSB_2026_CATALOG_AUDIT.md`.

## Güvenlik ve bütünlük kapıları

- `official_reference` kaynakları tenant yöneticisinin beyanıyla `authorized` olamaz; `pending` oluşturulur.
- Tenant kaynaklarında bildirilen hash, sunucunun gerçek payload üzerinden hesapladığı SHA-256 ile eşleşmek zorundadır.
- Manuel override kaynağı ve snapshot'ı ayrı oluşturucu kimliği taşır; bunlardan birini oluşturan kullanıcı aynı snapshot'ı onaylayamaz. Eski, oluşturucusu bilinmeyen kayıtlar fail-closed kalır.
- SmartCheck manuel fiyat girişi, sunucunun gerçek satır manifestini hash'lediği yetkili katalog import yolunu kullanır; snapshot teklif kullanımından önce farklı bir yetkilinin gerekçeli onayını ister.
- Fuzzy açıklama eşleşmeleri yalnız inceleme önerisidir; otomatik fiyat için exact poz, canonical birim, semantik, tek aday, TRY, onay, yetki ve güncellik gerekir.
- Gelecekte başlayacak veya süresi dolmuş snapshot kullanılamaz.
- Teklif kilidi quote, item, snapshot ve source satırlarını transaction içinde kilitler; birim, para birimi, tutar ve poz/açıklama eşdeğerliğini yeniden doğrular.
- Kilit hash'i ve immutable evidence, kaynak hash'i ile authorization/review/geçerlilik kararını içerir.
- SmartCheck mevcut ve yeni teklif aktarımları aynı `authorized + approved + current + exact equivalence` kapısını uygular.
- Her teklif satırı için tek `current` fiyat kanıtı partial unique index ile korunur.

## Doğrulama

- Faz 1 odaklı saf testler ve son güvenlik regresyonları: **66/66 geçti**.
- Disposable PostgreSQL üzerinde pricing + SmartCheck yaşam döngüsü integration testleri: **4/4 geçti**; manuel kaynağın yetkilendirilmesi, aynı kullanıcının onayının reddi ve ikinci kullanıcı onayı dahil.
- T05 test coverage: line **%99,73**, branch **%97,27**, function **%100**.
- `pnpm run lint`: geçti.
- `pnpm run build`: geçti.
- Katalog audit generation ve deterministic `--check`: geçti.
- Tarayıcı doğrulaması: Landing Page sentetik demo ve “18.848 kaynak satırı / kullanım yetkisi ayrı kapı” metnini gösterdi.
- Ayrılmış `postgres:16` veritabanında tam `pnpm test`: **1.125 geçti, 0 başarısız, 5 bilinçli skip**. Pricing ve SmartCheck kritik yaşam döngüsü ayrıca **4/4** geçti.

## Release migration kapısı

`drizzle-release/0009_price_source_authorization.sql` üretildi. Unique current-price indexinden önce legacy duplicate kanıtlar deterministik biçimde temizlenir: teklif satırının bağlı snapshot'ı tercih edilir; sonra `created_at DESC`, sonra `id DESC` uygulanır ve diğerleri `superseded` olur. Duplicate legacy fixture ile gerçek upgrade testi geçti. `postgres:16` ile boş disposable veritabanında structured snapshot bağımsız materialize edildi; SQL, snapshot ve logical catalog hashleri `stage-signatures.ts` içinde pinlendi. Pin/parite, bootstrap, additive migration, legacy duplicate remediation, idempotency, forged-ledger, rollback, drift ve test-isolation alt testleri geçti. Synthetic backup/restore alt testi, makinede kullanıcıya ait `teklifpro-postgres` adında mevcut başka bir container bulunduğu ve doğrulayıcı güvenlik gereği yalnız bu exact adı kabul ettiği için çalıştırılmadı; mevcut container'a dokunulmadı. Bu eksik, üretim restore başarısı olarak yorumlanmaz.

## Bağımsız uzmana kalan dar kapsam

1. Dört reddedilen eski eşleme ve kalan imalat profilleri için doğru poz, kapsam ve ölçü esası imzası.
2. ÇŞİDB/YFK kataloglarının ticari SaaS kullanım kapsamını gösteren izin/kayıt.
3. TÜİK 21 satırının bağımsız parser veya sayfa/satır provenance doğrulaması.
4. Gerçek üretim verisi içermeyen restore rehearsal sonrasında üretim backup/rollback operasyon kabulü.

Bu dört kabul tamamlanmadan “resmî fiyat”, “uzman onaylı poz” veya üretime hazır fiyat motoru iddiası yapılmaz.
