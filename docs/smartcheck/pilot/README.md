# SmartCheck gerçek pilot kabul paketi

Bu klasör gerçek pilot kapısının kanıt sözleşmesidir. Örnek manifest doldurulmuş kanıt değildir.

## Kabul sırası

1. `pilot-admission.example.json` kopyalanır; gerçek pilot kimliğiyle repo dışındaki güvenli operasyon alanında doldurulur.
2. Her dosya için yazılı müşteri izni, kullanım amacı, saklama süresi ve SHA-256 kaydedilir.
3. En az bir teknik reviewer için kimlik, MEP yetkinlik kanıtı, scope ve atama tarihi kaydedilir.
4. Production S3 bucket/prefix için encryption, least privilege, retention/lifecycle ve gerçek object smoke kanıtı kaydedilir.
5. `pnpm smartcheck:pilot-check -- /guvenli/yol/pilot-admission.json` çalıştırılır.

Güncel F10 runbook: `phase10-admission.md`. Tekrarlanabilir ve CI/operasyon kaydı için `--json --as-of=YYYY-MM-DD` seçenekleri kullanılabilir. Validator; beş dosya, approved reviewer kararı, tarih tutarlılığı ve güvenli S3 tenant prefix’i yoksa fail-closed davranır.

Manifest secret içermez. Access key, secret key, token, müşteri dosyası veya izin belgesi repoya commit edilmez.

## Beş dosya için minimum sonuç kaydı

- Toplam veri satırı
- Manuel yeniden giriş olmadan parse edilen satır
- Parse oranı
- Düzeltilen satır
- Kabul edilen istisna
- Bulgu türleri ve adetleri
- Teklife aktarılan satır
- Kaynak izi eksik satır
- Önce/sonra hazırlama süresi
- Reviewer adı, karar zamanı ve karar

Gerçek pilot geçişi için beş benzersiz dosyanın tamamı, reviewer ve storage kapıları birlikte geçmelidir.
