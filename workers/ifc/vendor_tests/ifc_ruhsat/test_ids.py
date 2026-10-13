# Vendored from BerkantACUN/ifc-ruhsat@cd6d3ce (MIT); MCP/CLI tests dropped because those modules are not vendored.
from __future__ import annotations

import ifcopenshell
from ifctester import ids as ids_mod

from ifc_ruhsat import ids_uret


def test_ids_dosyalari_uretilir_ve_geri_okunur(tmp_path):
    yollar = ids_uret.yaz(tmp_path)
    assert [y.name for y in yollar] == ["tr-ruhsat-ek6.ids", "tr-ruhsat-ek7.ids"]
    ek6 = ids_mod.open(str(yollar[0]))
    assert len(ek6.specifications) == 68
    duvar = next(s for s in ek6.specifications if "IfcWall" in s.name)
    assert any(getattr(r, "propertySet", None) == "Pset_WallCommon" for r in duvar.requirements)
    assert any(isinstance(r, ids_mod.Material) for r in duvar.requirements)


def test_ids_iyi_modeli_gecirir_kotuyu_gecirmez(iyi_dosya, kotu_dosya, tmp_path):
    ek6 = ids_uret.uret("EK-6")
    ek6.validate(ifcopenshell.open(str(iyi_dosya)))
    duvar = next(s for s in ek6.specifications if "IfcWall" in s.name)
    assert duvar.status is True
    ek6 = ids_uret.uret("EK-6")
    ek6.validate(ifcopenshell.open(str(kotu_dosya)))
    duvar = next(s for s in ek6.specifications if "IfcWall" in s.name)
    assert duvar.status is False
