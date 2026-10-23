# Faz 7 / T40 yerel runtime credential topolojisi kanıtı

**Tarih:** 24 Ekim 2026
**Kod baseline:** `b8733c0d204bec9e978ab1a98e16df328dbb9d8c`
**Roadmap:** Rev. 51
**Hesaplama kaydı:** `BIM-CALC-2026-10-24.45`
**Sonuç:** **PARTIAL — yerel cutover hazırlığı ve rollback kanıtlı; production cutover/deploy yapılmadı**

## Kapsam

Bu dilim Rev. 47 ile kurulan canonical PostgreSQL owner/migrator/app/worker/backup rol sözleşmesini yerel çalışma topolojisine bağlar. Hesap yöntemlerini, IFC miktarlarını, teklif formüllerini veya mevzuat kararlarını değiştirmez.

| Hizmet | Login rolü | Bağlantı sınırı |
|---|---|---|
| `app` | `bimmetraj_app` | App DML ve doğrulanmış SmartCheck wrapper'ları |
| `worker`, `ifc-worker` | `bimmetraj_worker` | Public iş verisi ve Graphile queue işlemleri |
| `migrate` | `bimmetraj_migrator` | DDL yalnız transaction-local `bimmetraj_owner` rolüyle |
| `backup` | `bimmetraj_backup` | Salt okunur dump bağlantısı |
| `postgres` | bootstrap `bimmetraj` | Yalnız cluster ilk kurulumu |

Compose eksik veya boş credentialı render aşamasında reddeder. Hizmetlerin ihtiyaç duymadığı ham DB parola değişkenleri ortamda boş değerle gölgelenir. Secret değerleri Git'e veya image build argümanına konmaz; provisioner parolayı SQL statement metnine eklemez. Production platform log redaksiyonu cutover kapısında ayrıca doğrulanacaktır.

## Migration güvenlik sırası

Release runner production bağlantısında şu sırayı zorunlu tutar:

1. `BEGIN`
2. `SET LOCAL ROLE bimmetraj_owner`
3. `session_user=bimmetraj_migrator` ve `current_user=bimmetraj_owner` doğrulaması
4. Exact hedef veritabanı/cluster/marker doğrulaması
5. Transaction timeout, güvenli `search_path` ve advisory lock
6. Worker-drain onayı, sıfır running SmartCheck run ve sıfır locked Graphile job
7. Migration ve postcondition
8. `COMMIT`; herhangi bir hatada `ROLLBACK`

App, worker ve backup rolleri owner rolüne geçemez. Transaction bittiğinde migrator oturumu owner yetkisini taşımaz.

## Credential rollback kanıtı

Test paylaşılan veya production veritabanını kabul etmeyen, parola doğrulaması açık ve marker'lı disposable PostgreSQL 16 cluster üzerinde çalıştırıldı:

1. A credential setiyle canonical roller provision edildi.
2. B credential setine rotation uygulandı.
3. Dört A login credentialının da authentication aşamasında reddedildiği doğrulandı.
4. Dört B credentialının exact beklenen session/current role ile bağlandığı doğrulandı.
5. B→A rollback uygulandı.
6. Dört B credentialı reddedildi; A credentialları yeniden doğrulandı.

Bu kanıt credential rotation mekanizmasının yerel geri dönüşünü kapsar. Production secret manager/Coolify geçişi, çalışan servis bağlantılarının yeniden kurulması ve production geri dönüş süresi bu testin kapsamı dışındadır.

## Doğrulama özeti

| Kapı | Sonuç |
|---|---:|
| Focused TypeScript sözleşme ve release testleri | 21/21 PASS |
| Python backup testleri | 6/6 PASS |
| Parola doğrulamalı PostgreSQL 16 rol/provision/rollback testi | 1/1 PASS |
| TypeScript compile (`tsc --noEmit`) | PASS |

## Açık production kapıları

T40 kapanmış sayılmaz. Aşağıdaki kanıtlar henüz yoktur:

- Coolify/secret manager içinde production credential oluşturma ve servis bazlı cutover.
- Pre-cutover production fingerprint, güncel backup ve restore/parity tatbikatı.
- App health/login, SmartCheck enqueue/consume/remove ve backup canary smoke.
- Production forward recovery ve rollback; stale credential kontrollü iptali.
- Deploy SHA, çalışan image/source, dış HTTP ve browser kanıtı.

Bu nedenle Rev. 51 **T40 PARTIAL** durumunu korur ve production dağıtım onayı değildir.
