# Structural Walls — ALLPLAN 2026 Official Source Pack

**Source ID:** `p3-c1-m3`

**Module:** Structural walls

**Target version:** ALLPLAN 2026-1

**Status:** Source draft only; workstation evidence and technical approval are still required.

## Verified source claims

1. **Layer-specific wall geometry.** Multilayer walls can use different height settings per construction layer when the shared Height option is disabled.
2. **Plane-based height.** Individual wall-layer heights can be associated with upper or lower default reference planes. A negative offset can account for a floor slab where a layer must terminate lower.
3. **Building-structure coordination.** Drawing files can be assigned planes from the plane model, and drawing files can be updated when their assigned planes change.
4. **IFC classification.** ALLPLAN's IFC element table maps straight walls to `IfcWallStandardCase`; special wall constructions such as circular, element, spline and freeform walls map to `IfcWall`. Multilayer walls can be split according to exchange settings.
5. **Modeling is not analysis.** These sources establish wall geometry, plane coordination and exchange classification only. They do not prove load-bearing capacity or replace structural design.

## Official references

- ALLPLAN 2026-1, Multilayer walls with different height settings: https://help.allplan.com/Allplan/2026-1/1033/Allplan/10275.htm
- ALLPLAN 2026-1, Shortcut menu of building structure: https://help.allplan.com/Allplan/2026-1/1033/Allplan/69749.htm
- ALLPLAN 2026-1, IFC Import Settings element mapping: https://help.allplan.com/Allplan/2026-1/1033/Allplan/320465.htm
- ALLPLAN 2026-0, Changing the height of default reference planes: https://help.allplan.com/Allplan/2026-0/1033/Allplan/47548.htm

## Evidence still required before release

- Three local screenshots captured in a licensed ALLPLAN 2026 workstation: wall layers and axis, plane-based layer heights, and IFC classification verification.
- Reviewer identity, role, review timestamp, and explicit `approved` decision.
- A detailed lesson body matching the reviewed workflow.

This pack is documentary source evidence. It is not proof that a modeled wall is structurally adequate, code-compliant, or approved for construction.
