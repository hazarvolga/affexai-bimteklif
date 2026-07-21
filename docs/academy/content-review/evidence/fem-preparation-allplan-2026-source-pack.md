# FEM Preparation — ALLPLAN 2026 / AutoConverter Official Source Pack

**Source ID:** `p3-c3-m2`

**Module:** FEM preparation

**Target context:** ALLPLAN 2026 structural model and ALLPLAN AutoConverter

**Status:** Source draft only; workstation evidence and structural-engineer approval are still required.

## Verified source claims

1. ALLPLAN AutoConverter converts a structural model into an analysis model and prepares it for analysis applications.
2. The structural engineer can remove non-loadbearing elements, redefine element roles, and map profiles and materials to analysis libraries.
3. Recognition settings control automatic conversion. Elements outside recognizer conditions can be kept or removed by the structural engineer.
4. Alignment settings cover system-line positioning, eccentricities and master planes. These analytical decisions are not implied by physical-model geometry alone.
5. The resulting analysis model still requires engineer-controlled supports, loads, combinations, connectivity and solver validation before FEM results can be trusted.

## Official references

- ALLPLAN AutoConverter user guide, Welcome: https://bimplus-help.allplan.com/AutoConverter/welcome.htm
- ALLPLAN, SCIA structural analysis workflow: https://www.allplan.com/allplan-scia-bim-workflow/
- ALLPLAN 2026-0, IFC Export Settings: https://help.allplan.com/Allplan/2026-0/1033/Allplan/87733.htm
- ALLPLAN 2026-0, Notes on IFC export of structural framing: https://help.allplan.com/Allplan/2026-0/1033/Allplan/295132.htm

## Evidence still required before release

- Three screenshots from the actual ALLPLAN 2026/AutoConverter workflow: recognition and roles, analytical alignment/connectivity, and validation in the target analysis tool.
- Structural reviewer identity, role, timestamp and explicit `approved` decision.
- A detailed lesson body matching the reviewed workflow.

This pack describes model preparation. It does not constitute a finite-element calculation, design check or engineering approval.
