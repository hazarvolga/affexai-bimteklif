"""Mahaller (IfcSpace): numara şablonu Kat_Bölüm_SıraNo (m.10, EK-3 Tablo 3.1, kat kodları
EK-2 Tablo 2.14 — EK-9 m.4); her mahalin kapalı bir gövdesi olması (m.14) ve aynı kattaki
mahallerin birbirine girmemesi (m.13). Geometri IfcOpenShell ile hesaplanır; hesaplanamazsa
satır "elle" bırakılır, uydurulmaz."""

from __future__ import annotations

import re
from itertools import combinations
from typing import Any

from ifc_ruhsat import veri
from ifc_ruhsat.bulgu import Bulgu, varlik_listesi
from ifc_ruhsat.kurallar.geometri import hacim, kesisim, sinir_kutulari
from ifc_ruhsat.kurallar.ortak import Baglam, kati, oznitelik

# EK-3 Tablo 3.1: Kat(3) _ Bölüm/Fonksiyon(3) _ Sıra No(3); kat kodu EK-2 Tablo 2.14
# (B01… bodrum, K00 zemin, K01… kat, KXX tabloda olmayan kat, NNN kattan bağımsız).
MAHAL_NO = re.compile(r"^(B\d{2}|K[A-Z0-9]{2}|NNN)_([A-Z0-9]{3})_(\d{3})$")
# EK-5 5.5.4 ve Tablo 6.58: Name = Disiplin-MHL-Açıklama; açıklamada mahal no ve/veya mahal ismi.
SABLONLU_AD = re.compile(r"^[A-Z]{2}-MHL-([^\s-]+)$")
ORTUSME_ORANI = 0.10  # küçük hacim oranına göre; komşu duvar payı için tolerans


def _tr_norm(s: str) -> str:
    return (
        s.strip()
        .replace("İ", "i")
        .replace("I", "ı")
        .lower()
    )


def mahal_adi_coz(ad: str) -> tuple[str | None, str | None]:
    """Name değerinden (mahal numarası, mahal ismi) döndürür. Düz EK-3 numarası ve EK-5 şablonu kabul edilir."""
    temiz = ad.strip()
    sablon = SABLONLU_AD.match(temiz)
    aciklama = sablon.group(1) if sablon else temiz
    numara = MAHAL_NO.match(aciklama[:11])
    if numara and (len(aciklama) == 11 or aciklama[11] == "_"):
        isim = aciklama[12:].replace("_", " ") or None
        return aciklama[:11], isim
    return None, aciklama.replace("_", " ") if sablon else None


def kontrol(b: Baglam) -> list[Bulgu]:
    mahaller = b.sinif("IfcSpace")
    if not mahaller:
        return []
    out: list[Bulgu] = []
    out += _numaralar(mahaller)
    out += _geometri(mahaller)
    return out


def _numaralar(mahaller: list[Any]) -> list[Bulgu]:
    tablo_3_2 = veri.ek3_mahaller()
    gecerli_kodlar = {_tr_norm(k) for k in tablo_3_2.keys()}
    gecerli_isimler = {_tr_norm(v) for v in tablo_3_2.values()}
    bos, bicim, isimsiz, tablo_disi = [], [], [], []
    for m in mahaller:
        ad = oznitelik(m, "Name")
        if ad is None:
            bos.append(m)
            continue
        numara, ad_ismi = mahal_adi_coz(str(ad))
        if numara is None and ad_ismi is None:
            bicim.append(m)
        uzun_ad = oznitelik(m, "LongName")
        isim = str(uzun_ad) if uzun_ad is not None else ad_ismi
        if isim is None:
            isimsiz.append(m)
        else:
            norm_isim = _tr_norm(isim)
            if norm_isim not in gecerli_kodlar and norm_isim not in gecerli_isimler:
                tablo_disi.append(m)
    out = []
    if bos:
        out.append(
            Bulgu(
                "mahal-no-bos",
                "hata",
                f"{len(bos)} mahalin numarası (Name) boş.",
                "m.10, EK-3 3.2",
                4,
                varlik_listesi(bos),
                len(bos),
            )
        )
    if bicim:
        out.append(
            Bulgu(
                "mahal-no-bicim",
                "hata",
                f"{len(bicim)} mahalin adı uymuyor. Beklenen K00_DAI_001 ya da MM-MHL-K00_DAI_001_Salon: kat kodu "
                "B01/B02… (bodrum), K00 (zemin), K01…, KXX ya da NNN; bölüm üç karakter; sıra no üç basamak.",
                "m.10, EK-3 Tablo 3.1, EK-5 5.5.4, EK-2 Tablo 2.14",
                4,
                varlik_listesi(bicim),
                len(bicim),
            )
        )
    if isimsiz:
        out.append(
            Bulgu(
                "mahal-isim-bos",
                "hata",
                f"{len(isimsiz)} mahalin ismi yok; isim Name açıklamasında ya da LongName'de, EK-3 Tablo 3.2'deki "
                "adlarla veya kısaltmalarıyla verilir.",
                "m.10, EK-3 3.3",
                4,
                varlik_listesi(isimsiz),
                len(isimsiz),
            )
        )
    if tablo_disi:
        out.append(
            Bulgu(
                "mahal-isim-tablo",
                "uyari",
                f"{len(tablo_disi)} mahalin ismi EK-3 Tablo 3.2 standart mahal isim/kısaltma "
                "listesinde yer almıyor (projeye özel mahal tanımıysa 3 harfli kısaltması Tablo 3.2 ile çakışmamalıdır).",
                "m.10, EK-3 3.3 ve Tablo 3.2",
                4,
                varlik_listesi(tablo_disi),
                len(tablo_disi),
            )
        )
    if not out:
        out.append(
            Bulgu(
                "mahal-no",
                "bilgi",
                "Mahal numaraları ve isimleri EK-3 Tablo 3.1 ve Tablo 3.2'ye uygun.",
                "m.10, EK-3",
                4,
            )
        )
    return out


def _geometri(mahaller: list[Any]) -> list[Bulgu]:
    kutular = sinir_kutulari(mahaller)
    if kutular is None:
        return [
            Bulgu(
                "mahal-geometri",
                "elle",
                "Geometri motoru yüklenemedi; mahallerin kapalılığı ve örtüşmesi elle kontrol edilmeli.",
                "EK-9 madde 13–14",
                13,
            )
        ]
    out: list[Bulgu] = []
    govdesiz = [m for m in mahaller if m.id() not in kutular or hacim(kutular[m.id()]) <= 1e-6]
    if govdesiz:
        out.append(
            Bulgu(
                "mahal-govde",
                "hata",
                f"{len(govdesiz)} mahalin kapalı bir 3B gövdesi yok (hacim sıfır ya da gösterim eksik); "
                "mahaller kapalı hacim olarak, üst sınırı tanımlı modellenmeli.",
                "EK-9 madde 14",
                14,
                varlik_listesi(govdesiz),
                len(govdesiz),
            )
        )
    else:
        out.append(
            Bulgu(
                "mahal-govde",
                "bilgi",
                "Her mahalin hacimli bir 3B gövdesi var.",
                "EK-9 madde 14",
                14,
            )
        )
    # Örtüşme: aynı kattaki mahal çiftleri; küçük hacmin %10'undan fazlası ortaksa uyarı.
    kat_gruplari: dict[int | None, list[Any]] = {}
    for m in mahaller:
        if m.id() in kutular:
            k = kati(m)
            kat_gruplari.setdefault(k.id() if k else None, []).append(m)
    ortusen: list[Any] = []
    for grup in kat_gruplari.values():
        for a, b in combinations(grup, 2):
            ka, kb = kutular[a.id()], kutular[b.id()]
            ortak = kesisim(ka, kb)
            kucuk = min(hacim(ka), hacim(kb))
            if kucuk > 1e-6 and ortak / kucuk > ORTUSME_ORANI:
                ortusen.extend([a, b])
    if ortusen:
        out.append(
            Bulgu(
                "mahal-ortusme",
                "uyari",
                f"{len(ortusen) // 2} mahal çifti aynı katta birbirine giriyor (sınır kutuları küçük "
                f"hacmin %{int(ORTUSME_ORANI * 100)}'undan fazla örtüşüyor); sınırları düzeltin. "
                "Kutu tabanlı kaba kontroldür, L biçimli mahallerde yanlış alarm verebilir.",
                "EK-9 madde 13",
                13,
                varlik_listesi(ortusen),
                len(ortusen),
            )
        )
    else:
        out.append(
            Bulgu(
                "mahal-ortusme",
                "bilgi",
                "Aynı kattaki mahaller örtüşmüyor (sınır kutusu kontrolü).",
                "EK-9 madde 13",
                13,
            )
        )
    return out
