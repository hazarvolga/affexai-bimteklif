# Beams — ALLPLAN 2026 Official Source Pack

**Source ID:** `p3-c1-m2`

**Module:** Beams

**Target version:** ALLPLAN 2026-1

**Status:** Source draft only; workstation evidence and technical approval are still required.

## Verified source claims

1. **Tool location and scope.** Structural Framing Beam is available from the Architecture role, Structural Framing task, Structural Framing Objects area. It creates horizontal or inclined beams with a rectangular cross-section or a profile selected from the library. Tool availability depends on the workstation license.
2. **Creation workflow.** The operator defines parameters on the palette's three tabs, places the anchor point at the start, and then places the anchor point at the end. A preview remains attached to the crosshairs during placement.
3. **Height behavior.** For a horizontal beam, the starting point's z-coordinate is ignored and the anchor-point height comes from Relative height. For an inclined beam, the starting point height defines the initial anchor-point height and is stored in the Height dialog after creation.
4. **Geometry and editing.** Structural framing objects expose move and point handles plus anchor points. Exact lengths and angles can be entered. If height is plane-based, the object cannot be modified in the z-direction by stretching.
5. **Exchange classification.** ALLPLAN's IFC element table maps downstand beams, including structural framing beams, to `IfcBeam`.

## Official references

- ALLPLAN 2026-1, Structural Framing Beam: https://help.allplan.com/Allplan/2026-1/1033/Allplan/254647.htm
- ALLPLAN 2026-1, Structural framing beam palette: https://help.allplan.com/Allplan/2026-1/1033/Allplan/276259.htm
- ALLPLAN 2026-1, Editing and changing the geometry: https://help.allplan.com/Allplan/2026-1/1033/Allplan/276249.htm
- ALLPLAN 2026-1, IFC Import Settings element mapping: https://help.allplan.com/Allplan/2026-1/1033/Allplan/320465.htm

## Evidence still required before release

- Three local screenshots captured in a licensed ALLPLAN 2026 workstation: geometry/anchor setup, height/construction method, and attributes plus `IfcBeam` verification.
- Reviewer identity, role, review timestamp, and explicit `approved` decision.
- A detailed lesson body matching the reviewed workflow.

This pack is documentary source evidence. It is not a substitute for workstation execution, structural-design review, or project-specific engineering approval.
