# SmartCheck Faz 6.5 — Provenance Bridge

**Durum:** Local pilot akışı tamamlandı; gerçek müşteri dosyası ve production storage admission kapıları açık.

## Karar

SmartCheck’te insan tarafından `approved` veya gerekçeli `accepted_exception` yapılan satırlar, piyasa hafızasına ikinci kez elle yazılmadan aktarılabilir. Aktarım yalnız aynı tenant ve submission’a bağlı kaynak dokümandan yapılır.

```text
document
  → processingRun
  → normalizedQuantityRow (approved / accepted_exception)
  → supplierQuoteEntry (pending reviewer)
  → priceSnapshot (only after reviewer approval)
```

## API

`POST /api/market-intelligence/supplier-quotes/:id/import-smartcheck-rows`

- `rowIds` verilirse yalnız belirtilen satırlar aktarılır;
- boş `rowIds` gövdesi kaynak dokümandaki tüm onaylı/istisna satırlarını seçer;
- `pending_review` veya `rejected` satır varsa işlem `409 SMARTCHECK_ROWS_NOT_APPROVED` ile durur;
- satır başka şirketin veya başka dokümanın kimliğiyse `404` döner;
- aynı satır aynı submission’a tekrar gönderildiğinde `sourceRowKey=smartcheck:<rowId>` ile idempotent kalır.

Her entry `sourceProcessingRunId`, `sourceQuantityRowId` ve `sourceCellRange` taşır. Bu alanlar foreign key ile aynı şirketin SmartCheck kaynağına bağlanır. Fiyat hafızasına promotion hâlâ reviewer kararından sonra gerçekleşir; aktarım tek başına fiyatı approved yapmaz.

## Kullanıcı akışı

1. Tedarikçi XLSX/CSV’sini yükler ve kaynak hash’i oluşur.
2. SmartCheck sheet/kolon eşlemesi ve normalizasyonu tamamlanır.
3. Kullanıcı bulguları çözer; yalnız onaylı satırlar aktarılabilir.
4. Piyasa Verisi ekranı satırları cell/run provenance ile reviewer kuyruğuna getirir.
5. Reviewer outlier/koşul değerlendirmesi yapar.
6. Açık onay sonrası immutable fiyat snapshot’ı oluşur.

Manuel satır girişi yalnız parser sonucu olmayan kontrollü beta fallback’i olarak bırakılmıştır. Bu bridge canlı crawler, AI fiyat üretimi veya geçmiş teklif mutasyonu değildir.

## Kabul kanıtı

`src/server/routes/market-intelligence.integration.test.ts`:

- pending SmartCheck satırının aktarımını engeller;
- approved satırı source run, source row ve cell range ile taşır;
- aynı satırın tekrar aktarımını idempotent tutar;
- farklı tenant’ın submission/row erişimini reddeder.
