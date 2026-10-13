from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
# Vendored engine lives in workers/ifc/vendor (see vendor/ifc_ruhsat/NOTICE.md).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "vendor"))

from ornek_model import iyi_model, kaydet, kotu_model  # noqa: E402


@pytest.fixture(scope="session")
def iyi_dosya(tmp_path_factory) -> Path:
    return kaydet(iyi_model(), tmp_path_factory.mktemp("iyi"))


@pytest.fixture(scope="session")
def kotu_dosya(tmp_path_factory) -> Path:
    return kaydet(kotu_model(), tmp_path_factory.mktemp("kotu"), "kotu model.ifc")
