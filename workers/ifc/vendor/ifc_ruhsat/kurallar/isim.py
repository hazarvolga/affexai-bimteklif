"""İsimlendirme: varlık adı ``Disiplin-KategoriKodu-Açıklama`` (m.11, EK-5 5.5, EK-9 m.5);
dosya adı EK-2 Tablo 2.1'in dokuz alanı (m.6, EK-9 m.3); proje adı boş değil (EK-1)."""

from __future__ import annotations

import re
from pathlib import Path

from ifc_ruhsat import veri
from ifc_ruhsat.bulgu import Bulgu, varlik_listesi
from ifc_ruhsat.kurallar.ortak import Baglam, oznitelik

# Disiplin (2 harf) - Kategori (3 harf) - Açıklama (alt tire ile ayrılmış, orta tire yok)
VARLIK_ADI = re.compile(r"^([A-Z]{2})-([A-Z]{3})(?:-([^\s-]+))?$")

# EK-2 Tablo 2.1: ProjeKodu(6) BinaKodu(2) Disiplin(2) AltDisiplin(4; Tablo 2.11 üç karakter verir) DosyaTürü(2)
# DosyaTipi(3) Kat/Konum(3) SıraNo(2) RevizyonNo(3), alt tire ile.
DOSYA_ADI = re.compile(
    r"^([A-Za-z0-9]{6})_([A-Za-z0-9]{2})_([A-Z]{2})_([A-Z0-9]{3,4})_([A-Z0-9]{2})_"
    r"([A-Z0-9]{3})_([A-Za-z0-9]{3})_(\d{2})_(\d{3})$"
)

# IfcSpace adı mahal.py'de denetlenir; IfcProject adı proje kodudur (Tablo 5.1 satır 69), aks için AxisTag kullanılır.
SABLON_DISI = ("IfcProject", "IfcSpace", "IfcGridAxis")
# Tablo 6.7, 6.8 ve 6.55 adı EK-5'e bağlar; uygulamadaki örnek model buna uymadığı için netleşene kadar uyarıdır.
MEKANSAL_SINIFLAR = ("IfcSite", "IfcBuilding", "IfcBuildingStorey")
# EK-2 m.2.9.3: 2B kesit ve görünüşte konum kodunu müellif belirler.
KONUM_SERBEST_TURLER = ("KS", "GR")
KAT_KODU = re.compile(r"^(B\d{2}|K[A-Z0-9]{2}|NNN)$")


def kontrol(b: Baglam) -> list[Bulgu]:
    out: list[Bulgu] = []
    out += _varlik_adlari(b)
    out += _dosya_adi(b)
    out += _proje_adi(b)
    return out


def _varlik_adlari(b: Baglam) -> list[Bulgu]:
    out = []
    disiplinler = veri.ek2_disiplinler()
    kodlar = veri.kategori_kodlari()
    bos, bicim, mekansal_bicim, disiplin_yanlis, kod_yanlis, kod_sinif = [], [], [], [], [], []
    for e in b.varliklar:
        if e.is_a() in SABLON_DISI:
            continue
        ad = oznitelik(e, "Name")
        if ad is None:
            bos.append(e)
            continue
        m = VARLIK_ADI.match(ad.strip())
        if not m:
            (mekansal_bicim if e.is_a() in MEKANSAL_SINIFLAR else bicim).append(e)
            continue
        disiplin, kod = m.group(1), m.group(2)
        if disiplin not in disiplinler:
            disiplin_yanlis.append(e)
        if kod not in kodlar:
            kod_yanlis.append(e)
        elif kodlar[kod] != e.is_a():
            kod_sinif.append(e)
    if bos:
        out.append(
            Bulgu(
                "isim-bos",
                "hata",
                f"{len(bos)} varlığın adı (Name) boş; her varlık Disiplin-Kategori-Açıklama ile adlandırılır.",
                "m.11, EK-5 5.5",
                5,
                varlik_listesi(bos),
                len(bos),
            )
        )
    if bicim:
        out.append(
            Bulgu(
                "isim-bicim",
                "hata",
                f"{len(bicim)} varlığın adı şablona uymuyor. Beklenen: iki harf disiplin, üç harf "
                "kategori kodu ve açıklama, orta tire ile (örn. MM-DVR-dis_20cm); açıklama içinde "
                "alt tire kullanılır, orta tire ve boşluk kullanılmaz.",
                "m.11, EK-5 5.5 ve Tablo 5.3",
                5,
                varlik_listesi(bicim),
                len(bicim),
            )
        )
    if mekansal_bicim:
        out.append(
            Bulgu(
                "isim-mekansal-sablon",
                "uyari",
                f"{len(mekansal_bicim)} saha, bina veya kat adı EK-5 şablonunda değil (örn. MM-BNK-zemin). "
                "EK-6 bu sınıflar için EK-5'e göre isimlendirme ister.",
                "EK-6 Tablo 6.7, 6.8, 6.55; EK-5 5.5",
                5,
                varlik_listesi(mekansal_bicim),
                len(mekansal_bicim),
            )
        )
    if disiplin_yanlis:
        out.append(
            Bulgu(
                "isim-disiplin",
                "hata",
                f"{len(disiplin_yanlis)} varlıkta disiplin kodu EK-2 Tablo 2.2'de yok "
                f"(geçerli: {', '.join(disiplinler)}).",
                "EK-2 Tablo 2.2",
                5,
                varlik_listesi(disiplin_yanlis),
                len(disiplin_yanlis),
            )
        )
    if kod_yanlis:
        out.append(
            Bulgu(
                "isim-kategori",
                "hata",
                f"{len(kod_yanlis)} varlıkta kategori kodu EK-5 Tablo 5.1/5.2'de yok.",
                "EK-5 Tablo 5.1–5.2",
                5,
                varlik_listesi(kod_yanlis),
                len(kod_yanlis),
            )
        )
    if kod_sinif:
        ornek = kod_sinif[0]
        out.append(
            Bulgu(
                "isim-kategori-sinif",
                "hata",
                f"{len(kod_sinif)} varlıkta kategori kodu varlığın IFC sınıfına ait değil "
                f"(örn. {ornek.Name} adlı varlık {ornek.is_a()}; bu sınıfın kodu "
                f"{veri.zorunlu_siniflar().get(ornek.is_a(), veri.istege_bagli_siniflar().get(ornek.is_a(), {})).get('kod', '?')}).",
                "EK-5 5.5.2",
                5,
                varlik_listesi(kod_sinif),
                len(kod_sinif),
            )
        )
    if not out:
        out.append(
            Bulgu("isim", "bilgi", "Varlık adları EK-5 şablonuna uygun.", "m.11, EK-5 5.5", 5)
        )
    return out


def _dosya_adi(b: Baglam) -> list[Bulgu]:
    govde = Path(b.dosya_adi).stem
    m = DOSYA_ADI.match(govde)
    if not m:
        return [
            Bulgu(
                "dosya-adi",
                "uyari",
                f"Dosya adı '{govde}' EK-2 Tablo 2.1 şablonuna uymuyor: "
                "ProjeKodu(6)_BinaKodu(2)_Disiplin(2)_AltDisiplin(4)_DosyaTürü(2)_DosyaTipi(3)_"
                "KatKonum(3)_SıraNo(2)_RevizyonNo(3), örn. 123456_00_MM_XXXX_MD_MMC_NNN_01_000.",
                "m.6, EK-2 Tablo 2.1",
                3,
            )
        ]
    disiplin, alt_disiplin, dosya_turu, dosya_tipi, kat_konum = (
        m.group(3),
        m.group(4),
        m.group(5),
        m.group(6),
        m.group(7),
    )
    if disiplin not in veri.ek2_disiplinler():
        return [
            Bulgu(
                "dosya-adi-disiplin",
                "uyari",
                f"Dosya adındaki disiplin kodu '{disiplin}' EK-2 Tablo 2.2'de yok.",
                "EK-2 Tablo 2.2",
                3,
            )
        ]
    alt_tablo = veri.ek2_alt_disiplin_tablolari().get(disiplin)
    if alt_tablo is not None and alt_disiplin not in alt_tablo:
        return [
            Bulgu(
                "dosya-adi-alt-disiplin",
                "uyari",
                f"Dosya adındaki alt disiplin/öge kodu '{alt_disiplin}' {disiplin} disiplininin EK-2 tablosunda yok. "
                "Projeye özel tanım yapıldıysa müellif doğrulamalıdır (EK-2 m.2.6).",
                "EK-2 Tablo 2.3–2.11, m.2.6",
                3,
            )
        ]
    dosya_turleri = veri.ek2_dosya_turleri()
    if dosya_turleri and dosya_turu not in dosya_turleri:
        return [
            Bulgu(
                "dosya-adi-tur",
                "uyari",
                f"Dosya adındaki dosya türü kodu '{dosya_turu}' EK-2 Tablo 2.12 listesinde yok.",
                "EK-2 Tablo 2.12",
                3,
            )
        ]
    dosya_tipleri = veri.ek2_dosya_tipleri()
    if dosya_tipleri and dosya_tipi not in dosya_tipleri:
        return [
            Bulgu(
                "dosya-adi-tip",
                "uyari",
                f"Dosya adındaki dosya tipi kodu '{dosya_tipi}' EK-2 Tablo 2.13 listesinde yok.",
                "EK-2 Tablo 2.13",
                3,
            )
        ]
    konum_gecerli = dosya_turu in KONUM_SERBEST_TURLER and re.match(r"^[A-Z0-9]{3}$", kat_konum)
    if not KAT_KODU.match(kat_konum) and not konum_gecerli:
        return [
            Bulgu(
                "dosya-adi-kat",
                "uyari",
                f"Dosya adındaki kat/konum kodu '{kat_konum}' EK-2 Tablo 2.14 şablonuna (B01.., K00.., KXX, NNN) uymuyor.",
                "EK-2 Tablo 2.14, m.2.9",
                3,
            )
        ]
    return [
        Bulgu(
            "dosya-adi",
            "bilgi",
            "Dosya adı EK-2 şablonunun dokuz alanına ve alt disiplin/tür/tip/kat sözlüklerine uyuyor.",
            "m.6, EK-2 Tablo 2.1–2.14",
            3,
        )
    ]


def _proje_adi(b: Baglam) -> list[Bulgu]:
    out: list[Bulgu] = []
    govde = Path(b.dosya_adi).stem
    dosya_eslesme = DOSYA_ADI.match(govde)
    for p in b.sinif("IfcProject"):
        ad = oznitelik(p, "Name")
        if ad is None:
            return [
                Bulgu(
                    "proje-adi",
                    "hata",
                    "IfcProject.Name boş; EK-1'e göre proje kodu yazılmalı.",
                    "m.6, EK-1, EK-7 Tablo 7.1",
                    3,
                )
            ]
        temiz = str(ad).strip()
        if not re.match(r"^[A-Za-z0-9]{6}$", temiz):
            out.append(
                Bulgu(
                    "proje-adi-bicim",
                    "uyari",
                    f"IfcProject.Name '{temiz}' EK-1 6 haneli alfasayısal proje kodu şablonuna uymuyor.",
                    "m.6, EK-1, EK-7 Tablo 7.1",
                    3,
                )
            )
        elif dosya_eslesme and temiz.upper() != dosya_eslesme.group(1).upper():
            out.append(
                Bulgu(
                    "proje-adi-dosya-uyum",
                    "uyari",
                    f"IfcProject.Name ('{temiz}') dosya adındaki ProjeKodu ('{dosya_eslesme.group(1)}') ile eşleşmiyor.",
                    "m.6, EK-1, EK-2 Tablo 2.1",
                    3,
                )
            )
    return out
