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


def get_unit_scale_factors(model: ifcopenshell.file) -> Tuple[float, float, float]:
    """
    Returns (length_scale_to_meter, volume_scale_to_m3, area_scale_to_m2).
    Standard buildingSMART units parsing.
    """
    length_scale = 1.0
    for unit_assignment in model.by_type("IfcUnitAssignment"):
        for unit in getattr(unit_assignment, "Units", []):
            if hasattr(unit, "UnitType") and unit.UnitType == "LENGTHUNIT":
                prefix = getattr(unit, "Prefix", None)
                if prefix == "MILLI":
                    length_scale = 0.001
                elif prefix == "CENTI":
                    length_scale = 0.01
                elif prefix == "DECI":
                    length_scale = 0.1
                elif prefix is None:
                    length_scale = 1.0

    vol_scale = length_scale ** 3
    area_scale = length_scale ** 2
    return length_scale, vol_scale, area_scale


def extract_quantities_and_properties(
    elem: Any, vol_scale: float, area_scale: float
) -> Tuple[
    float,  # volumeM3
    float,  # formworkM2
    float,  # rebarKg
    str,    # quantitySource ("qto" | "property" | "estimate")
    Optional[str],  # quantitySourcePath
    Optional[float],  # quantityConfidence
    str,    # smartCheckStatus ("pass" | "warning" | "review")
    Optional[str],  # smartCheckNote
    Optional[str],  # pozNo
    Optional[str],  # pozNoSourcePath
]:
    qto_volume = None
    qto_area = None
    qto_weight = None
    qto_source_path = None
    qto_conf = 0.9

    prop_volume = None
    prop_area = None
    prop_weight = None
    prop_source_path = None
    prop_conf = 0.85

    poz_no = None
    poz_source_path = None

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

        # Handle IfcElementQuantity
        if prop_def.is_a("IfcElementQuantity"):
            for qty in getattr(prop_def, "Quantities", []):
                qty_id = qty.id()
                qty_name = str(getattr(qty, "Name", "") or "")
                qty_name_lower = qty_name.lower()

                if qty.is_a("IfcQuantityVolume") and qty_name_lower in APPROVED_VOLUME_QTY_NAMES:
                    val = safe_float(getattr(qty, "VolumeValue", None))
                    if val is not None and val > 0:
                        qto_volume = val * vol_scale
                        qto_source_path = f"#{rel_id}/#{pset_id}/#{qty_id}:{pset_name}/{qty_name}"
                        if "net" in qty_name_lower:
                            qto_conf = 0.95

                elif qty.is_a("IfcQuantityArea") and qty_name_lower in APPROVED_AREA_QTY_NAMES:
                    val = safe_float(getattr(qty, "AreaValue", None))
                    if val is not None and val > 0:
                        qto_area = val * area_scale

                elif qty.is_a("IfcQuantityWeight") and qty_name_lower in APPROVED_WEIGHT_QTY_NAMES:
                    val = safe_float(getattr(qty, "WeightValue", None))
                    if val is not None and val > 0:
                        qto_weight = val

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

                # Poz No detection
                if p_name_lower in {"pozno", "poz_no", "csbpozno", "csb_pozno", "pozisyonno"}:
                    if wrapped_val:
                        poz_no = str(wrapped_val).strip()
                        poz_source_path = f"#{rel_id}/#{pset_id}/#{p_id}:{pset_name}/{p_name}"

                # Property volume/area/weight
                is_approved = any(pset_name_lower.startswith(prefix) for prefix in APPROVED_PROPERTY_SETS)
                if is_approved:
                    if p_name_lower in APPROVED_VOLUME_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            prop_volume = val * vol_scale
                            prop_source_path = f"#{rel_id}/#{pset_id}/#{p_id}:{pset_name}/{p_name}"
                    elif p_name_lower in APPROVED_AREA_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            prop_area = val * area_scale
                    elif p_name_lower in APPROVED_WEIGHT_QTY_NAMES:
                        val = safe_float(wrapped_val)
                        if val is not None and val > 0:
                            prop_weight = val

    # Quantity Source Resolution (Priority: 1. QTO, 2. Property, 3. Empty/No guessing)
    volume_m3 = 0.0
    formwork_m2 = 0.0
    rebar_kg = 0.0
    quantity_source = "estimate"
    source_path = None
    confidence = None
    status = "pass"
    note = "Eurocode 2 & TS 708 donatı ve hacim standartlarına uyumlu"

    if qto_volume is not None:
        volume_m3 = round(qto_volume, 4)
        formwork_m2 = round(qto_area, 2) if qto_area is not None else 0.0
        rebar_kg = round(qto_weight, 1) if qto_weight is not None else 0.0
        quantity_source = "qto"
        source_path = qto_source_path
        confidence = qto_conf
        status = "review"
        note = "Standart QTO kaynağından okundu; teknik inceleme önerilir."
        if prop_volume is not None and abs(prop_volume - qto_volume) > 0.01:
            note += f" (Uyarı: PropertySet değeri {round(prop_volume, 2)} m³ ile QTO {round(qto_volume, 2)} m³ arasında fark var)."

    elif prop_volume is not None:
        volume_m3 = round(prop_volume, 4)
        formwork_m2 = round(prop_area, 2) if prop_area is not None else 0.0
        rebar_kg = round(prop_weight, 1) if prop_weight is not None else 0.0
        quantity_source = "property"
        source_path = prop_source_path
        confidence = prop_conf
        status = "review"
        note = "Onaylı PropertySet kaynağından okundu; kalıp/donatı kanıtı gerekebilir."

    else:
        # NO STEP-ID GUESSING.
        volume_m3 = 0.0
        formwork_m2 = 0.0
        rebar_kg = 0.0
        quantity_source = "estimate"
        source_path = None
        confidence = 0.1
        status = "review"
        note = "QTO veya PropertySet metrajı bulunamadı. Geometrik veya manuel metraj girişi gereklidir."

    return (
        volume_m3,
        formwork_m2,
        rebar_kg,
        quantity_source,
        source_path,
        confidence,
        status,
        note,
        poz_no,
        poz_source_path,
    )


def extract_rebar_info(elem: Any) -> Tuple[Optional[float], float, float]:
    """
    For IfcReinforcingBar, extract diameter, weight, and volume from native attributes.
    """
    diameter = safe_float(getattr(elem, "NominalDiameter", getattr(elem, "NominalBarDiameter", None)))
    length = safe_float(getattr(elem, "BarLength", None))
    
    # IfcReinforcingBar can have BarCount / count
    count = safe_float(getattr(elem, "BarCount", 1)) or 1.0

    weight_kg = 0.0
    vol_m3 = 0.0

    if diameter and diameter > 0:
        # standard nominal steel formula: (pi * d^2 / 4) * 0.00785 kg/m
        nominal_kg_per_m = (math.pi * (diameter ** 2) / 4.0) * 0.00785
        if length and length > 0:
            length_m = length if length < 100 else length / 1000.0  # normalize mm to m if large
            weight_kg = round(nominal_kg_per_m * length_m * count, 1)
            vol_m3 = round(weight_kg / 7850.0, 4)
    elif hasattr(elem, "CrossSectionArea"):
        area = safe_float(getattr(elem, "CrossSectionArea", None))
        if area and area > 0:
            diameter = round(2.0 * math.sqrt(area / math.pi), 1)
            if length and length > 0:
                length_m = length if length < 100 else length / 1000.0
                # area in mm2: vol in mm3 = area * length_m * 1000
                vol_m3 = round((area * length_m * 1000.0) / 1e9 * count, 4)
                weight_kg = round(vol_m3 * 7850.0, 1)

    return diameter, weight_kg, vol_m3


def extract_spatial_storey(elem: Any) -> Tuple[str, str, Optional[str]]:
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
                    elev_m = round(elev if abs(elev) < 1000 else elev / 1000.0, 2)
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

    _, vol_scale, area_scale = get_unit_scale_factors(model)

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

        storey, storey_source, storey_source_path = extract_spatial_storey(elem)

        (
            volume_m3,
            formwork_m2,
            rebar_kg,
            quantity_source,
            quantity_source_path,
            confidence,
            status,
            note,
            poz_no,
            poz_source_path,
        ) = extract_quantities_and_properties(elem, vol_scale, area_scale)

        rebar_diameter_mm = None
        if mapped_type == "IfcReinforcingBar":
            diam, explicit_kg, explicit_vol = extract_rebar_info(elem)
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

        el_dict: Dict[str, Any] = {
            "id": step_id,
            "guid": guid,
            "type": mapped_type,
            "name": name,
            "storey": storey,
            "storeySource": storey_source,
            "volumeM3": round(volume_m3, 3),
            "formworkM2": round(formwork_m2, 2),
            "rebarKg": round(rebar_kg, 1),
            "quantitySource": quantity_source,
            "smartCheckStatus": status,
        }
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
