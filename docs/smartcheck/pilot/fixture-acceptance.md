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

## Browser acceptance senaryosu

Gerçek kullanıcı akışı `/app/smartcheck` üzerinde şu sırayla kanıtlanır:

1. Admin/pilot kullanıcı oturumu açar.
2. `mep-01-clean.csv` seçilir ve kolonlar doğrulanır.
3. Processing progress `queued → parsing → normalizing → validating → awaiting_review` olarak izlenir.
4. Kaynak cell ve normalize edilmiş satır karşılaştırılır.
5. Bulgulu `mep-03-findings.csv` için miktar düzeltme veya gerekçeli istisna seçilir.
6. Onaylı satırlar taslak teklife aktarılır.
7. Teklif yeniden açılır, revision oluşturulur ve PDF üretilir.
8. Tenant B ile aynı document/row/quotation erişiminin reddedildiği görülür.

Bu senaryo gerçek müşteri dosyası veya production S3 kanıtı yerine sentetik acceptance katmanıdır.

## Komutlar

```bash
pnpm smartcheck:fixtures
pnpm smartcheck:http-integration
pnpm lint
pnpm build
```
