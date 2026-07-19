# `kaynaklar/` Kaynak İnceleme Notu

Tarih: 2026-07-19

## Karar

`kaynaklar/` klasörü TeklifPro için güçlü bir alan bilgisi ve eğitim içeriği havuzudur. Ancak dosyalar, sürüm ve otorite metadata'sı olmadan doğrudan hukuki/standart hesap motoruna girdi olarak kullanılamaz.

## Dosya rolleri

| Kaynak | Ürün rolü | Sınır |
| --- | --- | --- |
| `İnşaat Metraj Doğrulama Araştırması.md` | Metraj domain haritası; betonarme hiyerarşisi, donatı, minha, BIM ve SmartCheck adayları | Referans bağlantıları ve standart sürümleri ayrıca doğrulanmadan canonical kural değildir |
| `metraj_do_rulama_platformu.html` | Metraj doğrulama eğitim/ürün prototipi; TS 708 tablosu ve ÇŞB/DIN karşılaştırma fikirleri | İçindeki “uyumlu” ve “yasal” ifadeleri kanıt yerine geçmez; prototip kodu üretim motoruna taşınmaz |
| `bim_master_m_fredat.html` | BIMPlan Academy müfredat ve bilgi yönetişimi çerçevesi | Akademi içeriğidir; TeklifPro fiyat/metraj hesabı değildir |
| `6d_s_rd_r_lebilirlik_analizi_derinle_me.html` | İleri faz 6D/enerji/LCA eğitim içeriği | İlk TeklifPro ticari çekirdeğinin dışında; performans yüzdeleri kaynaklanmadan kullanılmaz |

## Motor için güvenli ayrım

1. **Deterministik çekirdek:** para, iskonto, KDV, toplam, revizyon ve temel veri doğrulama. Harici standarda ihtiyaç duymaz; test edilebilir.
2. **Kaynaklı metraj kuralları:** YFK/poz, TS 708, TS 500, DIN/VOB, RICS/NRM veya şirket politikası; her kuralda yargı alanı, kaynak kimliği, sürüm, geçerlilik tarihi, birim ve uygulanabilirlik bulunmalıdır.
3. **AI önerisi:** varsayım, güven seviyesi ve kaynak durumu ile gösterilir; kullanıcı onayı olmadan authoritative metraj veya standart uyumu iddia etmez.
4. **Akademi:** kaynakları açıklayan ve yöntem öğreten katman; hesap motorunun gizli kural deposu değildir.

## İlk güvenli ürün kapsamı

- Negatif/geçersiz miktar, birim fiyat, iskonto ve KDV değerlerini reddetmek.
- Boş veya birimsiz teklif kalemlerini yayınlanabilir tekliften çıkarmak.
- Backend toplamlarını tek hesaplama kaynağı yapmak.
- AI tarafından üretilen kalemleri “tahmin” olarak işaretlemek.
- Minha, bindirme, paspayı, donatı çapı veya BIM kesişim önceliği gibi kuralları kaynak metadata'sı olmadan otomatik hükme dönüştürmemek.

## İleri faz girdileri

Kaynaklı metraj motoru başlamadan önce her kural için şu kayıt şeması gereklidir: `ruleId`, `jurisdiction`, `authority`, `sourceUrlOrDocumentId`, `standardVersion`, `effectiveFrom`, `effectiveTo`, `unit`, `rounding`, `applicability`, `exclusions`, `reviewer`, `reviewedAt`.
