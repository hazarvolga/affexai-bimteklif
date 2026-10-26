# PostgreSQL restore drill — F15

Bu drill, production verisini kopyalamadan mevcut PostgreSQL şemasının geri
yüklenebilirliğini kanıtlar. `postgres:restore-drill` kaynak şemayı
`pg_dump --schema-only` ile alır, yalnızca `teklifpro_restore_drill_local`
hedefine restore eder ve kaynak/hedef katalog snapshot’larını karşılaştırır.

## Komutlar

```bash
pnpm postgres:restore-drill:plan
pnpm postgres:restore-drill       # yeni/boş hedefte restore
pnpm postgres:restore-drill:verify # mevcut drill hedefini yeniden doğrula
```

## Fail-closed sınırlar

- Hedef veritabanı adı tam olarak `teklifpro_restore_drill_local` olmalıdır.
- Dolu hedef overwrite edilmez.
- `graphile_worker` şeması bilinçli olarak kapsam dışıdır; worker kendi operasyon
  migration’ını yönetir.
- Bu faz data restore değildir; `mode=schema-only` rapora yazılır. Full data
  restore ancak maskelenmiş fixture veya production SRE onayı ile yapılmalıdır.
- Express + Drizzle write owner olarak kalır; uygulama trafiği drill hedefine
  yönlendirilmez.

## Kanıt

Rapor: `docs/architecture/generated/postgres-restore-drill.json`

- kaynak/hedef schema SHA-256 eşleşiyor;
- 85 non-worker tablo ve 20 public enum eşleşiyor;
- hedef satır sayısı `0`;
- durum `pass`.

Bu sonuç schema backup/restore kanıtıdır; production S3 lifecycle, encrypted
object restore ve full PostgreSQL data backup/restore kapısı hâlâ F10/F12
operasyon kanıtlarına bağlıdır.
