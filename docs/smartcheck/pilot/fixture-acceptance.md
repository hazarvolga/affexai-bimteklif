# SmartCheck Faz 1 Fixture Acceptance

**Durum:** Sentetik veri paketi hazır; gerçek müşteri pilotu değildir.

## Fixture matrisi

| Fixture | Amaç | Beklenen sonuç |
|---|---|---|
| `mep-01-clean.csv` | Temiz mekanik metraj | 4 satır, açık bulgu yok |
| `mep-02-electrical.csv` | Elektrik birim alias’ları | 4 satır, açık bulgu yok |
| `mep-03-findings.csv` | Birim/miktar/fiyat/zayiat hataları | 4 finding sınıfı görülür |
| `mep-04-duplicate.csv` | Duplicate poz kontrolü | `DUPLICATE_POSITION_CODE` |
| `mep-05-formula-safe.csv` | CSV formula injection | Tehlikeli değerler apostrofla nötralize edilir |
| `negative-corrupt.xlsx` | Uzantı/signature saldırısı | `FILE_SIGNATURE_MISMATCH` |

## Faz 2 pilot-hardening browser acceptance senaryosu

Gerçek kullanıcı akışı `/app/smartcheck` üzerinde şu sırayla kanıtlanır:

1. Admin/pilot kullanıcı oturumu açar.
2. `mep-01-clean.csv` seçilir; upload sonrası kaynak sheet/başlık önizlemesi açılır.
3. MEP eşleme profili seçilir veya kolonlar kullanıcı tarafından düzeltilir.
4. Processing progress `queued → parsing → normalizing → validating → awaiting_review` olarak izlenir.
5. Kaynak cell ve normalize edilmiş satır karşılaştırılır; `Kanıt` panelinde raw/normalized değer, formül, kural sürümü ve reviewer durumu görülür.
6. Bulgulu `mep-03-findings.csv` için miktar düzeltme veya gerekçeli istisna seçilir.
7. Başarısız bir run için operator kuyruğundan yalnızca açık `Retry` aksiyonu kullanılır.
8. Onaylı satırlar taslak teklife aktarılır.
9. Teklif yeniden açılır, revision oluşturulur ve PDF üretilir.
10. Tenant B ile aynı document/row/quotation erişiminin reddedildiği görülür.

Faz 2 API kanıtları:

- `GET /api/smartcheck/documents/:id/preview` kaynak yapısını ve önerilen eşlemeyi döndürür.
- `GET /api/smartcheck/queue` yalnızca aktif tenant’ın son run’larını gösterir.
- `POST /api/smartcheck/documents/:id/retry` yalnızca başarısız son run’ı açık operatör kararıyla yeniden kuyruğa alır.
- Binary yüklemede istemci, `text/csv` veya XLSX MIME değerini JSON varsayılanıyla ezmez.

Bu senaryo gerçek müşteri dosyası veya production S3 kanıtı yerine sentetik acceptance katmanıdır.

## Faz 4 resmî kaynak acceptance

`docs/smartcheck/pilot/phase4-source-intelligence.md` içindeki test, resmî kaynak adapter registry'sinin yalnız allowlist edilmiş HTTPS hostları kabul ettiğini, payload hash'i ile idempotent çalıştığını ve her fiyat/mevzuat diff'ini reviewer kararına bağladığını doğrular. Health ekranı kaynak hash'i ve son başarılı çalışma zamanını gösterir; adaptör kaydı yokken sistem sahte bir `LIVE` durumu göstermez.

Bu acceptance sentetik kaynak payload'ı ile local PostgreSQL üzerinde çalışır. Gerçek crawler/scheduler, lisanslı kaynak erişimi, müşteri dosyaları, teknik reviewer kayıtları ve production S3 admission ayrı pilot kapılarıdır.

## Faz 3 fiyat kanıtı acceptance

Fiyat snapshot akışı `docs/smartcheck/pilot/phase3-pricing-evidence.md` içindeki kaynak hash’i → snapshot → teklif kalemi → kilit hash’i zinciriyle doğrulanır. Süresi geçmiş snapshot kilitlenmeden önce açık kullanıcı kararı ister; başka tenant’ın kaynak veya snapshot’ı kullanılamaz.

Faz 2 canlı smoke ekran kanıtı: `output/playwright/smartcheck-phase2-queue.png` (local-only; commit edilmesi zorunlu değildir).

## Komutlar

```bash
pnpm smartcheck:fixtures
pnpm smartcheck:http-integration
pnpm lint
pnpm build
```
