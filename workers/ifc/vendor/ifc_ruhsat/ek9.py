"""EK-9 Model Kalite Kontrol Formu:
- Tablo 9.1 (Mimari disiplin - MM): 21 satır (EKLER.pdf s.238–239)
- Tablo 9.2 (Diğer disiplinler - ST, MK, EE vb.): 16 satır (EKLER.pdf s.240–241)
Her satır için Evet / Hayır / Elle ve dayanak üretilir."""

from __future__ import annotations

from datetime import datetime

from ifc_ruhsat import SURUM, YONETMELIK, veri
from ifc_ruhsat.bulgu import Rapor


def tablo_bilgisi(disiplin: str = "MM") -> dict:
    kod = (disiplin or "MM").strip().upper()
    disiplin_ad = veri.ek2_disiplinler().get(kod, kod)
    if kod == "MM":
        return {
            "tablo": "9.1",
            "baslik": "Tablo 9.1 Model Kalite Kontrol Formu (Mimari disiplin için)",
            "disiplin": kod,
            "disiplinAdi": disiplin_ad,
            "satirSayisi": 21,
        }
    return {
        "tablo": "9.2",
        "baslik": "Tablo 9.2 Model Kalite Kontrol Formu (Diğer disiplinler için)",
        "disiplin": kod,
        "disiplinAdi": disiplin_ad,
        "satirSayisi": 16,
    }


def satirlar(rapor: Rapor, disiplin: str | None = None) -> list[dict]:
    secilen_disiplin = (disiplin or getattr(rapor, "disiplin", "MM") or "MM").strip().upper()
    out = []
    for m in veri.ek9_maddeler(secilen_disiplin):
        kaynak_no = m.get("kaynak_no", m["no"])
        bulgular = rapor.madde_bulgulari(kaynak_no)
        hatalar = [b for b in bulgular if b.seviye == "hata"]
        uyarilar = [b for b in bulgular if b.seviye == "uyari"]
        elle = [b for b in bulgular if b.seviye == "elle"]
        otomatik = [b for b in bulgular if b.seviye != "elle"]
        if hatalar:
            karar = "Hayır"
        elif not otomatik:
            karar = "Elle"
        elif elle:
            # Satırın bir kısmı makinece doğrulandı, kalanı kişiye düşüyor; "Evet" demek yanıltır.
            karar = "Kısmen (elle tamamlanacak)"
        elif uyarilar:
            karar = "Evet (uyarıyla)"
        else:
            karar = "Evet"
        out.append(
            {
                "no": m["no"],
                "kaynakNo": kaynak_no,
                "bolum": m["bolum"],
                "kategori": m["kategori"],
                "baslik": m["baslik"],
                "soru": m["soru"],
                "karar": karar,
                "elleNotu": "; ".join(b.mesaj for b in elle),
                "bulgular": [b.sozluk() for b in bulgular if b.seviye not in ("bilgi", "elle")],
                "bilgi": [b.mesaj for b in bulgular if b.seviye == "bilgi"],
            }
        )
    return out


def _hucre(metin: str) -> str:
    return metin.replace("|", "\\|").replace("\n", " ")


def markdown(rapor: Rapor) -> str:
    """Form, Markdown tablo olarak — imzalı PDF/A'ya dönüştürmek proje müellifinin işi."""
    zaman = datetime.now().astimezone().strftime("%d.%m.%Y %H:%M")
    ozet = rapor.ozet()
    bilgi = tablo_bilgisi(getattr(rapor, "disiplin", "MM"))
    metin = [
        f"# EK-9 {bilgi['baslik']}",
        "",
        f"**Model:** `{rapor.dosya}` · **Disiplin:** {bilgi['disiplin']} ({bilgi['disiplinAdi']}) · **Şema:** {rapor.schema} · **Tarih:** {zaman}  ",
        f"**Dayanak:** {YONETMELIK['ad']} (RG {YONETMELIK['resmiGazete']})  ",
        f"**Araç:** ifc-ruhsat {SURUM} — otomatik ön kontrol; formun imzalanması ve nihai "
        "değerlendirme proje müellifi ile ilgili idareye aittir.  ",
        f"**Özet:** {ozet['hata']} hata, {ozet['uyari']} uyarı, {ozet['elle']} elle kontrol.",
        "",
        "| No | Kategori | Kontrol Başlığı | Açıklama | Evet / Hayır | Bulgu |",
        "|---|---|---|---|---|---|",
    ]
    bolum = None
    for r in satirlar(rapor):
        if r["bolum"] != bolum:
            bolum = r["bolum"]
            metin.append(f"| | **{bolum}** | | | | |")
        notlar = [f"{b['seviye'].upper()}: {b['mesaj']}" for b in r["bulgular"]]
        if r["karar"] == "Elle":
            notlar = [r["elleNotu"]]
        elif not notlar:
            notlar = r["bilgi"]
        metin.append(
            f"| {r['no']} | {r['kategori']} | {r['baslik']} | {_hucre(r['soru'])} | "
            f"{r['karar']} | {_hucre('<br>'.join(notlar))} |"
        )
    metin += ["", "## Bulgu ayrıntısı", ""]
    for b in rapor.bulgular:
        if b.seviye == "bilgi":
            continue
        ek = f" (EK-9 m.{b.ek9})" if b.ek9 and "EK-9" not in b.madde else ""
        metin.append(f"- **{b.seviye.upper()}** [{b.madde}]{ek}: {b.mesaj}")
        if b.varliklar:
            kalan = f" … toplam {b.sayi}" if b.sayi and b.sayi > len(b.varliklar) else ""
            metin.append(f"  - varlıklar: `{'`, `'.join(b.varliklar)}`{kalan}")
    metin += ["", "## Veri kaynakları", ""]
    for dosya, kaynak in veri.kaynaklar().items():
        metin.append(f"- `{dosya}`: {kaynak}")
    return "\n".join(metin) + "\n"
