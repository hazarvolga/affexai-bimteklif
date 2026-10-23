# Faz 7 / T42 — transaction ve idempotency kanıt raporu

**Tarih:** 24 Ekim 2026
**Kod baseline:** `30bb9eeedd3e64a468e9d4ae71f9396bcd4552ce`
**Hesaplama kaydı:** `BIM-CALC-2026-10-24.43` / `Rev. 49`
**Karar:** **PARTIAL — manuel Havale/EFT yaşam döngüsü kod ve disposable PostgreSQL 16 düzeyinde sertleştirildi; T42 ve production kapanışı yok**

## Kapanan dilim

- Sipariş init'i company+plan+cycle transaction kilidinde tek `created` olayı üretir; replay `200` döner ve ikinci e-posta sinyali üretmez.
- Submit zorunlu sunucu kaynaklı UUID `requestId` ile yalnız `awaiting_transfer → pending_approval` geçişine izin verir.
- Plan, dönem ve tutar ilk siparişten sonra immutable snapshot olarak korunur.
- Dekont/işlem referansı NFKC ile canonical hale gelir, görünmez/geçersiz karakterleri reddeden dar ASCII sözleşmesine uyar ve banka/tenant seçiminden bağımsız global kilit altında tekilleştirilir.
- Admin review submit ile aynı request kilidini kullanır; yalnız pending talep tek terminal `approved` veya `rejected` kararı alır.
- Onay anında plan `FOR SHARE` altında yeniden aktif doğrulanır; company → plan → subscription kilit sırası kota/admin akışlarıyla aynıdır.
- Aynı aktif planın ikinci gerçek ödemesi aboneliği bugünden resetlemek yerine mevcut dönem sonuna seçilen süreyi ekler.
- Vergi alanı + submitted event ile subscription + SmartCheck flag + terminal audit event kendi transactionlarında atomiktir.

## Doğrulama

| Kontrol | Sonuç |
|---|---:|
| PostgreSQL 16 bank-transfer integration | 5/5 PASS |
| Bank-transfer unit | 8/8 PASS |
| Auth action integration ile odaklı toplam | 14/14 PASS |
| TypeScript | PASS |
| `git diff --check` | PASS |
| Bağımsız code review | GO — CRITICAL/HIGH/MEDIUM yok |
| Bağımsız security review | GO — CRITICAL/HIGH/MEDIUM yok |
| Bağımsız TDD/CI review | GO — T42 kapsamında bloklayıcı açık yok |

Repo geneli tek-thread koşuda 1.311 testten 1.300'ü geçti. Beş mevcut SmartCheck queue/worker testi disposable ortamda worker migration tablosu hazırlanmadığı için kırmızıdır; bu nedenle repo geneli CI yeşil sayılmaz ve deploy kapısı açılmaz.

## Açık sınırlar

- Academy webhook aynı enrollment üzerindeki farklı purchase/refund eventlerini entitlement ledger/fencing olmadan işliyor; ayrı T42 dilimidir.
- SmartCheck worker aynı run için atomik claim/attempt fencing taşımıyor; geç hata başarılı sonucu bozabilir.
- PDF/spreadsheet artifact, run ve document finalizasyonu tek atomik CAS transactionında değildir.
- `admin_audit_logs` olay akışı canonical ödeme tablosu ve DB `UNIQUE` constraint'i yerine cooperative transaction kilitleri kullanır. Bu dilim uygulama yolunu korur; ele geçirilmiş DB credential ile doğrudan SQL'e karşı kalıcı finansal ledger değildir.
- Banka API'si/mutabakatı, gerçek dekont doğrulaması, production deploy, canary ve rollback yapılmadı.

Bu rapor bağımsız mali müşavir, banka, ödeme kuruluşu veya güvenlik denetçisi kabulü değildir.
