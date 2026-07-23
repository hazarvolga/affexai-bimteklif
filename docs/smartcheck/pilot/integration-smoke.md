# SmartCheck entegrasyon smoke koşusu

Bu contract testi, gerçek müşteri verisi veya production credential içermez. CI/local smoke için:

```bash
pnpm smartcheck:integration
```

Kapsanan sözleşmeler:

- upload sonrası normalize edilmiş satır yalnız kendi şirket dokümanında görünür;
- `pending_review` ve `rejected` satır aktarılmaz;
- `approved` ve gerekçeli `accepted_exception` satır aktarılabilir;
- sahte tenant satır ID'si document/company seçimine sızamaz;
- aynı checksum + mapping aynı processing idempotency anahtarını üretir;
- mapping değişirse yeni processing run anahtarı oluşur.

Gerçek PostgreSQL uçtan uca koşu için migration `0025`–`0028`, `SMARTCHECK_IMPORT_ENABLED=true`, pilot allowlist ve local storage ayarlanmalı; production S3 smoke ise ayrıca gerçek bucket kanıtı gerektirir.
