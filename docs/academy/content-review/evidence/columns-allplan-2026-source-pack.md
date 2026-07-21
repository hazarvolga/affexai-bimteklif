# Columns - Allplan 2026 Official Source Pack

Retrieved: 22 July 2026
Module source ID: `p3-c1-m1`
Status: official-documentation evidence; workstation screenshots and technical reviewer approval are still required.

## Supported workflow claims

1. In Allplan 2026-1, the Structural Framing Column tool is available through the Architecture role, Structural Framing task and Structural Framing Objects task area. The menu route is Create > Engineering > Structural Framing. Tool availability depends on the installed Allplan license.
2. The creation flow consists of opening Structural Framing Column, defining parameters on three palette tabs, placing the previewed column in a workspace view and closing the tool when finished.
3. Column height comes from the Height dialog rather than the Z coordinate of the placement point.
4. The Geometry tab controls rectangular, circular or library cross-sections; dimensions, rotation, top/bottom levels, plane-based height and anchor point are explicit parameters.
5. The Representation tab controls layer, pen/line/color and section/animation surface elements.
6. The Attributes tab supports material/quality catalogs, trade, calculation mode, attributes and positioning/mark-number schema. Calculation mode influences later lists and schedules.
7. Allplan 2026-1 IFC settings map columns, including structural framing columns, to `IfcColumn`.
8. Plane-model elevations can be modified using Floor Manager or the Planes palette; dependent planes can move with or retain their existing heights.

## Official references

- ALLPLAN 2026-1, Structural Framing Column: https://help.allplan.com/Allplan/2026-1/1033/Allplan/254637.htm
- ALLPLAN 2026-1, Structural framing column palette: https://help.allplan.com/Allplan/2026-1/1033/Allplan/276241.htm
- ALLPLAN 2026-1, IFC Import Settings - column to IfcColumn mapping: https://help.allplan.com/Allplan/2026-1/1033/Allplan/320465.htm
- ALLPLAN 2026-0, Changing default reference-plane heights: https://help.allplan.com/Allplan/2026-0/1033/Allplan/47548.htm

## Required workstation evidence not present

- Screenshot 1: Structural Framing Column command opened from the stated Actionbar route, with Allplan version/license context visible.
- Screenshot 2: Geometry tab showing cross-section, anchor point and plane-based top/bottom height settings.
- Screenshot 3: Attributes tab showing material/trade/calculation mode and an assigned classification suitable for schedule/IFC review.
- Export or property proof showing the created object represented as `IfcColumn` in the agreed test workflow.

## Engineering boundary

This pack documents software operations only. It does not validate structural dimensions, load capacity, reinforcement design, code compliance or constructability. Those decisions require the project engineer, applicable standards and project-specific calculations.
