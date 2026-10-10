import json
import os
import subprocess
import sys
import tempfile
import pytest

PYTHON_BIN = sys.executable
CLI_PATH = os.path.join(os.path.dirname(__file__), "ifc_extract.py")


def run_cli(input_path: str, output_path: str, file_name: str = "test.ifc"):
    return subprocess.run(
        [PYTHON_BIN, CLI_PATH, "--input", input_path, "--output", output_path, "--file-name", file_name],
        capture_output=True,
        text=True,
    )


def test_missing_input_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(os.path.join(tmpdir, "nonexistent.ifc"), out_json)
        assert res.returncode == 1
        assert "IFC_PARSE_FAILED" in res.stderr


def test_corrupt_ifc_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        bad_ifc = os.path.join(tmpdir, "bad.ifc")
        with open(bad_ifc, "w") as f:
            f.write("THIS IS NOT A VALID IFC FILE\n")
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(bad_ifc, out_json)
        assert res.returncode == 1
        assert "IFC_PARSE_FAILED" in res.stderr


def test_empty_ifc_model():
    with tempfile.TemporaryDirectory() as tmpdir:
        empty_ifc = os.path.join(tmpdir, "empty.ifc")
        with open(empty_ifc, "w") as f:
            f.write(
                "ISO-10303-21;\n"
                "HEADER;\n"
                "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\n"
                "FILE_NAME('empty.ifc','2026-10-10T12:00:00',('TeklifPro'),('Platform'),'','','');\n"
                "FILE_SCHEMA(('IFC2X3'));\n"
                "ENDSEC;\n"
                "DATA;\n"
                "#1=IFCPROJECT('0000000000000000000001',$,'Empty Project',$,$,$,$,$,$);\n"
                "ENDSEC;\n"
                "END-ISO-10303-21;\n"
            )
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(empty_ifc, out_json)
        assert res.returncode == 3
        assert "IFC_EMPTY_MODEL" in res.stderr


def test_qto_priority_and_property_extraction():
    with tempfile.TemporaryDirectory() as tmpdir:
        ifc_path = os.path.join(tmpdir, "sample.ifc")
        with open(ifc_path, "w") as f:
            f.write(
                "ISO-10303-21;\n"
                "HEADER;\n"
                "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\n"
                "FILE_NAME('sample.ifc','2026-10-10T12:00:00',('TeklifPro'),('Platform'),'','','');\n"
                "FILE_SCHEMA(('IFC2X3'));\n"
                "ENDSEC;\n"
                "DATA;\n"
                "#1=IFCPROJECT('0000000000000000000001',$,'Test Project',$,$,$,$,$,$);\n"
                "#2=IFCSITE('0000000000000000000002',$,'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);\n"
                "#3=IFCBUILDING('0000000000000000000003',$,'Building',$,$,$,$,$,.ELEMENT.,$,$,$);\n"
                "#4=IFCBUILDINGSTOREY('0000000000000000000004',$,'Kat 1',$,$,$,$,$,.ELEMENT.,3.2);\n"
                "#5=IFCSLAB('3uKl6XxnD728DtNh4imxAX',$,'Döşeme D-101',$,$,$,$,$,.FLOOR.);\n"
                "#6=IFCRELCONTAINEDINSPATIALSTRUCTURE('2222222222222222222222',$,$,$,(#5),#4);\n"
                "#11=IFCQUANTITYVOLUME('NetVolume',$,$,15.4,$);\n"
                "#12=IFCELEMENTQUANTITY('0QTO4StCj7L8hBtpAcrRP4',$,'Qto_SlabBaseQuantities',$,$,(#11));\n"
                "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',$,$,$,(#5),#12);\n"
                "#21=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(14.8),$);\n"
                "#22=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',$,'AllplanAttributes',$,(#21));\n"
                "#23=IFCRELDEFINESBYPROPERTIES('1PROPbz1ln0cBIf0n979f1',$,$,$,(#5),#22);\n"
                "#30=IFCBEAM('1111111111111111111111',$,'Kiriş K-101',$,$,$,$,$,.BEAM.);\n"
                "#31=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(4.5),$);\n"
                "#32=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP5',$,'AllplanAttributes',$,(#31));\n"
                "#33=IFCRELDEFINESBYPROPERTIES('1PROPbz1ln0cBIf0n979f2',$,$,$,(#30),#32);\n"
                "#40=IFCCOLUMN('3333333333333333333333',$,'Kolon S-101 (No QTO)',$,$,$,$,$,.COLUMN.);\n"
                "#50=IFCREINFORCINGBAR('4444444444444444444444',$,'Rebar Q16',$,$,$,$,$,$,16.0,$,12.0,10,$,$);\n"
                "#60=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.4),$);\n"
                "#61=IFCPROPERTYSINGLEVALUE('KAKS',$,IFCREAL(1.5),$);\n"
                "#62=IFCPROPERTYSET('5555555555555555555555',$,'TREpys_ParselOzellikSeti',$,(#60,#61));\n"
                "#63=IFCRELDEFINESBYPROPERTIES('6666666666666666666666',$,$,$,(#2),#62);\n"
                "ENDSEC;\n"
                "END-ISO-10303-21;\n"
            )
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(ifc_path, out_json)
        assert res.returncode == 0, f"CLI failed: {res.stderr}"

        with open(out_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert "elements" in data
        assert "summary" in data
        elements = data["elements"]
        summary = data["summary"]

        assert len(elements) == 4

        # 1. Döşeme (Has both QTO: 15.4 and Property: 14.8) -> QTO must win
        slab = next(e for e in elements if e["type"] == "IfcSlab")
        assert slab["volumeM3"] == 15.4
        assert slab["quantitySource"] == "qto"
        assert slab["storey"] == "Kat 1 (3.2 m)"
        assert slab["storeySource"] == "ifc_spatial"

        # 2. Kiriş (Has only Property: 4.5) -> Property must be used
        beam = next(e for e in elements if e["type"] == "IfcBeam")
        assert beam["volumeM3"] == 4.5
        assert beam["quantitySource"] == "property"

        # 3. Kolon (Has neither QTO nor Property) -> NO synthetic math! Must be 0.0
        col = next(e for e in elements if e["type"] == "IfcColumn")
        assert col["volumeM3"] == 0.0
        assert col["quantitySource"] == "estimate"

        # 4. Rebar Q16 (diameter 16, length 12m, 1 bar)
        # kg = (pi * 16^2 / 4) * 0.00785 * 12 = 18.94 kg -> 18.9 kg
        rebar = next(e for e in elements if e["type"] == "IfcReinforcingBar")
        assert rebar["rebarKg"] == 18.9
        assert rebar["rebarDiameterMm"] == 16
        assert rebar["volumeM3"] > 0

        # 5. Project compliance
        assert summary["trPsetCsb"]["taks"] == 0.4
        assert summary["trPsetCsb"]["kaks"] == 1.5
        assert summary["trPsetCsb"]["source"] == "ifc_site"
        assert summary["parseStatus"] == "succeeded"
        assert summary["totalElements"] == 4


def test_turkish_characters_and_escapes():
    import ifcopenshell
    with tempfile.TemporaryDirectory() as tmpdir:
        ifc_path = os.path.join(tmpdir, "turkish.ifc")
        m = ifcopenshell.file(schema="IFC2X3")
        proj = m.create_entity("IFCPROJECT", GlobalId="0000000000000000000001", Name="Proje Çevre")
        slab = m.create_entity("IFCSLAB", GlobalId="3uKl6XxnD728DtNh4imxAX", Name="Döşeme İlave")
        qty = m.create_entity("IFCQUANTITYVOLUME", Name="NetVolume", VolumeValue=8.2)
        qto = m.create_entity("IFCELEMENTQUANTITY", GlobalId="0QTO4StCj7L8hBtpAcrRP4", Name="Qto_SlabBaseQuantities", Quantities=[qty])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="2LTCbz1ln0cBIf0n979fWN", RelatedObjects=[slab], RelatingPropertyDefinition=qto)
        prop = m.create_entity("IFCPROPERTYSINGLEVALUE", Name="PozNo", NominalValue=m.create_entity("IFCTEXT", "15.120.1001/A-Demir"))
        pset = m.create_entity("IFCPROPERTYSET", GlobalId="0_JX4StCj7L8hBtpAcrRP4", Name="Tr_Pset_CSB", HasProperties=[prop])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="1PROPbz1ln0cBIf0n979f1", RelatedObjects=[slab], RelatingPropertyDefinition=pset)
        m.write(ifc_path)

        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(ifc_path, out_json)
        assert res.returncode == 0, f"CLI failed: {res.stderr}"

        with open(out_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert len(data["elements"]) == 1
        slab_data = data["elements"][0]
        assert slab_data["name"] == "Döşeme İlave"
        assert slab_data["volumeM3"] == 8.2
        assert slab_data["quantitySource"] == "qto"
        assert slab_data["pozNo"] == "15.120.1001/A-Demir"
        assert data["summary"]["elementsWithPozNoCount"] == 1

