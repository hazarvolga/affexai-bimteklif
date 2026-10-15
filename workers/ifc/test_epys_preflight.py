import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)

import epys_preflight  # noqa: E402

GOOD = os.path.join(HERE, "fixtures", "epys", "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc")
BAD = os.path.join(HERE, "fixtures", "epys", "hatali_ornek.ifc")


def run_cli(*args):
    return subprocess.run([sys.executable, os.path.join(HERE, "epys_preflight.py"), *args], capture_output=True, text=True)


def test_report_carries_regulation_provenance_and_all_ek9_rows():
    report = epys_preflight.build_report(GOOD, "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc")
    assert report["kind"] == "epys_preflight"
    assert "33331" in report["ruleSource"]["regulation"]["resmiGazete"]
    assert report["ruleSource"]["engine"]["upstreamCommit"] == "cd6d3ce"
    assert report["ek9Table"]["tablo"] == "9.1"
    assert len(report["ek9"]) == 21
    assert {row["karar"] for row in report["ek9"]} <= {"Evet", "Evet (uyarıyla)", "Hayır", "Elle", "Kısmen (elle tamamlanacak)"}
    assert "resmî uygunluk kararı değildir" in report["disclaimer"]
    assert report["summary"]["hata"] == 0

    report_st = epys_preflight.build_report(GOOD, "123456_00_ST_BETO_MD_BIM_000_01_000.ifc", "ST")
    assert report_st["model"]["discipline"] == "ST"
    assert report_st["ek9Table"]["tablo"] == "9.2"
    assert len(report_st["ek9"]) == 16


def test_faulty_model_fails_rows_with_globalid_findings():
    report = epys_preflight.build_report(BAD, "hatali_ornek.ifc")
    assert report["summary"]["hata"] > 0
    assert any(row["karar"] == "Hayır" for row in report["ek9"])
    assert all("madde" in finding for finding in report["findings"])


def test_personal_identifiers_are_masked_in_stored_text():
    finding = {
        "kod": "EPYS-001",
        "mesaj": "IfcPerson.Identification 12345678901 ve VKN 1234567890, e-posta ali@example.com, tel +90 532 123 45 67 ve 0212 345 67 89",
        "varliklar": ["#42 IfcWall '1234567890ABCDEF123456'", "#43 IfcColumn '0123456789012345678901'"],
    }
    masked = epys_preflight.mask_personal_data(finding)
    text = masked["mesaj"]
    assert "12345678901" not in text and "1234567890" not in text
    assert "[telefon gizlendi]1" not in text
    assert text.count("[kimlik no gizlendi]") == 2
    assert text.count("[telefon gizlendi]") == 2
    assert "[e-posta gizlendi]" in text
    assert "ali@example.com" not in text
    assert "532 123 45 67" not in text
    assert "IfcPerson.Identification" in text
    assert masked["varliklar"] == [
        "#42 IfcWall '1234567890ABCDEF123456'",
        "#43 IfcColumn '0123456789012345678901'",
    ]


def test_cli_writes_json_and_exits_zero_even_with_findings():
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "report.json")
        res = run_cli("--input", BAD, "--output", out, "--file-name", "hatali_ornek.ifc")
        assert res.returncode == 0, res.stderr
        with open(out, encoding="utf-8") as f:
            data = json.load(f)
        assert data["summary"]["hata"] > 0


def test_cli_rejects_missing_input():
    with tempfile.TemporaryDirectory() as tmp:
        res = run_cli("--input", os.path.join(tmp, "yok.ifc"), "--output", os.path.join(tmp, "o.json"))
        assert res.returncode == 1
        assert "EPYS_PREFLIGHT_FAILED" in res.stderr


def test_ids_export_writes_ek6_and_ek7_specifications():
    with tempfile.TemporaryDirectory() as tmp:
        paths = epys_preflight.write_ids(tmp)
        assert sorted(os.path.basename(p) for p in paths) == ["tr-ruhsat-ek6.ids", "tr-ruhsat-ek7.ids"]
