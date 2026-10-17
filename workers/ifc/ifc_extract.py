#!/usr/bin/env python3
"""
ifc_extract.py

Production-ready IFC extractor using IfcOpenShell.
Extracts structural and architectural elements (IfcBeam, IfcColumn, IfcSlab, IfcWall,
IfcReinforcingBar, IfcCovering, plus civil/MEP fallback classes when primary classes are absent),
their spatial containment (storeys, including IfcSpace -> IfcBuildingStorey traversal),
QTO/PropertySet quantities (including IfcComplexProperty unwrapping and Revit unit anomaly
normalization), 3D IfcOpenShell geometry fallback, and TR Pset / ÇŞB compliance.

Adheres strictly to TeklifPro QTO priority:
1. Standard QTO (IfcElementQuantity: NetVolume, GrossVolume, Volume, etc.)
2. Approved exporter PropertySets (AllplanAttributes, Pset_*Common, Dimensions, Pset_VBI, etc.)
3. Verified 3D solid/surface/curve representation via IfcOpenShell (when Representation exists)
4. No step-ID based synthetic formulas.
"""

import argparse
import json
import math
import multiprocessing
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

try:
    import ifcopenshell
except ImportError:
    sys.stderr.write("ERROR: ifcopenshell module not found. Please install requirements.\n")
    sys.exit(1)

try:
    import ifcopenshell.geom as ifc_geom
    import ifcopenshell.util.shape as ifc_shape
except ImportError:
    ifc_geom = None
    ifc_shape = None


# Exit Codes
EXIT_SUCCESS = 0
EXIT_PARSE_FAILED = 1
EXIT_SCHEMA_UNSUPPORTED = 2
EXIT_EMPTY_MODEL = 3

APPROVED_VOLUME_QTY_NAMES = {
    "grossvolume",
    "netvolume",
    "volume",
    "hacim",
    "net hacim",
    "netto-volumen",
    "pec_volume",
    "katman_hacmi",
}

APPROVED_AREA_QTY_NAMES = {
    "grosssidearea",
    "netsidearea",
    "sidearea",
    "grossarea",
    "netarea",
    "area",
    "kalıp alanı",
    "kalip alani",
    "formworkarea",
    "netto-fläche",
    "netto-flaeche",
    "alan",
    "yüzey",
    "yuzey",
    "grossfootprintarea",
    "netfootprintarea",
    "footprintarea",
}

APPROVED_WEIGHT_QTY_NAMES = {
    "grossweight",
    "netweight",
    "weight",
    "mass",
    "ağırlık",
    "agirlik",
    "netto-masse",
    "netto-gewicht",
    "pec_weight",
}

APPROVED_PROPERTY_SETS = {
    "allplanattributes",
    "allplanquantities",
    "pset_slabcommon",
    "pset_beamcommon",
    "pset_columncommon",
    "pset_wallcommon",
    "pset_coveringcommon",
    "pset_revit_dimensions",
    "dimensions",
    "pset_vbi",
    "pset_quantitytakeoff",
    "pecparameters",
    "qto_slabbasequantities",
    "qto_beambasequantities",
    "qto_columnbasequantities",
    "qto_wallbasequantities",
    "qto_coveringbasequantities",
    "basequantities",
    "trepys_pozozellikseti",
    "trepys_emsalozellikseti",
}


def safe_float(val: Any) -> Optional[float]:
    if val is None or isinstance(val, bool):
        return None
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (ValueError, TypeError):
        return None


SI_PREFIXES = {"EXA": 1e18, "PETA": 1e15, "TERA": 1e12, "GIGA": 1e9,
               "MEGA": 1e6, "KILO": 1e3, "HECTO": 1e2, "DECA": 10.,
               "DECI": .1, "CENTI": .01, "MILLI": .001, "MICRO": 1e-6,
               "NANO": 1e-9, "PICO": 1e-12, "FEMTO": 1e-15, "ATTO": 1e-18, None: 1.}


def unit_scale(unit: Any, kind: str, seen=None) -> float:
    seen = set() if seen is None else seen
    if unit.id() in seen or len(seen) > 16 or getattr(unit, "UnitType", None) != kind:
        raise ValueError("IFC_UNIT_UNSUPPORTED: invalid or cyclic unit")
    seen = seen | {unit.id()}
    if unit.is_a("IfcSIUnit"):
        expected, power = {"LENGTHUNIT": ("METRE", 1), "AREAUNIT": ("SQUARE_METRE", 2),
                           "VOLUMEUNIT": ("CUBIC_METRE", 3), "MASSUNIT": ("GRAM", 1)}[kind]
        if unit.Name != expected or unit.Prefix not in SI_PREFIXES:
            raise ValueError("IFC_UNIT_UNSUPPORTED: SI unit")
        return SI_PREFIXES[unit.Prefix] ** power * (.001 if kind == "MASSUNIT" else 1.)
    if unit.is_a("IfcConversionBasedUnit"):
        if getattr(unit, "ConversionOffset", 0):
            raise ValueError("IFC_UNIT_UNSUPPORTED: offset unit")
        factor = unit.ConversionFactor
        value = safe_float(factor.ValueComponent.wrappedValue)
        if value is None or value <= 0:
            raise ValueError("IFC_UNIT_UNSUPPORTED: conversion factor")
        return value * unit_scale(factor.UnitComponent, kind, seen)
    raise ValueError("IFC_UNIT_UNSUPPORTED: unit type")


def project_unit_scale(model: Any, kind: str) -> float:
    projects = model.by_type("IfcProject")
    assignments = [p.UnitsInContext for p in projects if p.UnitsInContext]
    if not assignments:
        assignments = model.by_type("IfcUnitAssignment")
    units = [u for a in assignments for u in a.Units if getattr(u, "UnitType", None) == kind]
    if not units:
        # Legacy models without unit declarations use the existing SI convention.
        if assignments:
            return math.nan
        return 1.
    scales = {unit_scale(u, kind) for u in units}
    if len(scales) != 1:
        raise ValueError("IFC_UNIT_UNSUPPORTED: ambiguous project units")
    return scales.pop()


def quantity_scale(quantity: Any, kind: str, default: float) -> float:
    unit = getattr(quantity, "Unit", None)
    if unit:
        return unit_scale(unit, kind)
    if not math.isfinite(default) or default <= 0:
        raise ValueError(f"IFC_UNIT_UNSUPPORTED: missing {kind}")
    return default


def get_unit_scale_factors(model: ifcopenshell.file) -> Tuple[float, float, float]:
    return (project_unit_scale(model, "LENGTHUNIT"), project_unit_scale(model, "VOLUMEUNIT"),
            project_unit_scale(model, "AREAUNIT"))


EXPLICIT_FORMWORK_QTY_NAMES = {
    "formworkarea",
    "grossformworkarea",
    "netformworkarea",
    "kalıp alanı",
    "kalip alani",
    "kalıp_alanı",
    "kalip_alani",
}


def pset_rank(pset_name: str) -> int:
    name = (pset_name or "").lower()
    if name.startswith("qto_") and name.endswith("basequantities"):
        return 1
    if name == "basequantities":
        return 2
    if any(name.startswith(prefix) for prefix in APPROVED_PROPERTY_SETS):
        return 3
    return 4


def iter_pset_single_values(prop_def: Any) -> List[Tuple[Any, str]]:
    """
    Yields (IfcPropertySingleValue, path_prefix) from an IfcPropertySet,
    recursively unwrapping IfcComplexProperty (e.g. Allplan 'Object Layer Attributes #1').
    """
    out: List[Tuple[Any, str]] = []
    pset_name = str(getattr(prop_def, "Name", "") or "")

    def _walk(props: Any, prefix: str) -> None:
        for prop in props or []:
            if prop.is_a("IfcPropertySingleValue"):
                out.append((prop, prefix))
            elif prop.is_a("IfcComplexProperty"):
                c_name = str(getattr(prop, "Name", "") or "Complex")
                _walk(getattr(prop, "HasProperties", []), f"{prefix}/{c_name}")

    _walk(getattr(prop_def, "HasProperties", []), pset_name)
    return out


def normalize_qto_set_quantities(
    prop_def: Any, length_scale: float, vol_scale: float, area_scale: float
) -> Tuple[Dict[int, Optional[float]], Dict[int, Optional[float]]]:
    """
    Detects and normalizes well-known Revit IFC exporter unit scaling bugs in IfcElementQuantity:
    - Duplicate NetVolume / NetSideArea entries in the same QTO set where one is in mm³ (10^9x) or mm² (10^6x)
      and the other is in m³ / m² -> discards the unscaled duplicate.
    - Slab GrossVolume written as GrossArea (m²) * Width (mm) (10^3x too large) -> scales by length_scale.
    - Wall / Column / Beam volume or side/outer area written in mm³, m²·mm, ft²·mm, mm², m·mm, or ft·mm
      compared to bounding dimensions (Length, Width, Height, CrossSectionArea) -> normalizes to m³ / m².
    Returns (vol_overrides_by_id, area_overrides_by_id). A value of None means skip the duplicate artifact.
    """
    if not (math.isfinite(length_scale) and 0.0 < length_scale < 0.1):
        return {}, {}
    if not (math.isfinite(vol_scale) and vol_scale > 0 and math.isfinite(area_scale) and area_scale > 0):
        return {}, {}

    lengths_m: Dict[str, float] = {}
    raw_areas: List[Tuple[int, str, float]] = []
    raw_vols: List[Tuple[int, str, float]] = []

    for q in getattr(prop_def, "Quantities", []):
        if getattr(q, "Unit", None) is not None:
            continue
        name = str(getattr(q, "Name", "") or "").lower()
        if q.is_a("IfcQuantityLength"):
            v = safe_float(getattr(q, "LengthValue", None))
            if v is not None and v > 0:
                lengths_m[name] = v * length_scale
        elif q.is_a("IfcQuantityArea"):
            v = safe_float(getattr(q, "AreaValue", None))
            if v is not None and v > 0:
                raw_areas.append((q.id(), name, v * area_scale))
        elif q.is_a("IfcQuantityVolume"):
            v = safe_float(getattr(q, "VolumeValue", None))
            if v is not None and v > 0:
                raw_vols.append((q.id(), name, v * vol_scale))

    vol_overrides: Dict[int, Optional[float]] = {}
    area_overrides: Dict[int, Optional[float]] = {}

    w_m = lengths_m.get("width") or lengths_m.get("depth") or lengths_m.get("thickness")
    l_m = lengths_m.get("length")
    h_m = lengths_m.get("height")
    box_vol = (l_m * w_m * h_m) if (l_m and w_m and h_m) else None
    box_side = (l_m * h_m) if (l_m and h_m) else None
    gross_or_net_area = next((v for _, n, v in raw_areas if n in ("grossarea", "netarea", "grossfootprintarea") and v < 1e5), None)
    cs_area = next((v for _, n, v in raw_areas if n == "crosssectionarea" and v < 100), None)
    if box_vol is None and cs_area and l_m:
        box_vol = cs_area * l_m
    if box_side is None and cs_area and l_m:
        box_side = 4.0 * math.sqrt(cs_area) * l_m

    min_vol = min((v for _, _, v in raw_vols), default=None)
    for qid, name, val in raw_vols:
        same_name_min = min((v for _, n, v in raw_vols if n == name), default=None)
        if same_name_min and val > same_name_min * 500:
            # Same-name duplicate in mm³ / m²·mm alongside valid m³ entry -> discard artifact
            vol_overrides[qid] = None
            continue
        if min_vol and val > min_vol * 500:
            for p in (1, 2, 3):
                scaled = val * (length_scale ** p)
                if abs(scaled - min_vol) / max(min_vol, 1e-9) < 0.35:
                    vol_overrides[qid] = scaled
                    break
        if qid in vol_overrides:
            continue
        if gross_or_net_area and w_m:
            expected_slab_vol = gross_or_net_area * w_m
            if val > expected_slab_vol * 100 and abs(val * length_scale - expected_slab_vol) / max(expected_slab_vol, 1e-9) < 0.35:
                vol_overrides[qid] = val * length_scale
                continue
        if box_vol and val > box_vol * 50:
            for factor in (length_scale, length_scale ** 2, length_scale ** 3, (0.3048 ** 2) * length_scale):
                scaled = val * factor
                if 0.05 * box_vol <= scaled <= 2.5 * box_vol:
                    vol_overrides[qid] = scaled
                    break

    for qid, name, val in raw_areas:
        same_name_min = min((v for _, n, v in raw_areas if n == name), default=None)
        if same_name_min and val > same_name_min * 500:
            area_overrides[qid] = None
            continue
        if box_side and val > box_side * 50:
            for factor in (length_scale, length_scale ** 2, 0.3048 * length_scale):
                scaled = val * factor
                if 0.05 * box_side <= scaled <= 4.0 * box_side:
                    area_overrides[qid] = scaled
                    break

    return vol_overrides, area_overrides


def map_entity_type(raw_type: str) -> str:
    if raw_type in {"IfcWall", "IfcWallStandardCase", "IfcWallElementedCase", "IfcCurtainWall"}:
        return "IfcWall"
    if raw_type in {"IfcSlab", "IfcSlabStandardCase", "IfcSlabElementedCase", "IfcFooting", "IfcRoof", "IfcStair", "IfcStairFlight", "IfcRamp", "IfcRampFlight"}:
        return "IfcSlab"
    if raw_type in {"IfcBeam", "IfcBeamStandardCase", "IfcMember", "IfcMemberStandardCase"}:
        return "IfcBeam"
    if raw_type in {"IfcColumn", "IfcColumnStandardCase", "IfcPile"}:
        return "IfcColumn"
    if raw_type in {"IfcCovering", "IfcPlate", "IfcPlateStandardCase", "IfcWindow", "IfcDoor"}:
        return "IfcCovering"
    if raw_type in {"IfcReinforcingBar", "IfcReinforcingMesh", "IfcTendon"}:
        return "IfcReinforcingBar"
    return "IfcBeam"


def extract_quantities_and_properties(
    elem: Any, vol_scale: float, area_scale: float, mass_scale: float = 1., length_scale: float = 1.
) -> Tuple[
    float,  # volumeM3
    float,  # formworkM2
    str,    # formworkBasis ("explicit" | "derived" | "none")
    Optional[str],  # formworkNote
    float,  # rebarKg
    str,    # quantitySource ("qto" | "property" | "estimate")
    Optional[str],  # quantitySourcePath
    Optional[float],  # quantityConfidence
    str,    # smartCheckStatus ("pass" | "warning" | "review")
    Optional[str],  # smartCheckNote
    Optional[str],  # pozNo
    Optional[str],  # pozNoSourcePath
    Dict[str, Any],  # ruleMetadata (loadBearing, exposure, exposureClass, coverMm, discipline, expectedQuantity)
]:
    raw_type = elem.is_a()
    elem_type = map_entity_type(raw_type)

    volume_candidates = []
    property_candidates = []
    qto_volume = None
    qto_weight = None
    qto_source_path = None
    qto_conf = 0.9

    prop_volume = None
    prop_weight = None
    prop_source_path = None
    prop_conf = 0.85

    poz_no = None
    poz_source_path = None

    load_bearing: Optional[bool] = None
    exposure: Optional[str] = None
    exposure_class: Optional[str] = None
    cover_mm: Optional[float] = None
    discipline: Optional[str] = None
    explicit_expected_volume: Optional[float] = None

    # Track area quantities with set priority for formwork derivation
    explicit_formwork: List[Tuple[int, float, str]] = []
    net_area: List[Tuple[int, float, str]] = []
    gross_area: List[Tuple[int, float, str]] = []
    net_side_area: List[Tuple[int, float, str]] = []
    gross_side_area: List[Tuple[int, float, str]] = []
    outer_surface_area: List[Tuple[int, float, str]] = []

    layer_thickness_sum = 0.0
    nominal_height_m: Optional[float] = None
    prop_bar_length_m: Optional[float] = None
    material_layers: List[str] = []
    calc_mode_unit: Optional[str] = None
    eff_length_scale = length_scale if (math.isfinite(length_scale) and length_scale > 0) else 1.0

    for rel in getattr(elem, "IsDefinedBy", []):
        if not rel.is_a("IfcRelDefinesByProperties"):
            continue
        rel_id = rel.id()
        prop_def = getattr(rel, "RelatingPropertyDefinition", None)
        if not prop_def:
            continue
        pset_id = prop_def.id()
        pset_name = str(getattr(prop_def, "Name", "") or "")
        pset_name_lower = pset_name.lower()
        rank = pset_rank(pset_name)

        # Handle IfcElementQuantity
        if prop_def.is_a("IfcElementQuantity"):
            vol_overrides, area_overrides = normalize_qto_set_quantities(
                prop_def, eff_length_scale, vol_scale, area_scale
            )
            for qty in getattr(prop_def, "Quantities", []):
                qty_id = qty.id()
                qty_name = str(getattr(qty, "Name", "") or "")
                qty_name_lower = qty_name.lower()
                source_path_item = f"#{rel_id}/#{pset_id}/#{qty_id}:{pset_name}/{qty_name}"

                if qty.is_a("IfcQuantityVolume") and qty_name_lower in APPROVED_VOLUME_QTY_NAMES:
                    if qty_id in vol_overrides and vol_overrides[qty_id] is None:
                        continue
                    val = safe_float(getattr(qty, "VolumeValue", None))
                    if val is not None and val > 0:
                        scaled_vol = vol_overrides.get(qty_id)
                        if scaled_vol is None:
                            scaled_vol = val * quantity_scale(qty, "VOLUMEUNIT", vol_scale)
                        volume_candidates.append((0 if "net" in qty_name_lower else 1, rank, source_path_item, scaled_vol))

                elif qty.is_a("IfcQuantityArea"):
                    if qty_id in area_overrides and area_overrides[qty_id] is None:
                        continue
                    val = safe_float(getattr(qty, "AreaValue", None))
                    if val is not None and val > 0:
                        scaled_area = area_overrides.get(qty_id)
                        if scaled_area is None:
                            scaled_area = val * quantity_scale(qty, "AREAUNIT", area_scale)
                        if qty_name_lower in EXPLICIT_FORMWORK_QTY_NAMES:
                            explicit_formwork.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "netarea":
                            net_area.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower in {"grossarea", "grossfootprintarea", "footprintarea"}:
                            gross_area.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "netsidearea":
                            net_side_area.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "grosssidearea":
                            gross_side_area.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "outersurfacearea":
                            outer_surface_area.append((rank, scaled_area, source_path_item))

                elif qty.is_a("IfcQuantityWeight") and qty_name_lower in APPROVED_WEIGHT_QTY_NAMES:
                    val = safe_float(getattr(qty, "WeightValue", None))
                    if val is not None and val > 0:
                        qto_weight = val * quantity_scale(qty, "MASSUNIT", mass_scale)

                elif qty.is_a("IfcQuantityLength") and qty_name_lower in {"length", "barlength", "pec_length"}:
                    val = safe_float(getattr(qty, "LengthValue", None))
                    if val is not None and val > 0:
                        prop_bar_length_m = val * quantity_scale(qty, "LENGTHUNIT", eff_length_scale)

        # Handle IfcPropertySet (including nested IfcComplexProperty)
        elif prop_def.is_a("IfcPropertySet"):
            complex_layer_volumes: List[Tuple[str, float]] = []
            for prop, prop_prefix in iter_pset_single_values(prop_def):
                p_id = prop.id()
                p_name = str(getattr(prop, "Name", "") or "")
                p_name_lower = p_name.lower()
                nominal_val = getattr(prop, "NominalValue", None)
                wrapped_val = getattr(nominal_val, "wrappedValue", None) if nominal_val else None
                nominal_type = nominal_val.is_a().upper() if (nominal_val and hasattr(nominal_val, "is_a")) else ""
                source_path_item = f"#{rel_id}/#{pset_id}/#{p_id}:{prop_prefix}/{p_name}"

                # Poz No detection (prioritize official RG 33331 EK-4 TREpys_PozOzellikSeti)
                if p_name_lower in {"pozno", "poz_no", "csbpozno", "csb_pozno", "pozisyonno", "birimfiyatpozno", "pozkodu", "kalemkodu"}:
                    if wrapped_val:
                        is_trepys_poz = pset_name_lower == "trepys_pozozellikseti"
                        if is_trepys_poz or poz_no is None or not (poz_source_path and "trepys_pozozellikseti" in poz_source_path.lower()):
                            poz_no = str(wrapped_val).strip()
                            poz_source_path = source_path_item

                # 3x3 Rule Pack metadata extraction (LoadBearing, IsExternal, Cover, ExposureClass, Discipline)
                if p_name_lower in {"loadbearing", "tasiyici", "tasiyicimi"} and wrapped_val is not None:
                    if isinstance(wrapped_val, bool):
                        load_bearing = wrapped_val
                    else:
                        s_val = str(wrapped_val).strip().lower()
                        if s_val in {"true", ".t.", "1", "evet", "yes"}:
                            load_bearing = True
                        elif s_val in {"false", ".f.", "0", "hayir", "hayır", "no"}:
                            load_bearing = False
                elif p_name_lower in {"isexternal", "discephe", "disortam"} and wrapped_val is not None:
                    if isinstance(wrapped_val, bool):
                        exposure = "exterior" if wrapped_val else "interior"
                    else:
                        s_val = str(wrapped_val).strip().lower()
                        if s_val in {"true", ".t.", "1", "evet", "yes", "exterior", "dis", "dış"}:
                            exposure = "exterior"
                        elif s_val in {"false", ".f.", "0", "hayir", "hayır", "no", "interior", "ic", "iç"}:
                            exposure = "interior"
                elif p_name_lower in {"exposureclass", "maruziyetsinifi", "cevreselmaruziyet"} and wrapped_val:
                    exposure_class = str(wrapped_val).strip().upper()
                elif p_name_lower in {"cover", "concretecover", "nominalcover", "reinforcementcover", "paspayi", "paspayimm", "ortubetonu"}:
                    c_val = safe_float(wrapped_val)
                    if c_val is not None and c_val > 0:
                        cover_mm = round(c_val * 1000.0, 2) if c_val < 1.0 else round(c_val, 2)
                elif p_name_lower in {"discipline", "disiplin"} and wrapped_val:
                    discipline = str(wrapped_val).strip().upper()
                elif p_name_lower in {"expectedvolume", "hedefhacim"}:
                    e_val = safe_float(wrapped_val)
                    if e_val is not None and e_val > 0:
                        explicit_expected_volume = e_val * quantity_scale(prop, "VOLUMEUNIT", vol_scale)

                # Track layer thickness, nominal height, material layers, and calculation mode for coverings / skirting boards
                if p_name_lower in {"katman_kalınlığı", "katman_kalinligi"}:
                    t_val = safe_float(wrapped_val)
                    if t_val is not None and t_val > 0:
                        layer_thickness_sum += t_val * (eff_length_scale if t_val > 1.0 else 1.0)
                elif p_name_lower in {"nominal yükseklik", "nominal yukseklik", "nominal_yükseklik"}:
                    h_val = safe_float(wrapped_val)
                    if h_val is not None and h_val > 0:
                        nominal_height_m = h_val * (eff_length_scale if h_val > 2.0 else 1.0)
                elif p_name_lower in {"pec_length", "barlength"}:
                    l_val = safe_float(wrapped_val)
                    if l_val is not None and l_val > 0:
                        prop_bar_length_m = l_val * eff_length_scale
                elif p_name_lower in {"malzeme", "katman_malzemesi", "material"} and wrapped_val:
                    m_str = str(wrapped_val).strip()
                    if m_str and m_str not in material_layers:
                        material_layers.append(m_str)
                elif p_name_lower in {"hesaplama modu", "hesaplama_modu"} and wrapped_val:
                    calc_mode_unit = str(wrapped_val).strip()

                # Property volume/area/weight
                is_approved = any(pset_name_lower.startswith(prefix) for prefix in APPROVED_PROPERTY_SETS)
                if is_approved:
                    if p_name_lower in APPROVED_VOLUME_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_vol_scale = vol_scale if (math.isfinite(vol_scale) and vol_scale > 0) else (eff_length_scale ** 3)
                            scaled_v = val * (unit_scale(prop.Unit, "VOLUMEUNIT") if getattr(prop, "Unit", None) else quantity_scale(prop, "VOLUMEUNIT", vol_scale) if math.isfinite(vol_scale) else eff_vol_scale)
                            if "/" in prop_prefix:
                                complex_layer_volumes.append((source_path_item, scaled_v))
                            else:
                                property_candidates.append((0 if "net" in p_name_lower else 1, rank, source_path_item, scaled_v))
                    elif p_name_lower in EXPLICIT_FORMWORK_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            explicit_formwork.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower in {"netarea", "alan", "yüzey", "yuzey"}:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            net_area.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower in {"grossarea", "area"}:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            # In Revit IFC2x3 Dimensions, Area is IFCAreaMeasure (already in m2 when AREAUNIT is SQUARE_METRE)
                            gross_area.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower == "netsidearea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            net_side_area.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower in {"grosssidearea", "sidearea"}:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            gross_side_area.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower == "outersurfacearea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_a_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)
                            outer_surface_area.append((rank, val * quantity_scale(prop, "AREAUNIT", eff_a_scale), source_path_item))
                    elif p_name_lower in APPROVED_WEIGHT_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            eff_m_scale = mass_scale if (math.isfinite(mass_scale) and mass_scale > 0) else 1.0
                            prop_weight = val * (unit_scale(prop.Unit, "MASSUNIT") if getattr(prop, "Unit", None) else eff_m_scale)

            if complex_layer_volumes and not property_candidates:
                total_layer_vol = sum(v for _, v in complex_layer_volumes)
                property_candidates.append((1, rank, complex_layer_volumes[0][0], total_layer_vol))

    if property_candidates:
        selected = sorted(property_candidates)[0]
        prop_volume, prop_source_path = selected[3], selected[2]

    if volume_candidates:
        # Cross-check against prop_volume if length_scale < 0.1 (e.g., Revit BaseQuantities vs Dimensions)
        if prop_volume is not None and prop_volume > 0 and 0.0 < eff_length_scale < 0.1:
            normalized_vc = []
            for net_rank, rnk, sp, v in volume_candidates:
                if v > prop_volume * 500:
                    for p in (1, 2, 3):
                        if abs(v * (eff_length_scale ** p) - prop_volume) / prop_volume < 0.1:
                            v = v * (eff_length_scale ** p)
                            break
                normalized_vc.append((net_rank, rnk, sp, v))
            volume_candidates = normalized_vc
        selected = sorted(volume_candidates)[0]
        qto_volume, qto_source_path = selected[3], selected[2]
        qto_conf = .95 if selected[0] == 0 else .9

    # Formwork (formworkM2) Resolution adhering to buildingSMART standards:
    formwork_m2 = 0.0
    formwork_basis = "none"
    formwork_note = None

    if explicit_formwork:
        explicit_formwork.sort(key=lambda x: x[0])
        formwork_m2 = explicit_formwork[0][1]
        formwork_basis = "explicit"
        formwork_note = "Açık kalıp niceliğinden (FormworkArea) alındı."
    elif elem_type == "IfcSlab":
        if net_area:
            net_area.sort(key=lambda x: x[0])
            formwork_m2 = net_area[0][1]
            formwork_basis = "derived"
            formwork_note = "Kenar kalıbı dahil değil; kiriş/kolon altları düşülmemiş olabilir."
        elif gross_area:
            gross_area.sort(key=lambda x: x[0])
            formwork_m2 = gross_area[0][1]
            formwork_basis = "derived"
            formwork_note = "Kenar kalıbı dahil değil; kiriş/kolon altları düşülmemiş olabilir. Boşluklar düşülmemiş."
        else:
            formwork_m2 = 0.0
            formwork_basis = "none"
            formwork_note = "Döşeme için kalıp alanı hesaplanamadı (NetArea veya GrossArea bulunamadı)."
    elif elem_type in {"IfcWall", "IfcWallStandardCase"}:
        if net_side_area:
            net_side_area.sort(key=lambda x: x[0])
            formwork_m2 = 2.0 * net_side_area[0][1]
            formwork_basis = "derived"
            formwork_note = "Tek yüz toprağa/komşu betona dayalıysa gerçek değer daha azdır. Uç ve boşluk yan yüzleri hariç."
        elif gross_side_area:
            gross_side_area.sort(key=lambda x: x[0])
            formwork_m2 = 2.0 * gross_side_area[0][1]
            formwork_basis = "derived"
            formwork_note = "Tek yüz toprağa/komşu betona dayalıysa gerçek değer daha azdır. Uç ve boşluk yan yüzleri hariç. Boşluklar düşülmemiş."
        else:
            formwork_m2 = 0.0
            formwork_basis = "none"
            formwork_note = "Duvar için kalıp alanı hesaplanamadı (NetSideArea veya GrossSideArea bulunamadı)."
    elif elem_type == "IfcColumn":
        if outer_surface_area:
            outer_surface_area.sort(key=lambda x: x[0])
            formwork_m2 = outer_surface_area[0][1]
            formwork_basis = "derived"
            formwork_note = "NetSurfaceArea ve GrossSurfaceArea kullanılmaz (2 × kesit alanı = uç kapakları içerir). Kiriş/döşeme birleşimi düşülmemiş."
        else:
            formwork_m2 = 0.0
            formwork_basis = "none"
            formwork_note = "Kolon kalıp alanı için OuterSurfaceArea bulunamadı (NetSurfaceArea/GrossSurfaceArea uç kapakları içerdiği için kullanılmaz)."
    elif elem_type == "IfcBeam":
        formwork_m2 = 0.0
        formwork_basis = "none"
        formwork_note = "Kiriş kalıbı için kesit boyutu gerekli."
    elif elem_type == "IfcReinforcingBar":
        formwork_m2 = 0.0
        formwork_basis = "none"
        formwork_note = "Kalıp yok."
    else:
        formwork_m2 = 0.0
        formwork_basis = "none"
        formwork_note = "Kalıp alanı için uygun nicelik bulunamadı."

    if formwork_m2 <= 0.0:
        formwork_m2 = 0.0
        formwork_basis = "none"

    # Quantity Source Resolution (Priority: 1. QTO, 2. Property, 3. Empty/No guessing)
    volume_m3 = 0.0
    rebar_kg = 0.0
    quantity_source = "estimate"
    source_path = None
    confidence = None
    status = "pass"
    note = "TBDY 2018 / TS 500 ve TS 708 metraj esaslarına göre incelendi."

    if qto_volume is not None:
        volume_m3 = round(qto_volume, 12)
        rebar_kg = round(qto_weight, 1) if qto_weight is not None else 0.0
        quantity_source = "qto"
        source_path = qto_source_path
        confidence = qto_conf
        status = "review"
        note = "Standart QTO kaynağından okundu; teknik inceleme önerilir."
        if prop_volume is not None and abs(prop_volume - qto_volume) > 0.01:
            note += f" (Uyarı: PropertySet değeri {round(prop_volume, 2)} m³ ile QTO {round(qto_volume, 2)} m³ arasında fark var)."

    elif prop_volume is not None:
        volume_m3 = round(prop_volume, 12)
        rebar_kg = round(prop_weight, 1) if prop_weight is not None else 0.0
        quantity_source = "property"
        source_path = prop_source_path
        confidence = prop_conf
        status = "review"
        note = "Onaylı PropertySet kaynağından okundu; kalıp/donatı kanıtı gerekebilir."

    else:
        # NO STEP-ID GUESSING.
        volume_m3 = 0.0
        rebar_kg = round(qto_weight or prop_weight or 0.0, 1)
        quantity_source = "estimate"
        source_path = None
        confidence = 0.1
        status = "review"
        note = "QTO veya PropertySet metrajı bulunamadı. Geometrik veya manuel metraj girişi gereklidir."

    covering_area_m2: Optional[float] = None
    if elem_type == "IfcCovering":
        chosen_area = None
        is_net_covering = False
        if net_area:
            net_area.sort(key=lambda x: x[0])
            chosen_area = net_area[0]
            is_net_covering = True
        elif gross_area:
            gross_area.sort(key=lambda x: x[0])
            chosen_area = gross_area[0]
        if chosen_area is not None and chosen_area[1] > 0:
            covering_area_m2 = round(chosen_area[1], 6)
            if volume_m3 == 0.0:
                quantity_source = "qto" if chosen_area[0] <= 2 else "property"
                source_path = chosen_area[2]
                confidence = 0.95 if is_net_covering else 0.90
                status = "review"
                note = "IfcCovering kaplama alanı (NetArea/GrossArea) kaynağından okundu."

    candidates = volume_candidates + property_candidates
    if candidates and volume_m3 > 0 and any(abs(c[3] - volume_m3) > max(1e-8, abs(volume_m3) * 1e-6) for c in candidates):
        note += " | IFC_QUANTITY_CONFLICT: " + "; ".join(f"{c[2]}={c[3]:.12g} m3" for c in sorted(candidates))
    if formwork_note:
        note = f"{note} | {formwork_note}" if note else formwork_note

    expected_qty = explicit_expected_volume
    if expected_qty is None and qto_volume is not None and prop_volume is not None:
        expected_qty = round(prop_volume, 12)

    if discipline is None and load_bearing is not None:
        discipline = "STR" if elem_type in {"IfcBeam", "IfcColumn"} or load_bearing else "ARC"

    if not material_layers:
        for assoc in getattr(elem, "HasAssociations", []) or []:
            if assoc.is_a("IfcRelAssociatesMaterial"):
                mat = getattr(assoc, "RelatingMaterial", None)
                if mat is None:
                    continue
                if mat.is_a("IfcMaterial"):
                    m_name = str(getattr(mat, "Name", "") or "").strip()
                    if m_name and m_name not in material_layers:
                        material_layers.append(m_name)
                elif mat.is_a("IfcMaterialList"):
                    for m_item in getattr(mat, "Materials", []) or []:
                        m_name = str(getattr(m_item, "Name", "") or "").strip()
                        if m_name and m_name not in material_layers:
                            material_layers.append(m_name)
                elif mat.is_a("IfcMaterialLayerSetUsage"):
                    lset = getattr(mat, "ForLayerSet", None)
                    for m_layer in getattr(lset, "MaterialLayers", []) or []:
                        m_mat = getattr(m_layer, "Material", None)
                        m_name = str(getattr(m_mat, "Name", "") or "").strip()
                        if m_name and m_name not in material_layers:
                            material_layers.append(m_name)
                elif mat.is_a("IfcMaterialLayerSet"):
                    for m_layer in getattr(mat, "MaterialLayers", []) or []:
                        m_mat = getattr(m_layer, "Material", None)
                        m_name = str(getattr(m_mat, "Name", "") or "").strip()
                        if m_name and m_name not in material_layers:
                            material_layers.append(m_name)

    rule_metadata: Dict[str, Any] = {}
    if covering_area_m2 is not None and covering_area_m2 > 0:
        rule_metadata["areaM2"] = covering_area_m2
    if elem_type == "IfcCovering":
        predef_str = str(getattr(elem, "PredefinedType", "") or "").strip().upper()
        if predef_str:
            rule_metadata["coveringPredefinedType"] = predef_str
    if material_layers:
        rule_metadata["materialLayers"] = material_layers
    if gross_area and net_area:
        g_val_m2 = sorted(gross_area, key=lambda x: x[0])[0][1]
        n_val_m2 = sorted(net_area, key=lambda x: x[0])[0][1]
        if g_val_m2 >= n_val_m2 > 0:
            rule_metadata["grossAreaM2"] = round(g_val_m2, 4)
            rule_metadata["openingAreaM2"] = round(max(0.0, g_val_m2 - n_val_m2), 4)
    elif gross_side_area and net_side_area:
        g_val_m2 = sorted(gross_side_area, key=lambda x: x[0])[0][1]
        n_val_m2 = sorted(net_side_area, key=lambda x: x[0])[0][1]
        if g_val_m2 >= n_val_m2 > 0:
            rule_metadata["grossAreaM2"] = round(g_val_m2, 4)
            rule_metadata["openingAreaM2"] = round(max(0.0, g_val_m2 - n_val_m2), 4)
    if load_bearing is not None:
        rule_metadata["loadBearing"] = load_bearing
    if exposure is not None:
        rule_metadata["exposure"] = exposure
    if exposure_class is not None:
        rule_metadata["exposureClass"] = exposure_class
    if cover_mm is not None:
        rule_metadata["coverMm"] = cover_mm
    if discipline is not None:
        rule_metadata["discipline"] = discipline
    if expected_qty is not None:
        rule_metadata["expectedQuantity"] = expected_qty
    if layer_thickness_sum > 0:
        rule_metadata["_layerThicknessM"] = layer_thickness_sum
    if nominal_height_m is not None and nominal_height_m > 0:
        rule_metadata["_nominalHeightM"] = nominal_height_m
    if prop_bar_length_m is not None and prop_bar_length_m > 0:
        rule_metadata["_barLengthM"] = prop_bar_length_m
    if calc_mode_unit:
        rule_metadata["_calcModeUnit"] = calc_mode_unit

    return (
        volume_m3,
        round(formwork_m2, 2),
        formwork_basis,
        formwork_note,
        rebar_kg,
        quantity_source,
        source_path,
        confidence,
        status,
        note,
        poz_no,
        poz_source_path,
        rule_metadata,
    )


def extract_rebar_info(
    elem: Any, length_scale: float = 1., area_scale: float = 1., fallback_length_m: Optional[float] = None
) -> Tuple[Optional[float], float, float]:
    """
    For IfcReinforcingBar, extract diameter, weight, and volume from native attributes.
    """
    eff_length_scale = length_scale if (math.isfinite(length_scale) and length_scale > 0) else 1.0
    eff_area_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else (eff_length_scale ** 2)

    diameter = safe_float(getattr(elem, "NominalDiameter", getattr(elem, "NominalBarDiameter", None)))
    length = safe_float(getattr(elem, "BarLength", None))
    length_m = (length * eff_length_scale) if (length is not None and length > 0) else fallback_length_m

    # IfcReinforcingBar can have BarCount / count
    count = safe_float(getattr(elem, "BarCount", 1)) or 1.0

    weight_kg = 0.0
    vol_m3 = 0.0

    if diameter is not None:
        diameter *= eff_length_scale * 1000.
    if diameter and diameter > 0:
        # standard nominal steel formula: (pi * d^2 / 4) * 0.00785 kg/m
        nominal_kg_per_m = (math.pi * (diameter ** 2) / 4.0) * 0.00785
        if length_m and length_m > 0:
            weight_kg = round(nominal_kg_per_m * length_m * count, 1)
            vol_m3 = round(weight_kg / 7850.0, 12)
    elif hasattr(elem, "CrossSectionArea"):
        area = safe_float(getattr(elem, "CrossSectionArea", None))
        if area is not None:
            area *= eff_area_scale * 1e6
        if area and area > 0:
            diameter = round(2.0 * math.sqrt(area / math.pi), 1)
            if length_m and length_m > 0:
                # area in mm2: vol in mm3 = area * length_m * 1000
                vol_m3 = round((area * length_m * 1000.0) / 1e9 * count, 12)
                weight_kg = round(vol_m3 * 7850.0, 1)

    return diameter, weight_kg, vol_m3


def extract_curve_length_m(elem: Any, length_scale: float = 1.0) -> Tuple[float, Optional[int]]:
    """
    Computes total polyline length (in meters) for elements represented by GeometricCurveSet / Curve2D / Curve3D
    (such as Allplan SKIRTINGBOARD IfcCovering elements).
    """
    rep_container = getattr(elem, "Representation", None)
    if not rep_container:
        return 0.0, None
    eff_scale = length_scale if (math.isfinite(length_scale) and length_scale > 0) else 1.0
    total_len = 0.0
    chosen_rep_id: Optional[int] = None

    for rep in getattr(rep_container, "Representations", []) or []:
        for item in getattr(rep, "Items", []) or []:
            if item.is_a("IfcPolyline"):
                pts = [getattr(pt, "Coordinates", None) for pt in (getattr(item, "Points", None) or [])]
                pts = [c for c in pts if c and len(c) >= 2]
                if len(pts) >= 2:
                    chosen_rep_id = rep.id()
                    for i in range(len(pts) - 1):
                        p1, p2 = pts[i], pts[i + 1]
                        dx = (float(p2[0]) - float(p1[0])) * eff_scale
                        dy = (float(p2[1]) - float(p1[1])) * eff_scale
                        dz = ((float(p2[2]) - float(p1[2])) * eff_scale) if (len(p1) > 2 and len(p2) > 2) else 0.0
                        total_len += math.sqrt(dx * dx + dy * dy + dz * dz)

    return total_len, chosen_rep_id


def _compute_profile_2d_area_and_perimeter(prof: Any) -> Tuple[float, float]:
    """
    Computes 2D cross-section area and perimeter (in model length units) for an IfcProfileDef.
    """
    if prof is None:
        return 0.0, 0.0
    if prof.is_a("IfcRectangleProfileDef"):
        x_dim = safe_float(getattr(prof, "XDim", None)) or 0.0
        y_dim = safe_float(getattr(prof, "YDim", None)) or 0.0
        if x_dim > 0 and y_dim > 0:
            return x_dim * y_dim, 2.0 * (x_dim + y_dim)
        return 0.0, 0.0
    if prof.is_a("IfcCircleProfileDef"):
        r = safe_float(getattr(prof, "Radius", None)) or 0.0
        if r > 0:
            return math.pi * r * r, 2.0 * math.pi * r
        return 0.0, 0.0
    if prof.is_a("IfcAsymmetricIShapeProfileDef") or prof.is_a("IfcIShapeProfileDef"):
        overall_depth = safe_float(getattr(prof, "OverallDepth", None)) or 0.0
        web_t = safe_float(getattr(prof, "WebThickness", None)) or 0.0
        bf_w = safe_float(getattr(prof, "BottomFlangeWidth", getattr(prof, "OverallWidth", None))) or 0.0
        bf_t = safe_float(getattr(prof, "BottomFlangeThickness", getattr(prof, "FlangeThickness", None))) or 0.0
        tf_w = safe_float(getattr(prof, "TopFlangeWidth", None)) or bf_w
        tf_t = safe_float(getattr(prof, "TopFlangeThickness", None)) or bf_t
        web_h = max(0.0, overall_depth - bf_t - tf_t)
        area = (bf_w * bf_t) + (tf_w * tf_t) + (web_h * web_t)
        perim = max(0.0, 2.0 * bf_w + 2.0 * tf_w + 2.0 * overall_depth - 2.0 * web_t)
        return max(0.0, area), perim
    if prof.is_a("IfcArbitraryClosedProfileDef"):
        curve = getattr(prof, "OuterCurve", None)
        pts: List[Tuple[float, float]] = []
        if curve is not None:
            if curve.is_a("IfcPolyline"):
                for pt in getattr(curve, "Points", None) or []:
                    coords = getattr(pt, "Coordinates", None)
                    if coords and len(coords) >= 2:
                        pts.append((float(coords[0]), float(coords[1])))
            elif curve.is_a("IfcIndexedPolyCurve"):
                pt_list = getattr(curve, "Points", None)
                coord_list = list(getattr(pt_list, "CoordList", None) or []) if pt_list is not None else []
                if coord_list:
                    segments = getattr(curve, "Segments", None)
                    if segments:
                        for seg in segments:
                            indices = getattr(seg, "wrappedValue", None) or []
                            for idx in indices:
                                i0 = int(idx) - 1
                                if 0 <= i0 < len(coord_list) and len(coord_list[i0]) >= 2:
                                    c = coord_list[i0]
                                    pt2d = (float(c[0]), float(c[1]))
                                    if not pts or pts[-1] != pt2d:
                                        pts.append(pt2d)
                    else:
                        for c in coord_list:
                            if len(c) >= 2:
                                pts.append((float(c[0]), float(c[1])))
        if len(pts) >= 3:
            area2 = 0.0
            perim = 0.0
            n = len(pts)
            for i in range(n):
                x1, y1 = pts[i]
                x2, y2 = pts[(i + 1) % n]
                area2 += x1 * y2 - x2 * y1
                perim += math.hypot(x2 - x1, y2 - y1)
            return abs(area2) * 0.5, perim
    return 0.0, 0.0


def extract_sectioned_solid_geometry(
    elem: Any, length_scale: float = 1.0
) -> Optional[Tuple[float, float, float, float, float, int]]:
    """
    Fallback analytical integration for IFC4X2/IFC4X3 IfcSectionedSolidHorizontal / IfcSectionedSolid
    when OpenCASCADE triangulation does not support the representation directly.
    """
    rep_container = getattr(elem, "Representation", None)
    if not rep_container:
        return None
    eff_scale = length_scale if (math.isfinite(length_scale) and length_scale > 0) else 1.0
    total_vol = 0.0
    total_side = 0.0
    total_end_area = 0.0
    chosen_rep_id: Optional[int] = None

    for rep in getattr(rep_container, "Representations", None) or []:
        for item in getattr(rep, "Items", None) or []:
            if item.is_a("IfcSectionedSolidHorizontal") or item.is_a("IfcSectionedSolid"):
                sections = list(getattr(item, "CrossSections", None) or [])
                positions = list(getattr(item, "CrossSectionPositions", None) or [])
                if len(sections) >= 2 and len(positions) >= len(sections):
                    pts_data = []
                    for sec, pos in zip(sections, positions):
                        dist = safe_float(getattr(pos, "DistanceAlong", None))
                        if dist is None:
                            # Fallback if DistanceAlong is wrapped or OffsetValues
                            dist_attr = getattr(pos, "DistanceAlong", None)
                            dist = safe_float(getattr(dist_attr, "wrappedValue", None) if dist_attr else None)
                        a2d, p2d = _compute_profile_2d_area_and_perimeter(sec)
                        if dist is not None and a2d > 0:
                            pts_data.append((dist * eff_scale, a2d * (eff_scale ** 2), p2d * eff_scale))
                    if len(pts_data) >= 2:
                        chosen_rep_id = rep.id()
                        total_end_area += pts_data[0][1] + pts_data[-1][1]
                        for i in range(len(pts_data) - 1):
                            s1, a1, p1 = pts_data[i]
                            s2, a2, p2 = pts_data[i + 1]
                            ds = abs(s2 - s1)
                            if ds > 0:
                                total_vol += 0.5 * (a1 + a2) * ds
                                total_side += 0.5 * (p1 + p2) * ds

    if total_vol > 0 and chosen_rep_id is not None:
        total_area = total_side + total_end_area
        foot_area = total_side * 0.25
        return (total_vol, total_area, total_side * 0.5, foot_area, total_side, chosen_rep_id)
    return None


def _collect_decomposed_parts(elem: Any, depth: int = 0) -> List[Any]:
    if elem is None or depth > 4:
        return []
    parts: List[Any] = []
    for rel in getattr(elem, "IsDecomposedBy", None) or []:
        for sub in getattr(rel, "RelatedObjects", None) or []:
            sub_rep = getattr(sub, "Representation", None)
            if sub_rep and getattr(sub_rep, "Representations", None):
                parts.append(sub)
            parts.extend(_collect_decomposed_parts(sub, depth + 1))
    return parts


def batch_extract_3d_geometry(
    model: ifcopenshell.file, target_elements: List[Any], length_scale: float = 1.0
) -> Dict[int, Tuple[float, float, float, float, float, int]]:
    """
    Uses IfcOpenShell's multi-threaded C++ geometry iterator to compute exact 3D quantities
    (volume_m3, total_area_m2, side_area_m2, footprint_area_m2, outer_surface_area_m2, rep_id)
    for elements (and decomposed parts) that have 3D representations.
    """
    if not target_elements or ifc_geom is None or ifc_shape is None:
        return {}

    geom_candidates: List[Any] = []
    seen_ids = set()
    parent_to_parts: Dict[int, List[int]] = {}

    for elem in target_elements:
        rep = getattr(elem, "Representation", None)
        if rep and getattr(rep, "Representations", None):
            if elem.id() not in seen_ids:
                seen_ids.add(elem.id())
                geom_candidates.append(elem)
        parts = _collect_decomposed_parts(elem)
        if parts:
            part_ids = []
            for sub in parts:
                part_ids.append(sub.id())
                if sub.id() not in seen_ids:
                    seen_ids.add(sub.id())
                    geom_candidates.append(sub)
            parent_to_parts[elem.id()] = part_ids

    if not geom_candidates:
        return {}

    raw_metrics: Dict[int, Tuple[float, float, float, float, float, int]] = {}
    settings = ifc_geom.settings()
    num_threads = max(1, min(multiprocessing.cpu_count(), 8))

    try:
        iterator = ifc_geom.iterator(settings, model, num_threads, include=geom_candidates)
        if iterator.initialize():
            while True:
                shape = iterator.get()
                sid = int(shape.id)
                geom = shape.geometry
                vol = max(0.0, float(ifc_shape.get_volume(geom) or 0.0))
                area = max(0.0, float(ifc_shape.get_area(geom) or 0.0))
                side = max(0.0, float(ifc_shape.get_side_area(geom) or 0.0))
                foot = max(0.0, float(ifc_shape.get_footprint_area(geom) or 0.0))
                outer = max(0.0, float(ifc_shape.get_outer_surface_area(geom) or 0.0))
                raw_metrics[sid] = (vol, area, side, foot, outer, sid)
                if not iterator.next():
                    break
    except Exception:
        # Fallback to per-element create_shape if batch iterator fails on a specific entity
        for cand in geom_candidates:
            try:
                shape = ifc_geom.create_shape(settings, cand)
                geom = shape.geometry
                vol = max(0.0, float(ifc_shape.get_volume(geom) or 0.0))
                area = max(0.0, float(ifc_shape.get_area(geom) or 0.0))
                side = max(0.0, float(ifc_shape.get_side_area(geom) or 0.0))
                foot = max(0.0, float(ifc_shape.get_footprint_area(geom) or 0.0))
                outer = max(0.0, float(ifc_shape.get_outer_surface_area(geom) or 0.0))
                raw_metrics[cand.id()] = (vol, area, side, foot, outer, cand.id())
            except Exception:
                continue

    for parent_id, part_ids in parent_to_parts.items():
        existing = raw_metrics.get(parent_id)
        if existing is None or existing[0] <= 0.0:
            p_vols = [raw_metrics[pid] for pid in part_ids if pid in raw_metrics and raw_metrics[pid][0] > 0.0]
            if p_vols:
                raw_metrics[parent_id] = (
                    sum(x[0] for x in p_vols),
                    sum(x[1] for x in p_vols),
                    sum(x[2] for x in p_vols),
                    sum(x[3] for x in p_vols),
                    sum(x[4] for x in p_vols),
                    p_vols[0][5],
                )

    for elem in target_elements:
        eid = elem.id()
        existing = raw_metrics.get(eid)
        if existing is None or existing[0] <= 0.0:
            sec_geom = extract_sectioned_solid_geometry(elem, length_scale)
            if sec_geom is not None:
                raw_metrics[eid] = sec_geom

    return raw_metrics


def _find_parent_storey(entity: Any, hops: int = 0) -> Optional[Any]:
    if entity is None or hops > 8:
        return None
    if entity.is_a("IfcBuildingStorey"):
        return entity
    for rel in getattr(entity, "ContainedInStructure", []) or []:
        if rel.is_a("IfcRelContainedInSpatialStructure"):
            st = _find_parent_storey(getattr(rel, "RelatingStructure", None), hops + 1)
            if st is not None:
                return st
    for rel in getattr(entity, "Decomposes", []) or []:
        if rel.is_a("IfcRelAggregates"):
            st = _find_parent_storey(getattr(rel, "RelatingObject", None), hops + 1)
            if st is not None:
                return st
    for rel in getattr(entity, "CoversSpaces", []) or []:
        for sp in getattr(rel, "RelatedSpaces", [getattr(rel, "RelatingSpace", None)]) or []:
            st = _find_parent_storey(sp, hops + 1)
            if st is not None:
                return st
    for rel in getattr(entity, "CoversElements", []) or []:
        st = _find_parent_storey(getattr(rel, "RelatingBuildingElement", None), hops + 1)
        if st is not None:
            return st
    return None


def extract_spatial_storey(elem: Any, length_scale: float = 1.) -> Tuple[str, str, Optional[str]]:
    """
    Returns (storeyName, storeySource, storeySourcePath).
    Traverses direct IfcRelContainedInSpatialStructure as well as IfcSpace / IfcRelAggregates parents.
    """
    eff_length_scale = length_scale if (math.isfinite(length_scale) and length_scale > 0) else 1.0
    first_rel_id: Optional[int] = None
    for rel in getattr(elem, "ContainedInStructure", []) or []:
        if rel.is_a("IfcRelContainedInSpatialStructure"):
            first_rel_id = rel.id()
            break
    if first_rel_id is None:
        for rel in getattr(elem, "Decomposes", []) or []:
            if rel.is_a("IfcRelAggregates"):
                first_rel_id = rel.id()
                break

    structure = _find_parent_storey(elem)
    if structure is not None and structure.is_a("IfcBuildingStorey"):
        s_name = str(getattr(structure, "Name", "") or "").strip()
        elev = safe_float(getattr(structure, "Elevation", None))
        if elev is not None:
            elev_m = round(elev * eff_length_scale, 6)
            formatted_name = f"{s_name} ({elev_m} m)" if s_name else f"Kat ({elev_m} m)"
        else:
            formatted_name = s_name or "Kat"
        rel_prefix = f"#{first_rel_id}" if first_rel_id is not None else f"#{elem.id()}"
        source_path = f"{rel_prefix}/#{structure.id()}:{s_name}"
        return formatted_name, "ifc_spatial", source_path

    return "Kat 1 (Zemin)", "estimate", None


def extract_project_compliance(model: ifcopenshell.file, area_scale: float = 1.0) -> Dict[str, Any]:
    eff_area_scale = area_scale if (math.isfinite(area_scale) and area_scale > 0) else 1.0
    compliance: Dict[str, Any] = {
        "taks": None,
        "kaks": None,
        "cekmeOn": None,
        "cekmeYan": None,
        "cekmeArka": None,
        "emsalDahilM2": None,
        "emsalHaricM2": None,
        "emsalYuzde30M2": None,
        "source": None,
        "sourcePath": None,
    }

    containers = list(model.by_type("IfcSite")) + list(model.by_type("IfcBuilding"))
    found_site_or_bldg = False
    for container in containers:
        if found_site_or_bldg:
            break
        source_type = "ifc_site" if container.is_a("IfcSite") else "ifc_building"
        for rel in getattr(container, "IsDefinedBy", []):
            if not rel.is_a("IfcRelDefinesByProperties"):
                continue
            prop_def = getattr(rel, "RelatingPropertyDefinition", None)
            if not prop_def or not prop_def.is_a("IfcPropertySet"):
                continue
            pset_name = str(getattr(prop_def, "Name", "") or "").lower()
            if pset_name in {"tr_pset_csb", "trepys_parselozellikseti", "trepys_pozozellikseti"}:
                for prop in getattr(prop_def, "HasProperties", []):
                    if not prop.is_a("IfcPropertySingleValue"):
                        continue
                    p_name = str(getattr(prop, "Name", "") or "").lower()
                    nominal_val = getattr(prop, "NominalValue", None)
                    val = safe_float(getattr(nominal_val, "wrappedValue", None) if nominal_val else None)
                    if val is not None:
                        if p_name == "taks":
                            compliance["taks"] = val
                        elif p_name == "kaks":
                            compliance["kaks"] = val
                        elif p_name in {"cekmeon", "cekme_on"}:
                            compliance["cekmeOn"] = val
                        elif p_name in {"cekmeyan", "cekme_yan"}:
                            compliance["cekmeYan"] = val
                        elif p_name in {"cekmearka", "cekme_arka"}:
                            compliance["cekmeArka"] = val

                if any(compliance[k] is not None for k in ("taks", "kaks", "cekmeOn", "cekmeYan", "cekmeArka")):
                    compliance["source"] = source_type
                    compliance["sourcePath"] = f"#{rel.id()}/#{prop_def.id()}:{prop_def.Name}"
                    found_site_or_bldg = True
                    break

    # Scan IfcSpatialZone (IFC4/IFC4X3) and IfcSpace for TREpys_EmsalOzellikSeti (EK-4 Tablo 4.1)
    emsal_entities = []
    try:
        emsal_entities.extend(model.by_type("IfcSpatialZone"))
    except Exception:
        pass
    try:
        emsal_entities.extend(model.by_type("IfcSpace"))
    except Exception:
        pass

    dahil_m2 = 0.0
    haric_m2 = 0.0
    yuzde30_m2 = 0.0
    found_emsal = False

    for zone in emsal_entities:
        emsal_durumu = None
        zone_area = None
        for rel in getattr(zone, "IsDefinedBy", []):
            if not rel.is_a("IfcRelDefinesByProperties"):
                continue
            prop_def = getattr(rel, "RelatingPropertyDefinition", None)
            if not prop_def:
                continue
            pset_name = str(getattr(prop_def, "Name", "") or "").lower()
            if prop_def.is_a("IfcPropertySet") and pset_name in {"trepys_emsalozellikseti", "pset_emsal"}:
                for prop in getattr(prop_def, "HasProperties", []):
                    if not prop.is_a("IfcPropertySingleValue"):
                        continue
                    p_name = str(getattr(prop, "Name", "") or "").lower()
                    nominal_val = getattr(prop, "NominalValue", None)
                    raw_val = getattr(nominal_val, "wrappedValue", None) if nominal_val else None
                    if p_name in {"emsaldurumu", "emsal_durumu"} and raw_val is not None:
                        emsal_durumu = str(raw_val).strip().upper()
                    elif p_name in {"alan", "grossfloorarea", "netfloorarea"} and zone_area is None:
                        val = safe_float(raw_val)
                        if val is not None and val > 0:
                            zone_area = val * quantity_scale(prop, "AREAUNIT", eff_area_scale)
            elif prop_def.is_a("IfcElementQuantity"):
                for qty in getattr(prop_def, "Quantities", []):
                    if qty.is_a("IfcQuantityArea"):
                        q_name = str(getattr(qty, "Name", "") or "").lower()
                        if q_name in {"grossfloorarea", "netfloorarea", "area"}:
                            val = safe_float(getattr(qty, "AreaValue", None))
                            if val is not None and val > 0:
                                zone_area = val * quantity_scale(qty, "AREAUNIT", eff_area_scale)
                                if q_name == "grossfloorarea":
                                    break

        if emsal_durumu and zone_area is not None and zone_area > 0:
            found_emsal = True
            if emsal_durumu in {"DAHIL", "DAHİL", "INCLUDED"}:
                dahil_m2 += zone_area
            elif emsal_durumu in {"HARIC", "HARİÇ", "EXCLUDED"}:
                haric_m2 += zone_area
            elif emsal_durumu in {"DIGER", "DİĞER", "YUZDE30", "YÜZDE30", "%30", "30"}:
                yuzde30_m2 += zone_area

    if found_emsal:
        compliance["emsalDahilM2"] = round(dahil_m2, 2)
        compliance["emsalHaricM2"] = round(haric_m2, 2)
        compliance["emsalYuzde30M2"] = round(yuzde30_m2, 2)

    return compliance


def read_authoring_software(model: Any) -> Dict[str, Any]:
    """IFC başlığı ve IfcApplication kayıtlarından ham kaynak yazılım bilgisini okur.

    Sınıflandırma (Allplan/Revit/Archicad...) bilerek burada yapılmaz; tek kaynak
    src/ifc/authoring-software-diagnostics.ts olmalı. Okunamayan alan None döner.
    """
    originating: Optional[str] = None
    preprocessor: Optional[str] = None
    try:
        header = model.header.file_name
        originating = str(getattr(header, "originating_system", "") or "").strip() or None
        preprocessor = str(getattr(header, "preprocessor_version", "") or "").strip() or None
    except Exception:
        pass
    names: List[str] = []
    try:
        for app in model.by_type("IfcApplication")[:5]:
            name = str(getattr(app, "ApplicationFullName", "") or "").strip()
            if name and name not in names:
                names.append(name)
    except Exception:
        pass
    return {
        "originatingSystem": originating,
        "preprocessorVersion": preprocessor,
        "applicationNames": names,
    }


def extract_ifc(input_path: str, output_path: str, file_name: str) -> None:
    if not os.path.exists(input_path):
        sys.stderr.write(f"IFC_PARSE_FAILED: Input file does not exist: {input_path}\n")
        sys.exit(EXIT_PARSE_FAILED)

    try:
        model = ifcopenshell.open(input_path)
    except Exception as e:
        sys.stderr.write(f"IFC_PARSE_FAILED: Could not open IFC file: {str(e)}\n")
        sys.exit(EXIT_PARSE_FAILED)

    schema = str(model.schema or "").upper()
    if not (schema.startswith("IFC2X3") or schema.startswith("IFC4")):
        sys.stderr.write(f"IFC_SCHEMA_UNSUPPORTED: Unsupported IFC schema: {model.schema}\n")
        sys.exit(EXIT_SCHEMA_UNSUPPORTED)

    length_scale, vol_scale, area_scale = get_unit_scale_factors(model)
    mass_scale = project_unit_scale(model, "MASSUNIT")

    primary_types = [
        "IfcBeam",
        "IfcColumn",
        "IfcSlab",
        "IfcWall",
        "IfcWallStandardCase",
        "IfcWallElementedCase",
        "IfcReinforcingBar",
        "IfcCovering",
    ]

    fallback_types = [
        "IfcFooting",
        "IfcPile",
        "IfcMember",
        "IfcPlate",
        "IfcRoof",
        "IfcStair",
        "IfcStairFlight",
        "IfcRamp",
        "IfcRampFlight",
        "IfcCurtainWall",
        "IfcTendon",
        "IfcReinforcingMesh",
        "IfcBuildingElementPart",
        "IfcBuildingElementProxy",
        "IfcWindow",
        "IfcDoor",
        "IfcFlowSegment",
        "IfcFlowFitting",
        "IfcFlowTerminal",
        "IfcFlowController",
        "IfcFlowMovingDevice",
        "IfcEnergyConversionDevice",
        "IfcDistributionElement",
        "IfcElement",
    ]

    elements_raw = []
    seen_elem_ids = set()
    for t in primary_types:
        try:
            for elem in model.by_type(t):
                eid = elem.id()
                if eid not in seen_elem_ids:
                    seen_elem_ids.add(eid)
                    elements_raw.append(elem)
        except RuntimeError:
            continue

    if not elements_raw:
        for t in fallback_types:
            try:
                for elem in model.by_type(t):
                    if elem.is_a("IfcOpeningElement") or elem.is_a("IfcSpace") or elem.is_a("IfcSpatialStructureElement"):
                        continue
                    eid = elem.id()
                    if eid not in seen_elem_ids:
                        seen_elem_ids.add(eid)
                        elements_raw.append(elem)
            except RuntimeError:
                continue
            if elements_raw:
                break

    if not elements_raw:
        sys.stderr.write("IFC_EMPTY_MODEL: No supported structural entities found in IFC.\n")
        sys.exit(EXIT_EMPTY_MODEL)

    # First pass: extract QTO/PropertySet quantities and collect elements needing 3D geometry fallback
    preliminary_records = []
    elements_needing_geom = []

    for elem in elements_raw:
        raw_type = elem.is_a()
        mapped_type = map_entity_type(raw_type)
        q_res = extract_quantities_and_properties(elem, vol_scale, area_scale, mass_scale, length_scale)
        volume_m3 = q_res[0]
        rule_metadata = q_res[12]

        needs_geom = False
        if mapped_type == "IfcCovering":
            if not rule_metadata.get("areaM2") and volume_m3 <= 0.0:
                needs_geom = True
        elif mapped_type == "IfcReinforcingBar":
            diam, explicit_kg, _ = extract_rebar_info(elem, length_scale, area_scale, rule_metadata.get("_barLengthM"))
            if explicit_kg <= 0.0 and q_res[4] <= 0.0 and volume_m3 <= 0.0:
                needs_geom = True
        else:
            if volume_m3 <= 0.0:
                needs_geom = True

        if needs_geom:
            elements_needing_geom.append(elem)
        preliminary_records.append((elem, mapped_type, q_res))

    geom_metrics_by_id = batch_extract_3d_geometry(model, elements_needing_geom, length_scale)

    parsed_elements: List[Dict[str, Any]] = []
    total_volume_m3 = 0.0
    total_formwork_m2 = 0.0
    total_rebar_kg = 0.0

    beam_count = 0
    beam_volume = 0.0
    column_count = 0
    column_volume = 0.0
    slab_count = 0
    slab_volume = 0.0
    wall_count = 0
    wall_volume = 0.0
    covering_count = 0
    covering_area_m2 = 0.0
    rebar_count = 0
    rebar_by_diameter: Dict[int, Dict[str, float]] = {}

    for elem, mapped_type, q_res in preliminary_records:
        step_id = str(elem.id())
        guid = str(getattr(elem, "GlobalId", f"GUID-{step_id}"))
        name = str(getattr(elem, "Name", "") or "").strip() or f"{mapped_type}_{step_id}"

        storey, storey_source, storey_source_path = extract_spatial_storey(elem, length_scale)

        (
            volume_m3,
            formwork_m2,
            formwork_basis,
            formwork_note,
            rebar_kg,
            quantity_source,
            quantity_source_path,
            confidence,
            status,
            note,
            poz_no,
            poz_source_path,
            rule_metadata,
        ) = q_res

        layer_thickness_m = rule_metadata.pop("_layerThicknessM", None)
        nominal_height_m = rule_metadata.pop("_nominalHeightM", None)
        prop_bar_length_m = rule_metadata.pop("_barLengthM", None)

        # Apply 3D Geometry Fallback when QTO/Pset did not supply quantity
        geom_tuple = geom_metrics_by_id.get(elem.id())
        if geom_tuple is not None:
            g_vol, g_area, g_side, g_foot, g_outer, g_rep_id = geom_tuple
            rep_obj = getattr(elem, "Representation", None)
            rep_step_id = rep_obj.id() if rep_obj else g_rep_id

            if mapped_type == "IfcCovering":
                if not rule_metadata.get("areaM2"):
                    predef = str(getattr(elem, "PredefinedType", "") or "").upper()
                    derived_cov_area = 0.0
                    if layer_thickness_m and layer_thickness_m > 0 and g_vol > 0:
                        derived_cov_area = g_vol / layer_thickness_m
                    elif predef in {"FLOORING", "CEILING"} and g_foot > 0:
                        derived_cov_area = g_foot
                    elif g_side > 0 and g_side >= g_foot:
                        derived_cov_area = g_side
                    elif g_foot > 0:
                        derived_cov_area = g_foot
                    elif g_area > 0:
                        derived_cov_area = g_area / 2.0

                    if derived_cov_area > 0:
                        rule_metadata["areaM2"] = round(derived_cov_area, 6)
                        if g_vol > 0 and volume_m3 <= 0:
                            volume_m3 = round(g_vol, 12)
                        quantity_source = "property"
                        quantity_source_path = f"#{step_id}/#{rep_step_id}:IfcShapeRepresentation/GeometryArea"
                        confidence = 0.85
                        status = "review"
                        note = "IfcOpenShell 3B katı model geometrisinden kaplama alanı hesaplandı; teknik inceleme önerilir."
            elif mapped_type == "IfcReinforcingBar":
                if g_vol > 0 and rebar_kg <= 0:
                    volume_m3 = round(g_vol, 12)
                    rebar_kg = round(g_vol * 7850.0, 1)
                    quantity_source = "property"
                    quantity_source_path = f"#{step_id}/#{rep_step_id}:IfcShapeRepresentation/GeometryVolume"
                    confidence = 0.85
                    status = "review"
            else:
                if volume_m3 <= 0 and g_vol > 0:
                    volume_m3 = round(g_vol, 12)
                    quantity_source = "property"
                    quantity_source_path = f"#{step_id}/#{rep_step_id}:IfcShapeRepresentation/GeometryVolume"
                    confidence = 0.85
                    status = "review"
                    note = "IfcOpenShell 3B katı model geometrisinden net hacim hesaplandı; teknik inceleme önerilir."

                if formwork_m2 <= 0:
                    if mapped_type == "IfcSlab" and g_foot > 0:
                        formwork_m2 = round(g_foot, 2)
                        formwork_basis = "derived"
                        formwork_note = "3B geometri taban alanından (FootprintArea) türetildi; kenar kalıbı dahil değil."
                    elif mapped_type == "IfcWall" and (g_side > 0 or g_area > 0):
                        side_est = g_side if g_side > 0 else (g_area / 2.0)
                        formwork_m2 = round(2.0 * side_est, 2)
                        formwork_basis = "derived"
                        formwork_note = "3B geometri yan yüzey alanından (2 × SideArea) türetildi."
                    elif mapped_type == "IfcColumn" and (g_outer > 0 or g_side > 0):
                        col_area = g_outer if g_outer > 0 else g_side
                        formwork_m2 = round(col_area, 2)
                        formwork_basis = "derived"
                        formwork_note = "3B geometri dış yüzey alanından (OuterSurfaceArea) türetildi."

        # Curve fallback and linear length (mtül) for SKIRTINGBOARD / Süpürgelik coverings
        calc_mode_unit = rule_metadata.pop("_calcModeUnit", None)
        cov_predef = str(rule_metadata.get("coveringPredefinedType") or getattr(elem, "PredefinedType", "") or "").upper()
        if mapped_type == "IfcCovering":
            curve_len_m = 0.0
            curve_rep_id = None
            if not rule_metadata.get("areaM2") and volume_m3 <= 0:
                curve_len_m, curve_rep_id = extract_curve_length_m(elem, length_scale)
                if curve_len_m > 0:
                    h_m = nominal_height_m if (nominal_height_m and nominal_height_m > 0) else 0.06
                    t_m = layer_thickness_m if (layer_thickness_m and layer_thickness_m > 0) else 0.01
                    cov_area = round(curve_len_m * h_m, 6)
                    rule_metadata["areaM2"] = cov_area
                    volume_m3 = round(cov_area * t_m, 12)
                    quantity_source = "property"
                    quantity_source_path = f"#{step_id}/#{curve_rep_id or step_id}:IfcShapeRepresentation/CurveLengthArea"
                    confidence = 0.85
                    status = "review"
                    note = f"Süpürgelik/profil eğri uzunluğu ({round(curve_len_m, 2)} m × {h_m} m yükseklik) üzerinden hesaplandı."

            if cov_predef == "SKIRTINGBOARD" or calc_mode_unit in {"m", "mt", "mtül", "mtul"} or "süpürgelik" in name.lower():
                if curve_len_m <= 0:
                    curve_len_m, _ = extract_curve_length_m(elem, length_scale)
                h_m = nominal_height_m if (nominal_height_m and nominal_height_m > 0) else 0.06
                area_val = float(rule_metadata.get("areaM2") or 0.0)
                derived_len_m = curve_len_m if curve_len_m > 0 else (area_val / h_m if (area_val > 0 and h_m > 0) else 0.0)
                if derived_len_m > 0:
                    rule_metadata["lengthM"] = round(derived_len_m, 4)

            # Resolve parent IfcSpace and IfcZone for room-level Green Book (Yeşil Defter) traceability
            try:
                for rel in getattr(elem, "ContainedInStructure", None) or []:
                    parent = getattr(rel, "RelatingStructure", None)
                    if parent and parent.is_a("IfcSpace"):
                        sp_code = str(getattr(parent, "Name", "") or "").strip()
                        sp_name = str(getattr(parent, "LongName", "") or "").strip()
                        if sp_code:
                            rule_metadata["spaceCode"] = sp_code
                        if sp_name:
                            rule_metadata["spaceName"] = sp_name
                        for assign_rel in getattr(parent, "HasAssignments", None) or []:
                            grp = getattr(assign_rel, "RelatingGroup", None)
                            if grp and grp.is_a("IfcZone"):
                                zn = str(getattr(grp, "Name", "") or getattr(grp, "LongName", "") or "").strip()
                                if zn:
                                    rule_metadata["zoneName"] = zn
                                    break
                        break
            except Exception:
                pass

        rebar_diameter_mm = None
        if mapped_type == "IfcReinforcingBar":
            diam, explicit_kg, explicit_vol = extract_rebar_info(elem, length_scale, area_scale, prop_bar_length_m)
            if diam and diam > 0:
                rebar_diameter_mm = int(round(diam))
            if explicit_kg > 0:
                rebar_kg = explicit_kg
                volume_m3 = explicit_vol
                quantity_source = "property"
                if not quantity_source_path:
                    quantity_source_path = f"#{step_id}:IfcReinforcingBar/NominalAttributes"
            elif rebar_kg > 0 and volume_m3 <= 0:
                volume_m3 = round(rebar_kg / 7850.0, 12)
                if quantity_source == "estimate":
                    quantity_source = "property"
                    quantity_source_path = f"#{step_id}:IfcReinforcingBar/WeightProperty"
            storey = "Genel Donatı"

        # Totals and counts
        total_volume_m3 += volume_m3
        total_formwork_m2 += formwork_m2
        total_rebar_kg += rebar_kg

        if mapped_type == "IfcBeam":
            beam_count += 1
            beam_volume += volume_m3
        elif mapped_type == "IfcColumn":
            column_count += 1
            column_volume += volume_m3
        elif mapped_type == "IfcSlab":
            slab_count += 1
            slab_volume += volume_m3
        elif mapped_type == "IfcWall":
            wall_count += 1
            wall_volume += volume_m3
        elif mapped_type == "IfcCovering":
            covering_count += 1
            covering_area_m2 += float(rule_metadata.get("areaM2") or 0.0)
        elif mapped_type == "IfcReinforcingBar":
            rebar_count += 1
            if rebar_diameter_mm and rebar_kg > 0:
                if rebar_diameter_mm not in rebar_by_diameter:
                    rebar_by_diameter[rebar_diameter_mm] = {"lengthM": 0.0, "weightKg": 0.0}
                rebar_by_diameter[rebar_diameter_mm]["weightKg"] = round(
                    rebar_by_diameter[rebar_diameter_mm]["weightKg"] + rebar_kg, 1
                )
                nom_kg_m = (math.pi * (rebar_diameter_mm ** 2) / 4.0) * 0.00785
                rebar_by_diameter[rebar_diameter_mm]["lengthM"] = round(
                    rebar_by_diameter[rebar_diameter_mm]["lengthM"] + (rebar_kg / nom_kg_m), 1
                )

        review_notes = [formwork_note] if formwork_note else []

        el_dict: Dict[str, Any] = {
            "id": step_id,
            "guid": guid,
            "type": mapped_type,
            "name": name,
            "storey": storey,
            "storeySource": storey_source,
            "volumeM3": round(volume_m3, 12),
            "formworkM2": round(formwork_m2, 2),
            "formworkBasis": formwork_basis,
            "rebarKg": round(rebar_kg, 1),
            "quantitySource": quantity_source,
            "smartCheckStatus": status,
        }
        if formwork_note:
            el_dict["formworkNote"] = formwork_note
        if review_notes:
            el_dict["reviewNotes"] = review_notes
        if storey_source_path:
            el_dict["storeySourcePath"] = storey_source_path
        if rebar_diameter_mm is not None:
            el_dict["rebarDiameterMm"] = rebar_diameter_mm
        if quantity_source_path:
            el_dict["quantitySourcePath"] = quantity_source_path
        if confidence is not None:
            el_dict["quantityConfidence"] = confidence
        if note:
            el_dict["smartCheckNote"] = note
        if poz_no:
            el_dict["pozNo"] = poz_no
        if poz_source_path:
            el_dict["pozNoSourcePath"] = poz_source_path
        if rule_metadata:
            el_dict.update(rule_metadata)

        parsed_elements.append(el_dict)

    compliance = extract_project_compliance(model, area_scale)

    # Extract Apartment & Independent Unit Schedule (IfcZone + IfcSpace)
    apartment_schedule: List[Dict[str, Any]] = []
    try:
        parsed_by_id: Dict[str, Dict[str, Any]] = {str(el["id"]): el for el in parsed_elements}
        zones_by_code: Dict[str, List[Any]] = {}
        for zn in model.by_type("IfcZone") or []:
            z_code = str(getattr(zn, "Name", "") or getattr(zn, "LongName", "") or "").strip()
            if z_code:
                zones_by_code.setdefault(z_code, []).append(zn)

        for z_code, zn_list in zones_by_code.items():
            rooms: List[Dict[str, Any]] = []
            seen_sp_ids = set()
            net_sweepable_m2 = 0.0
            balcony_m2 = 0.0
            storey_label = ""
            for zn in zn_list:
                for rel in getattr(zn, "IsGroupedBy", None) or []:
                    for sp in getattr(rel, "RelatedObjects", None) or []:
                        if not sp or not sp.is_a("IfcSpace") or sp.id() in seen_sp_ids:
                            continue
                        seen_sp_ids.add(sp.id())
                        sp_code = str(getattr(sp, "Name", "") or "").strip()
                        sp_name = str(getattr(sp, "LongName", "") or sp_code).strip()
                        sp_storey = ""
                        sp_area = 0.0
                        floor_finish = ""
                        for c_rel in getattr(sp, "ContainsElements", None) or []:
                            for ce in getattr(c_rel, "RelatedElements", None) or []:
                                if ce and ce.is_a("IfcCovering") and str(getattr(ce, "PredefinedType", "") or "").upper() == "FLOORING":
                                    parsed_ce = parsed_by_id.get(str(ce.id()))
                                    if parsed_ce:
                                        c_area = safe_float(parsed_ce.get("areaM2", 0.0))
                                        if c_area > 0 and sp_area <= 0:
                                            sp_area = c_area
                                        if not sp_storey:
                                            sp_storey = str(parsed_ce.get("storey") or "")
                                        layers = parsed_ce.get("materialLayers")
                                        if isinstance(layers, list) and layers:
                                            floor_finish = " + ".join(str(x) for x in layers)
                                        elif not floor_finish:
                                            floor_finish = str(parsed_ce.get("name") or "").strip()
                                    break
                        if sp_storey and sp_storey != "Belirsiz Kat" and not storey_label:
                            storey_label = sp_storey
                        if sp_area > 0:
                            is_balcony = any(k in sp_name.upper() for k in ("BALKON", "TERAS", "LOCA"))
                            if is_balcony:
                                balcony_m2 += sp_area
                            else:
                                net_sweepable_m2 += sp_area
                            rooms.append({
                                "code": sp_code,
                                "name": sp_name,
                                "storey": sp_storey,
                                "netAreaM2": round(sp_area, 2),
                                "floorFinish": floor_finish or "Seramik / Parke",
                                "isBalcony": is_balcony,
                            })
            if rooms:
                rooms.sort(key=lambda r: r["code"])
                total_unit_net = round(net_sweepable_m2 + balcony_m2, 2)
                is_residential = z_code.upper().startswith("D") and z_code[1:].isdigit()
                # Brüt alan (duvar kalınlığı, ortak alan payı) IFC mahal cetvelinde bulunmaz; çarpanla
                # üretilmez. Kullanıcı katsayısı arayüzde uygulanır.
                unit_gross = None
                general_gross = None
                apartment_schedule.append({
                    "unitCode": z_code,
                    "unitLabel": f"Daire {z_code}" if is_residential else ("Ortak Alanlar (Sirkülasyon)" if z_code == "OAL" else ("Bodrum Ortak & Sığınak" if z_code == "BDR" else z_code)),
                    "storey": storey_label or "Kat Planı",
                    "roomCount": len(rooms),
                    "netSweepableM2": round(net_sweepable_m2, 2),
                    "balconyM2": round(balcony_m2, 2),
                    "totalNetM2": total_unit_net,
                    "unitGrossM2": unit_gross,
                    "generalGrossM2": general_gross,
                    "rooms": rooms,
                })
        apartment_schedule.sort(key=lambda u: (0 if u["unitCode"].startswith("D") else 1, u["unitCode"]))
    except Exception:
        pass

    summary = {
        "parseStatus": "succeeded",
        "extractionMode": "demo_estimate",
        "quantitySource": "qto" if any(el["quantitySource"] == "qto" for el in parsed_elements) else "property" if any(el["quantitySource"] == "property" for el in parsed_elements) else "estimate",
        "quoteTransferStatus": "needs_review",
        "warnings": [
            "IfcOpenShell parser extracted verified QTO, PropertySet, and 3D representation quantities.",
            "Quantities marked as estimate have no explicit QTO/Pset/3D solid in the model and require manual takeoff.",
        ],
        "unsupportedReasons": [],
        "totalElements": len(parsed_elements),
        "totalVolumeM3": round(total_volume_m3, 2),
        "totalFormworkM2": round(total_formwork_m2, 2),
        "totalRebarKg": round(total_rebar_kg, 1),
        "totalRebarTon": round(total_rebar_kg / 1000.0, 2),
        "beamCount": beam_count,
        "beamVolumeM3": round(beam_volume, 2),
        "columnCount": column_count,
        "columnVolumeM3": round(column_volume, 2),
        "slabCount": slab_count,
        "slabVolumeM3": round(slab_volume, 2),
        "wallCount": wall_count,
        "wallVolumeM3": round(wall_volume, 2),
        "coveringCount": covering_count,
        "coveringAreaM2": round(covering_area_m2, 2),
        "rebarCount": rebar_count,
        "rebarByDiameter": rebar_by_diameter,
        "trPsetCsb": compliance,
        "apartmentSchedule": apartment_schedule,
        "elementsWithPozNoCount": sum(1 for el in parsed_elements if el.get("pozNo")),
        "elementsMissingPozNoCount": sum(1 for el in parsed_elements if not el.get("pozNo")),
        "authoringSoftwareRaw": read_authoring_software(model),
    }

    result = {
        "elements": parsed_elements,
        "summary": summary,
    }

    # Ensure output parent dir exists
    out_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(out_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    sys.exit(EXIT_SUCCESS)


def main():
    parser = argparse.ArgumentParser(description="TeklifPro IfcOpenShell CLI Extractor")
    parser.add_argument("--input", required=True, help="Input IFC file path")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--file-name", required=False, default="", help="Original file name")

    args = parser.parse_args()
    extract_ifc(args.input, args.output, args.file_name)


if __name__ == "__main__":
    main()
