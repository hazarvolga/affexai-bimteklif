# Prisma shadow parity harness — F15

Bu harness, mevcut çalışan `teklifpro_local` veritabanını değiştirmeden
şemasını veri taşımadan `teklifpro_next_local` isimli izole PostgreSQL hedefine
aktarır ve seçili Prisma shadow modellerini gerçek PostgreSQL kataloguyla
karşılaştırır.

## Güvenlik sınırları

- Kaynak varsayılan olarak `.env.local` içindeki `DATABASE_URL`'dir.
- Hedef varsayılan olarak `SHADOW_DATABASE_URL` veya
  `postgresql://hazarekiz@localhost:5432/teklifpro_next_local`'dır.
- Hedef veritabanı adı tam olarak `teklifpro_next_local` değilse işlem durur.
- Dolu hedef yeniden yazılmaz; `--prepare` yalnız yeni veya boş hedefte çalışır.
- `pg_dump --schema-only` kullanılır; kaynak verisi, credential veya uygulama
  trafiği hedefe taşınmaz.
- PostgreSQL server major sürümü otomatik okunur ve eşleşen `pg_dump` aranır.
  Gerekirse `PG_DUMP` ile açık binary yolu verilebilir.
- Express + Drizzle tek write owner olarak kalır; Prisma client veya migration
  çalıştırılmaz.

## Komutlar

```bash
pnpm prisma:shadow-db:plan
pnpm prisma:shadow-db:prepare
pnpm prisma:shadow-parity
```

`prepare` sonrası parity raporu
`docs/architecture/generated/prisma-shadow-parity.json` konumuna yazılır.
Rapor; 13 modelin kolon/type parity durumunu, kaynak/ hedef schema dump
SHA-256 değerlerini ve dump eşleşmesini içerir.

## Bu koşudaki kanıt

- Kaynak: `teklifpro_local`
- Hedef: `teklifpro_next_local`
- Kaynak ve hedef schema dump SHA-256:
  `41920c99c31a297ce0d01f420d48b840084ac7449e2609face9e7c41bf27e93a`
- `schemaDumpParity`: `true`
- 13/13 Prisma shadow model: `pass`
- Hedefte veri taşınmadı; schema-only restore sonrası tablo satırları `0`.

Bu rapor tam Prisma cutover kanıtı değildir. Production migration için ayrıca
additive SQL review, migration journal parity, backup/restore tatbikatı,
Express–NestJS HTTP parity ve gerçek pilot KPI kapısı gerekir.
