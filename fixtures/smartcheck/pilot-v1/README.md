# SmartCheck Pilot Fixture Pack v1

Bu paket sentetiktir; müşteri verisi içermez. Gerçek pilot kanıtı değildir.

## Dosyalar

- `mep-01-clean.csv`: temiz mekanik metraj.
- `mep-02-electrical.csv`: elektrik kalemleri ve farklı birim eşlemeleri.
- `mep-03-findings.csv`: bilinmeyen birim, sıfır miktar, eksik fiyat ve yüksek zayiat bulguları.
- `mep-04-duplicate.csv`: aynı poz kodu duplicate kontrolü.
- `mep-05-formula-safe.csv`: CSV formula injection nötralizasyonu.
- `negative-corrupt.xlsx`: XLSX uzantılı fakat geçersiz dosya.
- `price-snapshots.json`: fiyat snapshot sözleşmesi.
- `regulation-diff.json`: mevzuat değişikliği simülasyonu; canonical hukuk kuralı değildir.
- `manifest.json`: beklenen senaryolar ve kabul ölçütleri.

Çalıştırma:

```bash
pnpm smartcheck:fixtures
```
