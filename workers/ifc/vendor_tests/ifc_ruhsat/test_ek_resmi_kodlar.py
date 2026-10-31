"""Kural verisini EKLER.pdf tablolarına sabitler. Beklenen liste veriden türetilmez."""

import json
from pathlib import Path

from ifc_ruhsat import veri
from ifc_ruhsat.kurallar.isim import DOSYA_ADI
from ifc_ruhsat.kurallar.mahal import mahal_adi_coz

RESMI = json.loads((Path(__file__).parent / "ek_resmi_kodlar.json").read_text(encoding="utf-8"))


def test_tablo_2_3_2_11_disipline_gore_birebir() -> None:
    tablolar = veri.ek2_alt_disiplin_tablolari()
    assert {k: sorted(v) for k, v in tablolar.items()} == {k: sorted(v) for k, v in RESMI["alt_disiplin"].items()}


def test_tablo_2_12_ve_2_13_birebir() -> None:
    assert sorted(veri.ek2_dosya_turleri()) == sorted(RESMI["dosya_turu"])
    assert sorted(veri.ek2_dosya_tipleri()) == sorted(RESMI["dosya_tipi"])


def test_tablo_3_2_birebir() -> None:
    assert sorted(veri.ek3_mahaller()) == sorted(RESMI["mahal"])


def test_tablo_7_8_ve_9_2_madde_9() -> None:
    t78 = veri.ek7_tablolar()["IfcGeometricRepresentationContext"]
    assert t78["sayfa"] == 231
    assert [g["ad"] for g in t78["gerekenler"]] == [
        "CoordinateSpaceDimension", "Precision", "WorldCoordinateSystem", "TrueNorth",
    ]
    madde = next(m for m in veri.ek9_maddeler("ST") if m["no"] == 9)
    assert "emsal hesap" in madde["soru"]


def test_zemin_uc_karakterli_resmi_kodlari_kabul_edilir() -> None:
    assert DOSYA_ADI.match("123456_00_ZE_ZTE_RP_DGR_NNN_01_000")
    assert DOSYA_ADI.match("123456_00_MM_KOLN_PL_MMC_K00_01_000")


def test_mahal_adi_iki_bicimi_de_cozer() -> None:
    assert mahal_adi_coz("K00_DAI_001") == ("K00_DAI_001", None)
    assert mahal_adi_coz("MM-MHL-K00_DAI_001") == ("K00_DAI_001", None)
    assert mahal_adi_coz("MM-MHL-K00_DAI_001_Salon") == ("K00_DAI_001", "Salon")
    assert mahal_adi_coz("MM-MHL-Yatak_Odası") == (None, "Yatak Odası")
    assert mahal_adi_coz("KAS_DAI_001") == ("KAS_DAI_001", None)
    assert mahal_adi_coz("Depo 1") == (None, None)
