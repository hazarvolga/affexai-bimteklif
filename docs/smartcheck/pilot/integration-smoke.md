# SmartCheck entegrasyon smoke koşusu

Bu contract testi, gerçek müşteri verisi veya production credential içermez. CI/local smoke için:

```bash
pnpm smartcheck:integration
```

Gerçek HTTP + PostgreSQL koşusu için izole tenant/veri/ephemeral port harness'ı:

```bash
pnpm smartcheck:http-integration
```

Bu koşu `.env.local` içindeki `DATABASE_URL` üzerinde yalnızca benzersiz test kayıtları oluşturur ve `finally` cleanup ile siler. Uygulama `createApiApp()` üzerinden gerçek Express route'larıyla ephemeral portta açılır; Graphile job kuyruğuna kayıt atılır, processing worker fonksiyonu test içinde deterministik olarak çalıştırılır.

Kapsanan sözleşmeler:

- upload sonrası normalize edilmiş satır yalnız kendi şirket dokümanında görünür;
- `pending_review` ve `rejected` satır aktarılmaz;
- `approved` ve gerekçeli `accepted_exception` satır aktarılabilir;
- sahte tenant satır ID'si document/company seçimine sızamaz;
- aynı checksum + mapping aynı processing idempotency anahtarını üretir;
- mapping değişirse yeni processing run anahtarı oluşur.

Gerçek PostgreSQL uçtan uca koşu için migration `0025`–`0028`, `SMARTCHECK_IMPORT_ENABLED=true`, pilot allowlist ve local storage ayarlanmalı; production S3 smoke ise ayrıca gerçek bucket kanıtı gerektirir.
