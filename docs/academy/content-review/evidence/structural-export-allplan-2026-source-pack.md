# Structural Export — ALLPLAN 2026 Official Source Pack

**Source ID:** `p3-c3-m1`

**Module:** Structural export

**Target version:** ALLPLAN 2026

**Status:** Source draft only; workstation evidence and technical approval are still required.

## Verified source claims

1. Advanced IFC export supports IFC 2x3, IFC 4 and IFC 4.3, with `.ifc` or `.ifcXML` output and format-specific Model View Definition choices.
2. Export scope includes selected drawing files and element filters. Unit, scale, project offset and additional offset affect exported coordinates and lengths; additional offset changes coordinates and must be used cautiously.
3. Attribute mapping can use office-standard or custom CFG assignments. Enabling transfer of assigned attributes only excludes the component's complete attribute set unless explicitly mapped.
4. Structural framing columns and beams are exported as extruded objects. The IFC entity table must be checked for the selected element types.
5. Successful file creation does not prove semantic completeness, coordinate correctness or suitability for structural analysis; the exported file requires independent validation and round-trip inspection.

## Official references

- ALLPLAN 2026-0, IFC Export Settings (advanced): https://help.allplan.com/Allplan/2026-0/1033/Allplan/87733.htm
- ALLPLAN 2026-0, Notes on IFC export of certain objects: https://help.allplan.com/Allplan/2026-0/1033/Allplan/295132.htm
- ALLPLAN 2026-0, Attribute mapping for export and import: https://help.allplan.com/Allplan/2026-0/1031/Allplan/94884.htm
- ALLPLAN 2026-1, IFC Import Settings element mapping: https://help.allplan.com/Allplan/2026-1/1033/Allplan/320465.htm

## Evidence still required before release

- Three local ALLPLAN 2026 workstation screenshots: export scope/profile, unit-offset-attribute settings, and independent IFC validation result.
- Reviewer identity, role, timestamp and explicit `approved` decision.
- A detailed lesson body matching the reviewed workflow.

This pack documents an exchange workflow. It does not certify the exported model for analysis, fabrication or construction.
