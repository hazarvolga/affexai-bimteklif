# Faz 7 / T41 — Worker entitlement sınırı hazırlık kanıtı

**Tarih:** 24 Ekim 2026  
**Durum:** LOCAL CODE PARTIAL / production NO-GO
**Kapsam:** Worker'ın plan ve abonelik bilgisini geniş tablo yetkisi olmadan okuyabilmesi

## Mevcut kod bulgusu

Worker runtime `DATABASE_URL` ile `bimmetraj_worker` olarak çalışır. Kod tabanında aşağıdaki worker yolları doğrudan authority tablolarına erişiyor:

- `src/smartcheck/import/config.ts`: `subscriptions` ve `plans` üzerinden IFC limitleri.
- `src/services/billing/quota.ts`: `companies`, `subscriptions`, `plans` ve `usage_records` üzerinden IFC kota tüketimi.
- `src/smartcheck/import/processor.ts`: başarılı IFC işlemi sonunda worker transactionı içinde kota tüketimi.

Bu nedenle `companies`, `subscriptions` ve `plans` için worker ACL'sini hemen kaldırmak eski worker konteynerlerini kırar. Bu revizyon ACL revoke veya production cutover yapmaz.

Rev. 60 ile `0020_worker_entitlement_capability` release migrationı, role contract ve production IFC quota adapter'ı eklendi. Capability function yalnız `bimmetraj_worker` için `EXECUTE` verir; release artifact ve negatif role testleri geçti. Direct table grant revoke için canary/drain kanıtı henüz yoktur.

## Hedef capability sözleşmesi

Expand aşamasında owner/migrator tarafından şu dar, `SECURITY DEFINER`, `STABLE` olmayan ve `VOLATILE` varsayılanlı function oluşturulmalıdır:

`public.bimmetraj_worker_get_entitlement(uuid)`

Function yalnızca şu alanları döndürmelidir:

- `company_exists`
- `subscription_status`
- `current_period_end`
- `plan_id`
- `plan_is_active`
- `monthly_ifc_limit`
- `ifc_max_file_mb`
- `ifc_max_concurrent`

Function gövdesi `current_user = 'bimmetraj_worker'` kontrolünü fail-closed yapmalı, `search_path` değerini `pg_catalog,public` olarak sabitlemeli, sahibi `bimmetraj_owner` olmalı ve yalnız `bimmetraj_worker` için `EXECUTE` vermelidir. `PUBLIC` ve diğer runtime rollerinde `EXECUTE` bulunmamalıdır. Function plan/abonelik tablosuna doğrudan tablo yetkisi vermemelidir.

## Uygulama sırası

1. **Expand:** Function ve provenance hash'i release migration ile ekle; role inspector ve PG16 negatif testine ekle.
2. **Code deploy:** Worker entitlement ve IFC kota yollarını function sonucunu kullanan adapter'a taşı; function sonucu yoksa veya alanlar geçersizse fail-closed `IFC_LIMITS_UNAVAILABLE` üret.
3. **Canary:** Eski ve yeni worker sürümünü aynı tenant fixture'ında çalıştır; aktif/pasif/sona ermiş/planı olmayan ve limit taşması senaryolarını doğrula.
4. **Contract:** Eski worker'ın artık doğrudan ihtiyaç duymadığı `companies`, `subscriptions`, `plans` table grant'lerini revoke et; `usage_records`, işlem lease tabloları ve queue ACL'leri ayrı tutulur.
5. **Rollback:** Function migration geri alınmaz; kod rollback'i capability function ile uyumlu kalır. ACL revoke yalnız canary ve eski image drain kanıtından sonra yapılabilir.

## Kabul kanıtı

- Worker role doğrudan `SELECT` ile `companies`, `subscriptions`, `plans` tablolarında reddedilir.
- Worker role capability function ile yalnız izin verilen entitlement alanlarını okuyabilir.
- App/control role function execute edemez; kendi tenant/control yolları bozulmaz.
- Function `company_id` olmayan, geçersiz veya birden çok abonelikli durumda fail-closed davranır.
- Kota tüketimi aynı transaction ve lease fencing ile devam eder; başka tenant verisi görünmez.
- Eski worker image drain edilmeden ACL revoke edilmez.

Bu belge 8B'nin hazırlık kapısıdır; capability function, migration, canary ve ACL revoke tamamlanmadan T41 veya Faz 7 kapanmış sayılmaz.

## 8C — Worker company context capability (yerel kod kapanışı, production gate açık)

`0021_worker_company_context_capability` migrationı ile IFC worker'ın `companies.active_standard` ve normalize edilmiş SmartCheck worker'ın `companies.smartcheck_max_waste_percent` okumaları dar bir `SECURITY DEFINER` capability function'a taşındı. Function yalnız `bimmetraj_worker` için `EXECUTE` verir; `search_path`, `session_user`, owner ve revoke/grant sınırları 8B ile aynı sözleşme modelini izler.

`src/smartcheck/import/worker-company-context.ts` production branch'i function'ı kullanır. Local/test fixture branch'i mevcut doğrudan Drizzle yolunu korur; bu, canary öncesi geriye dönük test uyumluluğudur ve production ACL kanıtı değildir. IFC rule evaluation ve normalize edilmiş satır doğrulamasının formülleri/sonuçları değişmemiştir.

Yerel kanıt: release artifact zinciri `22/22`, worker capability negatif testleri `2/2`, targeted roadmap/auth/tenant testleri toplam `32/32`, `tsc --noEmit` ve `git diff --check` geçti. Canary, worker drain, production image doğrulaması ve doğrudan `companies` ACL revoke henüz yapılmadı; bu nedenle T41/Faz 7 ve production hâlâ PARTIAL/NO-GO'dur.
