# Sonraki Ajan İçin Hazır Prompt (17 Ekim 2026)

Aşağıdaki bloğu olduğu gibi yeni ajana yapıştırın.

```text
Sen BIMMetraj (kök dizin: TeklifPro-repo) projesinde çalışan bir mühendissin. Önceki oturumlar bir bağımsız denetim raporundaki
bulguların kodla kapatılabilen kısmını bitirdi. Senin görevin, kalan ve kodla yapılabilen işleri güvenle sürdürmek.

ÖNCE OKU (sırayla):
1. AGENTS.md ve CLAUDE.md
2. docs/agent-memory/HANDOFF_2026-10-17.md  → özellikle "4. Oturum Devri" bölümü
3. docs/agent-memory/WORKING_STATE.md  → Rev. 27, 28, 29
4. DENETIM_RAPORU_2026-10-17.md  → "5. Kapanış durumu" tablosu
5. docs/audits/RESMI_VERI_ARASTIRMASI_2026-10-17.md  → resmî kaynaklar ve güven düzeyleri

DURUM:
- Dal: fix/denetim-p0-2026-10-17 (main'den ayrıldı). Hiçbir şey push veya deploy edilmedi; canlı sürüm a2cb114.
- Yerelde 1.057 test, tsc, build, 3 tarayıcı smoke'u geçti. GitHub "Verify" bu dal için henüz görülmedi.
- Bu dalda ÇALIŞ; main'e dokunma. Push, deploy ve birleştirme kararı Hazar'ındır; sormadan yapma.

DEĞİŞMEZ KURALLAR:
- Marka yazımı "BIMMetraj". 
- Gizli varsayılan, kaynaksız sabit veya uydurma girdi YOK. Her hesap sayısı kullanıcı girdisi ya da kaynaklı sabit olmalı.
- Kayıtta (src/capabilities/registry.ts) hiçbir yetenek, adı-soyadı, unvanı, sicil numarası ve tarihi olan GERÇEK bir uzman imzası
  olmadan live/L3 olamaz. Kurgusal kurul veya ajan adı onay sayılmaz. Bunu testler zorlar; aşmaya çalışma.
- Her ürün veya hesap değişikliğinde src/pages/admin/roadmap/roadmap-content.ts ve calculation-review.ts güncellenir (AGENTS.md).
- Oturum jetonu HttpOnly çerezdedir. localStorage'a jeton YAZMA. Değiştiren istekler aynı-origin kanıtı ister.
- Müşteri dosyalarını ve kök dizindeki kaynak PDF/DOCX/XLSX'leri commit etme (gib-detay-1.pdf, teklif-excel-ornekleri/ vb.).
- Kat Karşılığı ve YAMBİS hesaplayıcıları yayında DEĞİL; uzman onayı olmadan rota, sitemap veya llms.txt'e ekleme.
- Resmî metin araçla okunamıyorsa dosyayı diske kaydet ve workers/ifc/.venv/bin/python -I + pypdf ile yerelde oku.
  Sertifikası doğrulanamayan sitelerde doğrulamayı kapatma; mevzuat.gov.tr ve Resmî Gazete'yi kullan.
- Node/pnpm PATH: export PATH="/Users/hazarvolgaekiz/.unsloth/node/bin:/Users/hazarvolgaekiz/Library/pnpm:$PATH"
- DB'li testler izole PostgreSQL ister; HANDOFF'taki docker komutunu kullan, bitince konteyneri sil. Paylaşılan veritabanlarına dokunma.

YAPILACAKLAR (öncelik sırasıyla, her biri ayrı commit):
1. Dalı doğrula: tsc, tam test, vite build. Sonra Hazar push edince "gh run list --workflow Verify" ile yeşili teyit et; kırmızıysa nedenini düzelt.
2. UI: kalan ~417 sabit renk sınıfı ve text-[7px..9px] yazıları (scripts/migrate-design-tokens.mjs'i genişlet; önce/sonra ekran
   görüntüsü farkını SMOKE_SHOTS ile ölç, açık modda fark 0 olmalı).
3. Erişilebilirlik: axe ile form etiketi ve odak halkası taraması; bulguları düzelt.
4. Kod kalitesi: tsconfig "strict"e kademeli geçiş; test dışı kodda 135 `any` ve 15 console.log'u azalt.
5. ÇŞB 2026 kitaplarını (18.848 satır, src/server/crawler/data/*.json) veritabanında sürümlü "Fiyat Kitabı" tablolarına taşı
   (tasarım: YOL_HARITASI_2026-10-17.md §4). Önce şema ve okuma tarafı; eski tablolar bir sürüm salt-okunur kalsın.
6. (İsteğe bağlı) Sayfa gövdesinin gerçek ön-render'ı: Chromium yalnız çalışma imajında olduğundan ayrı bir Docker aşaması gerekir;
   önce tasarımı yaz, Hazar'a sun.

YAPMA / BEKLE (Hazar veya dış taraf): gerçek uzman imzaları, GİB'in güncel konsolide KDV tebliği (tam kdv_genteb.pdf),
4735 için resmî sayısal örnek, DKIM, ayrı veritabanı rolü, kesintisiz deploy, kart ödeme sağlayıcısı, Melih Dinekli'nin 17 sorusu.

BİTİRİRKEN: yaptıklarını HANDOFF_2026-10-17.md "Oturum Devri" bölümüne ve WORKING_STATE.md'ye ekle; commit mesajlarında
conventional commits kullan; doğrulayamadığın hiçbir şeyi "tamam" diye raporlama.
```
