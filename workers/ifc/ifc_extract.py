#!/usr/bin/env python3
"""
ifc_extract.py

Production-ready IFC extractor using IfcOpenShell.
Extracts structural elements (IfcBeam, IfcColumn, IfcSlab, IfcWall, IfcReinforcingBar),
their spatial containment (storeys), QTO/PropertySet quantities, and TR Pset / ÇŞB compliance.

Adheres strictly to TeklifPro QTO priority:
1. Standard QTO (IfcElementQuantity: NetVolume, GrossVolume, Volume, etc.)
2. Approved exporter PropertySets (AllplanAttributes, Pset_*Common: Hacim, Net Hacim, etc.)
3. No geometry guessing; NO step-ID based synthetic formulas.
"""

import argparse
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

try:
    import ifcopenshell
except ImportError:
    sys.stderr.write("ERROR: ifcopenshell module not found. Please install requirements.\n")
    sys.exit(1)


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
}

APPROVED_PROPERTY_SETS = {
    "allplanattributes",
    "pset_slabcommon",
    "pset_beamcommon",
    "pset_columncommon",
    "pset_wallcommon",
    "qto_slabbasequantities",
    "qto_beambasequantities",
    "qto_columnbasequantities",
    "qto_wallbasequantities",
}


def safe_float(val: Any) -> Optional[float]:
    if val is None:
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


def extract_quantities_and_properties(
    elem: Any, vol_scale: float, area_scale: float, mass_scale: float = 1.
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
]:
    raw_type = elem.is_a()
    elem_type = "IfcWall" if raw_type == "IfcWallStandardCase" else raw_type

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

    # Track area quantities with set priority for formwork derivation
    explicit_formwork: List[Tuple[int, float, str]] = []
    net_area: List[Tuple[int, float, str]] = []
    gross_area: List[Tuple[int, float, str]] = []
    net_side_area: List[Tuple[int, float, str]] = []
    gross_side_area: List[Tuple[int, float, str]] = []
    outer_surface_area: List[Tuple[int, float, str]] = []

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
            for qty in getattr(prop_def, "Quantities", []):
                qty_id = qty.id()
                qty_name = str(getattr(qty, "Name", "") or "")
                qty_name_lower = qty_name.lower()
                source_path_item = f"#{rel_id}/#{pset_id}/#{qty_id}:{pset_name}/{qty_name}"

                if qty.is_a("IfcQuantityVolume") and qty_name_lower in APPROVED_VOLUME_QTY_NAMES:
                    val = safe_float(getattr(qty, "VolumeValue", None))
                    if val is not None and val > 0:
                        volume_candidates.append((0 if "net" in qty_name_lower else 1, rank, source_path_item, val * quantity_scale(qty, "VOLUMEUNIT", vol_scale)))

                elif qty.is_a("IfcQuantityArea"):
                    val = safe_float(getattr(qty, "AreaValue", None))
                    if val is not None and val > 0:
                        scaled_area = val * quantity_scale(qty, "AREAUNIT", area_scale)
                        if qty_name_lower in EXPLICIT_FORMWORK_QTY_NAMES:
                            explicit_formwork.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "netarea":
                            net_area.append((rank, scaled_area, source_path_item))
                        elif qty_name_lower == "grossarea":
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

        # Handle IfcPropertySet
        elif prop_def.is_a("IfcPropertySet"):
            for prop in getattr(prop_def, "HasProperties", []):
                if not prop.is_a("IfcPropertySingleValue"):
                    continue
                p_id = prop.id()
                p_name = str(getattr(prop, "Name", "") or "")
                p_name_lower = p_name.lower()
                nominal_val = getattr(prop, "NominalValue", None)
                wrapped_val = getattr(nominal_val, "wrappedValue", None) if nominal_val else None
                source_path_item = f"#{rel_id}/#{pset_id}/#{p_id}:{pset_name}/{p_name}"

                # Poz No detection
                if p_name_lower in {"pozno", "poz_no", "csbpozno", "csb_pozno", "pozisyonno"}:
                    if wrapped_val:
                        poz_no = str(wrapped_val).strip()
                        poz_source_path = source_path_item

                # Property volume/area/weight
                is_approved = any(pset_name_lower.startswith(prefix) for prefix in APPROVED_PROPERTY_SETS)
                if is_approved:
                    if p_name_lower in APPROVED_VOLUME_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            property_candidates.append((0 if "net" in p_name_lower else 1, rank, source_path_item, val * quantity_scale(prop, "VOLUMEUNIT", vol_scale)))
                    elif p_name_lower in EXPLICIT_FORMWORK_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            explicit_formwork.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower == "netarea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            net_area.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower == "grossarea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            gross_area.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower == "netsidearea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            net_side_area.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower == "grosssidearea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            gross_side_area.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower == "outersurfacearea":
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            outer_surface_area.append((rank, val * quantity_scale(prop, "AREAUNIT", area_scale), source_path_item))
                    elif p_name_lower in APPROVED_WEIGHT_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            prop_weight = val * quantity_scale(prop, "MASSUNIT", mass_scale)

    if volume_candidates:
        selected = sorted(volume_candidates)[0]
        qto_volume, qto_source_path = selected[3], selected[2]
        qto_conf = .95 if selected[0] == 0 else .9
    if property_candidates:
        selected = sorted(property_candidates)[0]
        prop_volume, prop_source_path = selected[3], selected[2]

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
    note = "Eurocode 2 & TS 708 donatı ve hacim standartlarına uyumlu"

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
        rebar_kg = 0.0
        quantity_source = "estimate"
        source_path = None
        confidence = 0.1
        status = "review"
        note = "QTO veya PropertySet metrajı bulunamadı. Geometrik veya manuel metraj girişi gereklidir."

    candidates = volume_candidates + property_candidates
    if candidates and any(abs(c[3] - volume_m3) > max(1e-8, abs(volume_m3) * 1e-6) for c in candidates):
        note += " | IFC_QUANTITY_CONFLICT: " + "; ".join(f"{c[2]}={c[3]:.12g} m3" for c in sorted(candidates))
    if formwork_note:
        note = f"{note} | {formwork_note}" if note else formwork_note

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
    )


def extract_rebar_info(elem: Any, length_scale: float = 1., area_scale: float = 1.) -> Tuple[Optional[float], float, float]:
    """
    For IfcReinforcingBar, extract diameter, weight, and volume from native attributes.
    """
    diameter = safe_float(getattr(elem, "NominalDiameter", getattr(elem, "NominalBarDiameter", None)))
    length = safe_float(getattr(elem, "BarLength", None))
    
    # IfcReinforcingBar can have BarCount / count
    count = safe_float(getattr(elem, "BarCount", 1)) or 1.0

    weight_kg = 0.0
    vol_m3 = 0.0

    if diameter is not None:
        diameter *= length_scale * 1000.
    if diameter and diameter > 0:
        # standard nominal steel formula: (pi * d^2 / 4) * 0.00785 kg/m
        nominal_kg_per_m = (math.pi * (diameter ** 2) / 4.0) * 0.00785
        if length and length > 0:
            length_m = length * length_scale  # normalize mm to m if large
            weight_kg = round(nominal_kg_per_m * length_m * count, 1)
            vol_m3 = round(weight_kg / 7850.0, 12)
    elif hasattr(elem, "CrossSectionArea"):
        area = safe_float(getattr(elem, "CrossSectionArea", None))
        if area is not None:
            area *= area_scale * 1e6
        if area and area > 0:
            diameter = round(2.0 * math.sqrt(area / math.pi), 1)
            if length and length > 0:
                length_m = length * length_scale
                # area in mm2: vol in mm3 = area * length_m * 1000
                vol_m3 = round((area * length_m * 1000.0) / 1e9 * count, 12)
                weight_kg = round(vol_m3 * 7850.0, 1)

    return diameter, weight_kg, vol_m3


def extract_spatial_storey(elem: Any, length_scale: float = 1.) -> Tuple[str, str, Optional[str]]:
    """
    Returns (storeyName, storeySource, storeySourcePath)
    """
    for rel in getattr(elem, "ContainedInStructure", []):
        if rel.is_a("IfcRelContainedInSpatialStructure"):
            structure = getattr(rel, "RelatingStructure", None)
            if structure and structure.is_a("IfcBuildingStorey"):
                s_name = str(getattr(structure, "Name", "") or "").strip()
                elev = safe_float(getattr(structure, "Elevation", None))
                if elev is not None:
                    elev_m = round(elev * length_scale, 6)
                    formatted_name = f"{s_name} ({elev_m} m)" if s_name else f"Kat ({elev_m} m)"
                else:
                    formatted_name = s_name or "Kat"
                source_path = f"#{rel.id()}/#{structure.id()}:{s_name}"
                return formatted_name, "ifc_spatial", source_path

    return "Kat 1 (Zemin)", "estimate", None


def extract_project_compliance(model: ifcopenshell.file) -> Dict[str, Any]:
    compliance: Dict[str, Any] = {
        "taks": None,
        "kaks": None,
        "cekmeOn": None,
        "cekmeYan": None,
        "cekmeArka": None,
        "source": None,
        "sourcePath": None,
    }

    containers = list(model.by_type("IfcSite")) + list(model.by_type("IfcBuilding"))
    for container in containers:
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
                
                compliance["source"] = source_type
                compliance["sourcePath"] = f"#{rel.id()}/#{prop_def.id()}:{prop_def.Name}"
                if any(v is not None for k, v in compliance.items() if k not in {"source", "sourcePath"}):
                    return compliance

    return compliance


def extract_ifc(input_path: str, output_path: str, file_name: str) -> None:
    if not os.path.exists(input_path):
        sys.stderr.write(f"IFC_PARSE_FAILED: Input file does not exist: {input_path}\n")
        sys.exit(EXIT_PARSE_FAILED)

    try:
        model = ifcopenshell.open(input_path)
    except Exception as e:
        sys.stderr.write(f"IFC_PARSE_FAILED: Could not open IFC file: {str(e)}\n")
        sys.exit(EXIT_PARSE_FAILED)

    schema = model.schema
    if schema not in {"IFC2X3", "IFC4", "IFC4X3"}:
        sys.stderr.write(f"IFC_SCHEMA_UNSUPPORTED: Unsupported IFC schema: {schema}\n")
        sys.exit(EXIT_SCHEMA_UNSUPPORTED)

    length_scale, vol_scale, area_scale = get_unit_scale_factors(model)
    mass_scale = project_unit_scale(model, "MASSUNIT")

    target_types = [
        "IfcBeam",
        "IfcColumn",
        "IfcSlab",
        "IfcWall",
        "IfcWallStandardCase",
        "IfcReinforcingBar",
    ]

    elements_raw = []
    for t in target_types:
        elements_raw.extend(model.by_type(t))

    if not elements_raw:
        sys.stderr.write("IFC_EMPTY_MODEL: No supported structural entities found in IFC.\n")
        sys.exit(EXIT_EMPTY_MODEL)

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
    rebar_count = 0
    rebar_by_diameter: Dict[int, Dict[str, float]] = {}

    for elem in elements_raw:
        step_id = str(elem.id())
        guid = str(getattr(elem, "GlobalId", f"GUID-{step_id}"))
        raw_type = elem.is_a()
        mapped_type = "IfcWall" if raw_type == "IfcWallStandardCase" else raw_type
        name = str(getattr(elem, "Name", "") or f"{mapped_type}_{step_id}")

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
        ) = extract_quantities_and_properties(elem, vol_scale, area_scale, mass_scale)

        rebar_diameter_mm = None
        if mapped_type == "IfcReinforcingBar":
            diam, explicit_kg, explicit_vol = extract_rebar_info(elem, length_scale, area_scale)
            if explicit_kg > 0:
                rebar_kg = explicit_kg
                volume_m3 = explicit_vol
                quantity_source = "property"
                rebar_diameter_mm = int(diam) if diam else None
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
        elif mapped_type == "IfcReinforcingBar":
            rebar_count += 1
            if rebar_diameter_mm:
                if rebar_diameter_mm not in rebar_by_diameter:
                    rebar_by_diameter[rebar_diameter_mm] = {"lengthM": 0.0, "weightKg": 0.0}
                rebar_by_diameter[rebar_diameter_mm]["weightKg"] += rebar_kg
                nom_kg_m = (math.pi * (rebar_diameter_mm ** 2) / 4.0) * 0.00785
                rebar_by_diameter[rebar_diameter_mm]["lengthM"] += round(rebar_kg / nom_kg_m, 1)

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

        parsed_elements.append(el_dict)

    compliance = extract_project_compliance(model)

    summary = {
        "parseStatus": "succeeded",
        "extractionMode": "demo_estimate",
        "quantitySource": "qto" if any(el["quantitySource"] == "qto" for el in parsed_elements) else "property" if any(el["quantitySource"] == "property" for el in parsed_elements) else "estimate",
        "quoteTransferStatus": "needs_review",
        "warnings": [
            "IfcOpenShell parser extracted verified QTO/Pset quantities without geometric simulation.",
            "Quantities marked as estimate have no explicit QTO/Pset in the model and require manual takeoff.",
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
        "rebarCount": rebar_count,
        "rebarByDiameter": rebar_by_diameter,
        "trPsetCsb": compliance,
        "elementsWithPozNoCount": sum(1 for el in parsed_elements if el.get("pozNo")),
        "elementsMissingPozNoCount": sum(1 for el in parsed_elements if not el.get("pozNo")),
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
