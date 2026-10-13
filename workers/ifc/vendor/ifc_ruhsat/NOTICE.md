# Vendored: ifc-ruhsat

- Upstream: https://github.com/BerkantACUN/ifc-ruhsat
- Commit: `cd6d3ce` (2026-09-24), package version 0.2.1
- License: MIT — see `LICENSE` in this folder (Copyright (c) 2026 Berkant Acun)
- Vendored on 2026-10-13 for BIMMetraj's e-PYS pre-check.

## What was taken

- `__init__.py`, `bulgu.py`, `veri.py`, `kontrol.py`, `ek9.py`, `ids_uret.py`
- `kurallar/*` (rule modules) and `ekler/*.json` (machine-readable RG 33331 annexes:
  EK-2, EK-5, EK-6 Tablo 6.1–6.68, EK-7, EK-9)
- Tests (`../../vendor_tests/ifc_ruhsat/`) and the two sample models
  (`../../fixtures/epys/`)

Not taken: `cli.py`, `mcp_server.py` (MCP dependency), Docker/packaging files.
Tests that exercised those modules were removed; nothing else was changed.

## Rules for changing this folder

- Do not edit rule logic or data here. Fixes go upstream first (issue/PR with the RG
  annex page number), then re-vendor at a new commit and update this file.
- The annex data was transcribed by the upstream author from the scanned RG 33331
  annex PDF (visual verification 2026-09-17, page numbers in each JSON `kaynak`).
  BIMMetraj spot-check (2026-10-13, official annex PDF SHA-256 7dc88971…0ecb3): Tablo 6.55,
  6.60 and 9.1 rows 1–9 match; recorded in `../../epys_preflight.py` (`DATA_VERIFICATION`).
- BIMMetraj's own behaviour (provenance, personal-data masking, EK-9 summary, artifact
  format) lives outside this folder in `workers/ifc/epys_preflight.py`.
