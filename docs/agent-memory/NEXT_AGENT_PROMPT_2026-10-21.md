# Sonraki Ajan Başlangıç Görev Metni (2026-10-21 Ara Sonrası)

Aşağıdaki metni yeni oturumda ilk mesaj olarak yapıştırabilirsiniz:

---

```text
Önce AGENTS.md kurallarına göre şu dosyaları sırasıyla oku:
1. docs/agent-memory/README.md
2. docs/agent-memory/WORKING_STATE.md
3. docs/agent-memory/HANDOFF_2026-10-21_ARA.md
4. docs/audits/GENEL_DURUM_GAP_BUG_SEO_GEO_RAKIP_RAPORU_2026-10-21.md

Paylaşımlı yerel PostgreSQL veritabanlarına dokunma.
21 Ekim 2026 tarihli denetim raporundaki Aşama 1 (Rev. 40) maddelerini sırasıyla uygula:
1. BUG-01 & BUG-03 (src/ifc/structural-material.ts): "Gazbeton" / "Gaz beton" alt-dizgi çakışmasını düzelt; dayanım sınıfı belirtilmemiş betonlarda, "C 25/30" boşluklu yazımlarda ve "Grobeton" ifadelerinde sessizce C30/37 atamasını engelle / uyarı üret.
2. BUG-02 & GAP-02 (src/ifc/calm-icmal.ts & src/smartcheck/sample-projects.ts): st-statik-tablo-9-2 örnek projesindeki perde duvar ve koruma betonu satırlarını düzelt; tohum katalogda mevcut olan C25/30 (15.150.1005) pozuna dinamik yönlendirme ekle.
3. SEO-01 & SEO-02 (index.html): Statik JSON-LD içindeki CDE durum geçişi ve 18.848 satır katalog ifadelerini src/capabilities/registry.ts ile birebir hizala.
4. AGENTS.md zorunlu kuralı gereği /admin/roadmap (roadmap-content.ts) ve /admin/roadmap/calculations (calculation-review.ts) sayfalarını Rev. 40 olarak kronolojik sırayla güncelle, tüm birim testleri çalıştır ve doğrula.
```
