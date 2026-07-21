# Sections — ALLPLAN 2026 Official Source Pack

**Source ID:** `p3-c4-m2`

**Module:** Sections

**Target version:** ALLPLAN 2026-1

**Status:** Source draft only; workstation evidence and technical approval are still required.

## Verified source claims

1. Clipping Path can define an arbitrary section outline and viewing direction using normal or free input.
2. The section object has an explicit top level, bottom level, section identifier and optional height-from-elements behavior.
3. All 3D components inside the clipping area are considered when generating a section, including components not manually selected.
4. Model data and sections stored in different drawing files create references between those files; edit state affects section modification.
5. A generated section requires checks for clipping scope, viewing direction, levels, axes, intersections, annotations and revision status before issue.

## Official references

- ALLPLAN 2026-1, Clipping path with arbitrary viewing direction: https://help.allplan.com/Allplan/2026-1/1033/Allplan/87759.htm
- ALLPLAN 2026-1, Height of section object: https://help.allplan.com/Allplan/2026-1/1033/Allplan/9821.htm
- ALLPLAN 2026-0, Views and Sections behavior: https://help.allplan.com/Allplan/2026-0/1033/Allplan/254618.htm
- ALLPLAN Python API 2026, ClippingPathProperties: https://pythonparts.allplan.com/2026/api_reference/InterfaceStubs/NemAll_Python_BasisElements/ClippingPathProperties/

## Evidence still required before release

- Three ALLPLAN 2026 workstation screenshots: clipping path/direction, vertical extent/source scope, and reviewed section output.
- Reviewer identity, role, timestamp and explicit `approved` decision.
- A detailed lesson body matching the reviewed workflow.

This pack documents section generation. It does not approve structural detailing, dimensions or construction issue status.
