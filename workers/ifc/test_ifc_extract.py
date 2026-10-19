import json
import os
import subprocess
import sys
import tempfile
import pytest

PYTHON_BIN = sys.executable
CLI_PATH = os.path.join(os.path.dirname(__file__), "ifc_extract.py")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


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
                "#50=IFCREINFORCINGBAR('4444444444444444444444',$,'Rebar Q16',$,$,$,$,$,$,0.016,$,12.0,10,$,$);\n"
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


def test_formwork_m2_buildingsmart_rules():
    import ifcopenshell
    with tempfile.TemporaryDirectory() as tmpdir:
        ifc_path = os.path.join(tmpdir, "formwork.ifc")
        m = ifcopenshell.file(schema="IFC2X3")
        proj = m.create_entity("IFCPROJECT", GlobalId="0000000000000000000001", Name="Formwork Project")

        # 1. Slab with explicit FormworkArea (Priority 1: explicit)
        slab_exp = m.create_entity("IFCSLAB", GlobalId="1111111111111111111111", Name="Slab Explicit")
        q_exp = m.create_entity("IFCQUANTITYAREA", Name="FormworkArea", AreaValue=45.5)
        qto_exp = m.create_entity("IFCELEMENTQUANTITY", GlobalId="1111111111111111111112", Name="Qto_SlabBaseQuantities", Quantities=[q_exp])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="1111111111111111111113", RelatedObjects=[slab_exp], RelatingPropertyDefinition=qto_exp)

        # 2. Slab with NetArea (Alt yüzey kalıbı)
        slab_net = m.create_entity("IFCSLAB", GlobalId="2222222222222222222221", Name="Slab NetArea")
        q_net = m.create_entity("IFCQUANTITYAREA", Name="NetArea", AreaValue=50.0)
        qto_net = m.create_entity("IFCELEMENTQUANTITY", GlobalId="2222222222222222222222", Name="Qto_SlabBaseQuantities", Quantities=[q_net])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="2222222222222222222223", RelatedObjects=[slab_net], RelatingPropertyDefinition=qto_net)

        # 3. Slab with GrossArea only (Boşluklar düşülmemiş)
        slab_gross = m.create_entity("IFCSLAB", GlobalId="3333333333333333333331", Name="Slab GrossArea")
        q_gross = m.create_entity("IFCQUANTITYAREA", Name="GrossArea", AreaValue=60.0)
        qto_gross = m.create_entity("IFCELEMENTQUANTITY", GlobalId="3333333333333333333332", Name="Qto_SlabBaseQuantities", Quantities=[q_gross])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="3333333333333333333333", RelatedObjects=[slab_gross], RelatingPropertyDefinition=qto_gross)

        # 4. Wall with NetSideArea (İki yüz = 2 * NetSideArea)
        wall_net = m.create_entity("IFCWALL", GlobalId="4444444444444444444441", Name="Wall NetSideArea")
        q_wnet = m.create_entity("IFCQUANTITYAREA", Name="NetSideArea", AreaValue=20.0)
        qto_wnet = m.create_entity("IFCELEMENTQUANTITY", GlobalId="4444444444444444444442", Name="Qto_WallBaseQuantities", Quantities=[q_wnet])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="4444444444444444444443", RelatedObjects=[wall_net], RelatingPropertyDefinition=qto_wnet)

        # 5. Wall with GrossSideArea only (2 * GrossSideArea, Boşluklar düşülmemiş)
        wall_gross = m.create_entity("IFCWALL", GlobalId="5555555555555555555551", Name="Wall GrossSideArea")
        q_wgross = m.create_entity("IFCQUANTITYAREA", Name="GrossSideArea", AreaValue=25.0)
        qto_wgross = m.create_entity("IFCELEMENTQUANTITY", GlobalId="5555555555555555555552", Name="Qto_WallBaseQuantities", Quantities=[q_wgross])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="5555555555555555555553", RelatedObjects=[wall_gross], RelatingPropertyDefinition=qto_wgross)

        # 6. Column with OuterSurfaceArea
        col_outer = m.create_entity("IFCCOLUMN", GlobalId="6666666666666666666661", Name="Column OuterSurface")
        q_couter = m.create_entity("IFCQUANTITYAREA", Name="OuterSurfaceArea", AreaValue=12.0)
        qto_couter = m.create_entity("IFCELEMENTQUANTITY", GlobalId="6666666666666666666662", Name="Qto_ColumnBaseQuantities", Quantities=[q_couter])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="6666666666666666666663", RelatedObjects=[col_outer], RelatingPropertyDefinition=qto_couter)

        # 7. Column with only NetSurfaceArea (MUST NOT be used, formwork = 0)
        col_net = m.create_entity("IFCCOLUMN", GlobalId="7777777777777777777771", Name="Column NetSurface (Disallowed)")
        q_cnet = m.create_entity("IFCQUANTITYAREA", Name="NetSurfaceArea", AreaValue=15.0)
        qto_cnet = m.create_entity("IFCELEMENTQUANTITY", GlobalId="7777777777777777777772", Name="Qto_ColumnBaseQuantities", Quantities=[q_cnet])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="7777777777777777777773", RelatedObjects=[col_net], RelatingPropertyDefinition=qto_cnet)

        # 8. Beam (formwork = 0, kesit boyutu gerekli)
        beam = m.create_entity("IFCBEAM", GlobalId="8888888888888888888881", Name="Beam K101")
        q_bouter = m.create_entity("IFCQUANTITYAREA", Name="OuterSurfaceArea", AreaValue=18.0)
        qto_bouter = m.create_entity("IFCELEMENTQUANTITY", GlobalId="8888888888888888888882", Name="Qto_BeamBaseQuantities", Quantities=[q_bouter])
        m.create_entity("IFCRELDEFINESBYPROPERTIES", GlobalId="8888888888888888888883", RelatedObjects=[beam], RelatingPropertyDefinition=qto_bouter)

        # 9. ReinforcingBar (formwork = 0, Kalıp yok)
        rebar = m.create_entity("IFCREINFORCINGBAR", GlobalId="9999999999999999999991", Name="Rebar Q14", NominalDiameter=14.0, BarLength=6.0)

        m.write(ifc_path)

        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(ifc_path, out_json)
        assert res.returncode == 0, f"CLI failed: {res.stderr}"

        with open(out_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        els = {e["name"]: e for e in data["elements"]}

        # 1. Explicit FormworkArea on Slab
        assert els["Slab Explicit"]["formworkM2"] == 45.5
        assert els["Slab Explicit"]["formworkBasis"] == "explicit"
        assert "Açık kalıp niceliğinden" in els["Slab Explicit"]["formworkNote"]

        # 2. Slab with NetArea
        assert els["Slab NetArea"]["formworkM2"] == 50.0
        assert els["Slab NetArea"]["formworkBasis"] == "derived"
        assert "Kenar kalıbı dahil değil" in els["Slab NetArea"]["formworkNote"]

        # 3. Slab with GrossArea
        assert els["Slab GrossArea"]["formworkM2"] == 60.0
        assert els["Slab GrossArea"]["formworkBasis"] == "derived"
        assert "Boşluklar düşülmemiş" in els["Slab GrossArea"]["formworkNote"]

        # 4. Wall with NetSideArea (2 * 20.0 = 40.0)
        assert els["Wall NetSideArea"]["formworkM2"] == 40.0
        assert els["Wall NetSideArea"]["formworkBasis"] == "derived"
        assert "Tek yüz toprağa/komşu betona dayalıysa" in els["Wall NetSideArea"]["formworkNote"]

        # 5. Wall with GrossSideArea (2 * 25.0 = 50.0)
        assert els["Wall GrossSideArea"]["formworkM2"] == 50.0
        assert els["Wall GrossSideArea"]["formworkBasis"] == "derived"
        assert "Boşluklar düşülmemiş" in els["Wall GrossSideArea"]["formworkNote"]

        # 6. Column with OuterSurfaceArea
        assert els["Column OuterSurface"]["formworkM2"] == 12.0
        assert els["Column OuterSurface"]["formworkBasis"] == "derived"
        assert "NetSurfaceArea ve GrossSurfaceArea kullanılmaz" in els["Column OuterSurface"]["formworkNote"]

        # 7. Column with NetSurfaceArea only (Must be 0.0, none)
        assert els["Column NetSurface (Disallowed)"]["formworkM2"] == 0.0
        assert els["Column NetSurface (Disallowed)"]["formworkBasis"] == "none"

        # 8. Beam (Must be 0.0, none)
        assert els["Beam K101"]["formworkM2"] == 0.0
        assert els["Beam K101"]["formworkBasis"] == "none"
        assert "Kiriş kalıbı için kesit boyutu gerekli" in els["Beam K101"]["formworkNote"]

        # 9. Rebar (Must be 0.0, none)
        assert els["Rebar Q14"]["formworkM2"] == 0.0
        assert els["Rebar Q14"]["formworkBasis"] == "none"
        assert "Kalıp yok" in els["Rebar Q14"]["formworkNote"]




def test_project_units_and_quantity_override():
    import ifcopenshell
    from workers.ifc.ifc_extract import get_unit_scale_factors, extract_quantities_and_properties
    m = ifcopenshell.file(schema='IFC4')
    mm = m.create_entity('IfcSIUnit', UnitType='LENGTHUNIT', Prefix='MILLI', Name='METRE')
    cubic = m.create_entity('IfcSIUnit', UnitType='VOLUMEUNIT', Name='CUBIC_METRE')
    square = m.create_entity('IfcSIUnit', UnitType='AREAUNIT', Name='SQUARE_METRE')
    assignment = m.create_entity('IfcUnitAssignment', Units=[mm, cubic, square])
    m.create_entity('IfcProject', GlobalId='1111111111111111111111', UnitsInContext=assignment)
    assert get_unit_scale_factors(m) == (0.001, 1.0, 1.0)
    slab = m.create_entity('IfcSlab', GlobalId='2222222222222222222222')
    qty = m.create_entity('IfcQuantityVolume', Name='NetVolume', VolumeValue=8000000000., Unit=m.create_entity('IfcSIUnit', UnitType='VOLUMEUNIT', Prefix='MILLI', Name='CUBIC_METRE'))
    qto = m.create_entity('IfcElementQuantity', GlobalId='3333333333333333333333', Name='Qto_SlabBaseQuantities', Quantities=[qty])
    m.create_entity('IfcRelDefinesByProperties', GlobalId='4444444444444444444444', RelatedObjects=[slab], RelatingPropertyDefinition=qto)
    assert extract_quantities_and_properties(slab, 1., 1.)[0] == 8.


def test_net_volume_selection_is_order_independent_and_traced():
    import ifcopenshell
    from workers.ifc.ifc_extract import extract_quantities_and_properties
    m = ifcopenshell.file(schema='IFC4')
    slab = m.create_entity('IfcSlab', GlobalId='1111111111111111111111')
    net = m.create_entity('IfcQuantityVolume', Name='NetVolume', VolumeValue=8.)
    gross = m.create_entity('IfcQuantityVolume', Name='GrossVolume', VolumeValue=10.)
    qto = m.create_entity('IfcElementQuantity', GlobalId='2222222222222222222222', Name='Qto_SlabBaseQuantities', Quantities=[net,gross])
    m.create_entity('IfcRelDefinesByProperties', GlobalId='3333333333333333333333', RelatedObjects=[slab], RelatingPropertyDefinition=qto)
    for order in ([net,gross],[gross,net]):
        qto.Quantities = order
        result = extract_quantities_and_properties(slab,1.,1.)
        assert result[0] == 8.
        assert 'IFC_QUANTITY_CONFLICT' in result[9]


def test_conversion_units_and_property_override():
    import ifcopenshell
    from workers.ifc.ifc_extract import unit_scale, extract_quantities_and_properties
    m = ifcopenshell.file(schema='IFC4')
    def converted(kind, name, factor, si_name):
        si = m.create_entity('IfcSIUnit', UnitType=kind, Name=si_name)
        measure = m.create_entity('IfcMeasureWithUnit', ValueComponent=m.create_entity('IfcReal', factor), UnitComponent=si)
        return m.create_entity('IfcConversionBasedUnit', UnitType=kind, Name=name, ConversionFactor=measure)
    assert unit_scale(converted('LENGTHUNIT','foot',.3048,'METRE'),'LENGTHUNIT') == .3048
    assert unit_scale(converted('AREAUNIT','square foot',.09290304,'SQUARE_METRE'),'AREAUNIT') == .09290304
    ton = converted('MASSUNIT','ton',1000000.,'GRAM')
    assert unit_scale(ton,'MASSUNIT') == 1000.
    cubic = converted('VOLUMEUNIT','cubic foot',.028316846592,'CUBIC_METRE')
    slab = m.create_entity('IfcSlab', GlobalId='1111111111111111111111')
    prop = m.create_entity('IfcPropertySingleValue', Name='Hacim', NominalValue=m.create_entity('IfcReal',10.),Unit=cubic)
    pset = m.create_entity('IfcPropertySet', GlobalId='2222222222222222222222',Name='AllplanAttributes',HasProperties=[prop])
    m.create_entity('IfcRelDefinesByProperties',GlobalId='3333333333333333333333',RelatedObjects=[slab],RelatingPropertyDefinition=pset)
    assert extract_quantities_and_properties(slab,1.,1.)[0] == pytest.approx(.28316846592)
    with pytest.raises(ValueError,match='IFC_UNIT_UNSUPPORTED'):
        unit_scale(ton,'VOLUMEUNIT')


def test_unused_missing_mass_unit_and_explicit_volume_without_project_default():
    import ifcopenshell
    from workers.ifc.ifc_extract import project_unit_scale, extract_quantities_and_properties
    m = ifcopenshell.file(schema='IFC4')
    length = m.create_entity('IfcSIUnit', UnitType='LENGTHUNIT', Name='METRE')
    assignment = m.create_entity('IfcUnitAssignment', Units=[length])
    m.create_entity('IfcProject',GlobalId='1111111111111111111111',UnitsInContext=assignment)
    volume = m.create_entity('IfcSIUnit',UnitType='VOLUMEUNIT',Name='CUBIC_METRE')
    slab=m.create_entity('IfcSlab',GlobalId='2222222222222222222222')
    qty=m.create_entity('IfcQuantityVolume',Name='NetVolume',VolumeValue=8.,Unit=volume)
    qto=m.create_entity('IfcElementQuantity',GlobalId='3333333333333333333333',Name='Qto_SlabBaseQuantities',Quantities=[qty])
    m.create_entity('IfcRelDefinesByProperties',GlobalId='4444444444444444444444',RelatedObjects=[slab],RelatingPropertyDefinition=qto)
    assert extract_quantities_and_properties(slab,project_unit_scale(m,'VOLUMEUNIT'),project_unit_scale(m,'AREAUNIT'),project_unit_scale(m,'MASSUNIT'))[0] == 8.
    qty.Unit=None
    with pytest.raises(ValueError,match='missing VOLUMEUNIT'):
        extract_quantities_and_properties(slab,project_unit_scale(m,'VOLUMEUNIT'),1.)


def test_rebar_cross_section_uses_independent_area_unit():
    from types import SimpleNamespace
    from workers.ifc.ifc_extract import extract_rebar_info
    bar = SimpleNamespace(NominalDiameter=None, BarLength=12000., CrossSectionArea=0.00020106192982974675)
    diameter, mass, _ = extract_rebar_info(bar, .001, 1.)
    assert diameter == 16.
    assert mass == 18.9


def test_three_by_three_rule_metadata_extraction():
    import ifcopenshell
    from workers.ifc.ifc_extract import extract_quantities_and_properties
    m = ifcopenshell.file(schema="IFC4")
    col = m.create_entity("IfcColumn", GlobalId="1111111111111111111111")
    qty = m.create_entity("IfcQuantityVolume", Name="NetVolume", VolumeValue=10.5)
    qto = m.create_entity("IfcElementQuantity", GlobalId="2222222222222222222222", Name="Qto_ColumnBaseQuantities", Quantities=[qty])
    m.create_entity("IfcRelDefinesByProperties", GlobalId="3333333333333333333333", RelatedObjects=[col], RelatingPropertyDefinition=qto)

    p_vol = m.create_entity("IfcPropertySingleValue", Name="Hacim", NominalValue=m.create_entity("IfcReal", 10.0))
    p_lb = m.create_entity("IfcPropertySingleValue", Name="LoadBearing", NominalValue=m.create_entity("IfcBoolean", True))
    p_ext = m.create_entity("IfcPropertySingleValue", Name="IsExternal", NominalValue=m.create_entity("IfcBoolean", True))
    p_cov = m.create_entity("IfcPropertySingleValue", Name="ConcreteCover", NominalValue=m.create_entity("IfcReal", 0.025))
    p_exp = m.create_entity("IfcPropertySingleValue", Name="ExposureClass", NominalValue=m.create_entity("IfcLabel", "XC3"))
    pset = m.create_entity("IfcPropertySet", GlobalId="4444444444444444444444", Name="Pset_ColumnCommon", HasProperties=[p_vol, p_lb, p_ext, p_cov, p_exp])
    m.create_entity("IfcRelDefinesByProperties", GlobalId="5555555555555555555555", RelatedObjects=[col], RelatingPropertyDefinition=pset)

    res = extract_quantities_and_properties(col, 1.0, 1.0)
    meta = res[12]
    assert meta["loadBearing"] is True
    assert meta["exposure"] == "exterior"
    assert meta["exposureClass"] == "XC3"
    assert meta["coverMm"] == 25.0
    assert meta["discipline"] == "STR"
    assert meta["expectedQuantity"] == 10.0


def test_trepys_poz_and_emsal_extraction():
    import ifcopenshell
    from workers.ifc.ifc_extract import extract_quantities_and_properties, extract_project_compliance

    m = ifcopenshell.file(schema="IFC4")
    wall = m.create_entity("IfcWall", GlobalId="1111111111111111111111")

    # Generic pset has fallback PozNo, TREpys_PozOzellikSeti has official PozNo
    p_generic = m.create_entity("IfcPropertySingleValue", Name="PozNo", NominalValue=m.create_entity("IfcLabel", "OLD.POZ.001"))
    pset_generic = m.create_entity("IfcPropertySet", GlobalId="2222222222222222222222", Name="CustomPset", HasProperties=[p_generic])
    p_trepys = m.create_entity("IfcPropertySingleValue", Name="PozNo", NominalValue=m.create_entity("IfcLabel", "15.150.1005"))
    pset_trepys = m.create_entity("IfcPropertySet", GlobalId="3333333333333333333333", Name="TREpys_PozOzellikSeti", HasProperties=[p_trepys])
    m.create_entity("IfcRelDefinesByProperties", GlobalId="4444444444444444444444", RelatedObjects=[wall], RelatingPropertyDefinition=pset_generic)
    m.create_entity("IfcRelDefinesByProperties", GlobalId="5555555555555555555555", RelatedObjects=[wall], RelatingPropertyDefinition=pset_trepys)

    res = extract_quantities_and_properties(wall, 1.0, 1.0)
    assert res[10] == "15.150.1005"
    assert "TREpys_PozOzellikSeti" in res[11]

    # SpatialZone with TREpys_EmsalOzellikSeti
    z1 = m.create_entity("IfcSpatialZone", GlobalId="6666666666666666666666", Name="MM-EMS-zemin")
    p_ed1 = m.create_entity("IfcPropertySingleValue", Name="EmsalDurumu", NominalValue=m.create_entity("IfcLabel", "DAHIL"))
    ps_e1 = m.create_entity("IfcPropertySet", GlobalId="7777777777777777777777", Name="TREpys_EmsalOzellikSeti", HasProperties=[p_ed1])
    q_a1 = m.create_entity("IfcQuantityArea", Name="GrossFloorArea", AreaValue=420.5)
    qto_e1 = m.create_entity("IfcElementQuantity", GlobalId="8888888888888888888888", Name="Qto_SpatialZoneBaseQuantities", Quantities=[q_a1])
    m.create_entity("IfcRelDefinesByProperties", GlobalId="9999999999999999999991", RelatedObjects=[z1], RelatingPropertyDefinition=ps_e1)
    m.create_entity("IfcRelDefinesByProperties", GlobalId="9999999999999999999992", RelatedObjects=[z1], RelatingPropertyDefinition=qto_e1)

    z2 = m.create_entity("IfcSpatialZone", GlobalId="6666666666666666666667", Name="MM-EMS-balkon")
    p_ed2 = m.create_entity("IfcPropertySingleValue", Name="EmsalDurumu", NominalValue=m.create_entity("IfcLabel", "YUZDE30"))
    ps_e2 = m.create_entity("IfcPropertySet", GlobalId="7777777777777777777778", Name="TREpys_EmsalOzellikSeti", HasProperties=[p_ed2])
    q_a2 = m.create_entity("IfcQuantityArea", Name="GrossFloorArea", AreaValue=65.25)
    qto_e2 = m.create_entity("IfcElementQuantity", GlobalId="8888888888888888888889", Name="Qto_SpatialZoneBaseQuantities", Quantities=[q_a2])
    m.create_entity("IfcRelDefinesByProperties", GlobalId="9999999999999999999993", RelatedObjects=[z2], RelatingPropertyDefinition=ps_e2)
    m.create_entity("IfcRelDefinesByProperties", GlobalId="9999999999999999999994", RelatedObjects=[z2], RelatingPropertyDefinition=qto_e2)

    comp = extract_project_compliance(m, 1.0)
    assert comp["emsalDahilM2"] == 420.5
    assert comp["emsalYuzde30M2"] == 65.25
    assert comp["emsalHaricM2"] == 0.0




def test_authoring_software_raw_is_extracted_from_real_header():
    """Revit IFC: başlıkta 'Revit' geçmez, yazılım adı yalnız IfcApplication'dadır."""
    sample = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "harici-kaynaklar",
            "klasorler-ve-ornekler",
            "IfcSampleFiles-main",
            "Ifc4_Revit_STR.ifc",
        )
    )
    if not os.path.exists(sample):
        pytest.skip("IfcSampleFiles-main örnek dosyası yok")
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(sample, out_json, "Ifc4_Revit_STR.ifc")
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            raw = json.load(f)["summary"]["authoringSoftwareRaw"]
    assert "Exporter" in (raw["originatingSystem"] or "")
    assert any("Revit" in n for n in raw["applicationNames"])


def _fixture_path(name: str) -> str:
    return os.path.join(os.path.dirname(__file__), "fixtures", name)


def test_consistency_check_1_and_2_duplicate_guid_and_orphan_opening():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(_fixture_path("duplicate_guid_and_orphan_opening.ifc"), out_json)
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            data = json.load(f)

    report = data["summary"]["consistencyReport"]
    findings = report["findings"]

    dup_findings = [f for f in findings if f["code"] == "DUPLICATE_GLOBAL_ID"]
    assert len(dup_findings) == 2
    assert all(f["severity"] == "high" for f in dup_findings)
    assert all(f["globalId"] == "DUPLICATE_GUID_0000001" for f in dup_findings)
    assert {f["ifcClass"] for f in dup_findings} == {"IfcWall", "IfcSlab"}
    assert all("Zemin Kat" in f["storey"] for f in dup_findings)

    orphan_findings = [f for f in findings if f["code"] == "ORPHAN_OPENING_ELEMENT"]
    assert len(orphan_findings) == 1
    assert orphan_findings[0]["severity"] == "high"
    assert orphan_findings[0]["globalId"] == "ORPHAN_OPENING_0000001"
    assert orphan_findings[0]["ifcClass"] == "IfcOpeningElement"


def test_consistency_check_3_and_4_invalid_quantities_and_unassigned_storey():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(_fixture_path("invalid_quantities_and_unassigned_storey.ifc"), out_json)
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            data = json.load(f)

    summary = data["summary"]
    report = summary["consistencyReport"]
    by_guid = {el["guid"]: el for el in data["elements"]}

    # Total volume only includes the valid slab (12.5 m3); negative/zero/missing never enter sum
    assert summary["totalVolumeM3"] == 12.5
    assert report["totalElementCount"] == 4
    assert report["measuredElementCount"] == 1
    assert report["unmeasuredElementCount"] == 3

    assert by_guid["SLAB_VALID_00000000001"]["measured"] is True
    assert by_guid["SLAB_VALID_00000000001"]["measurementStatus"] == "ölçüldü"

    for bad_guid in ("WALL_NEGATIVE_00000001", "BEAM_ZERO_000000000001", "COL_UNASSIGNED_NO_QTY1"):
        assert by_guid[bad_guid]["volumeM3"] == 0.0
        assert by_guid[bad_guid]["measured"] is False
        assert by_guid[bad_guid]["measurementStatus"] == "ölçülemedi"

    findings = report["findings"]
    neg_f = next(f for f in findings if f["code"] == "NEGATIVE_NET_QUANTITY")
    assert neg_f["severity"] == "high"
    assert neg_f["globalId"] == "WALL_NEGATIVE_00000001"
    assert neg_f["ifcClass"] == "IfcWall"

    zero_f = next(f for f in findings if f["code"] == "ZERO_NET_QUANTITY")
    assert zero_f["severity"] == "high"
    assert zero_f["globalId"] == "BEAM_ZERO_000000000001"
    assert zero_f["ifcClass"] == "IfcBeam"

    miss_f = next(f for f in findings if f["code"] == "MISSING_NET_QUANTITY")
    assert miss_f["severity"] == "high"
    assert miss_f["globalId"] == "COL_UNASSIGNED_NO_QTY1"
    assert miss_f["ifcClass"] == "IfcColumn"

    storey_f = [f for f in findings if f["code"] == "MISSING_SPATIAL_STOREY"]
    assert len(storey_f) == 1
    assert storey_f[0]["severity"] == "medium"
    assert storey_f[0]["globalId"] == "COL_UNASSIGNED_NO_QTY1"
    assert storey_f[0]["ifcClass"] == "IfcColumn"
    assert by_guid["COL_UNASSIGNED_NO_QTY1"]["storey"] == "Kat atanmamış"


def test_consistency_check_5_proxy_and_unmapped_poz_elements():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(_fixture_path("proxy_and_unmapped_poz.ifc"), out_json)
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            data = json.load(f)

    report = data["summary"]["consistencyReport"]
    by_guid = {el["guid"]: el for el in data["elements"]}

    assert report["totalElementCount"] == 3
    assert report["measuredElementCount"] == 3
    assert report["pozMatchedElementCount"] == 1
    assert report["uncoveredElementCount"] == 2
    assert report["pozMatchedRatio"] == pytest.approx(1 / 3, rel=1e-4)

    assert by_guid["WALL_POZ_MATCHED_00001"]["isUncovered"] is False
    assert by_guid["WALL_POZ_MATCHED_00001"]["matchedPozCode"] == "15.225.1004"

    proxy_el = by_guid["PROXY_ELEM_00000000001"]
    assert proxy_el["ifcClass"] == "IfcBuildingElementProxy"
    assert proxy_el["isUncovered"] is True
    assert proxy_el["matchedPozCode"] is None

    unmapped_cov = by_guid["COV_UNMAPPED_000000001"]
    assert unmapped_cov["ifcClass"] == "IfcCovering"
    assert unmapped_cov["isUncovered"] is True
    assert unmapped_cov["matchedPozCode"] is None

    uncovered_guids = {u["globalId"] for u in report["uncoveredElements"]}
    assert uncovered_guids == {"PROXY_ELEM_00000000001", "COV_UNMAPPED_000000001"}


def test_consistency_check_6_type_pset_inheritance_and_instance_override():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(_fixture_path("type_pset_inheritance.ifc"), out_json)
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            data = json.load(f)

    by_guid = {el["guid"]: el for el in data["elements"]}
    report = data["summary"]["consistencyReport"]

    # Wall 1 inherits from IfcWallType.HasPropertySets
    w_inherit = by_guid["WALL_INHERITS_TYPE_001"]
    assert w_inherit["volumeM3"] == pytest.approx(8.4)
    assert w_inherit["loadBearing"] is True
    assert w_inherit["exposure"] == "exterior"
    assert w_inherit["exposureClass"] == "XC4"
    assert w_inherit["pozNo"] == "15.225.1004"
    assert w_inherit["inheritedFromType"] is True

    # Wall 2 overrides type properties with its own instance properties
    w_override = by_guid["WALL_OVERRIDES_TYPE_01"]
    assert w_override["volumeM3"] == pytest.approx(5.2)
    assert w_override["loadBearing"] is False
    assert w_override["exposure"] == "interior"
    assert w_override["exposureClass"] == "XC4"  # still inherited since not overridden on instance
    assert w_override["pozNo"] == "15.225.1009"

    assert report["typeInheritedElementCount"] == 2
    assert data["summary"]["totalVolumeM3"] == pytest.approx(13.6)


def test_consistency_check_7_assembly_double_counting_prevention():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_json = os.path.join(tmpdir, "out.json")
        res = run_cli(_fixture_path("assembly_double_count.ifc"), out_json)
        assert res.returncode == 0, res.stderr
        with open(out_json, encoding="utf-8") as f:
            data = json.load(f)

    summary = data["summary"]
    report = summary["consistencyReport"]
    by_guid = {el["guid"]: el for el in data["elements"]}

    # Only the 3 parent assemblies (IfcStair=3.5, IfcCurtainWall=1.8, IfcElementAssembly=4.0) are counted;
    # the 5 decomposed child parts (IfcStairFlight, IfcPlate, IfcMember, 2x IfcBeam) are suppressed!
    assert summary["totalVolumeM3"] == pytest.approx(9.3)
    assert len(data["elements"]) == 3
    assert set(by_guid.keys()) == {
        "STAIR_PARENT_000000001",
        "CW_PARENT_000000000001",
        "ASM_PARENT_00000000001",
    }
    assert report["suppressedAssemblyPartCount"] == 5
    suppressed_classes = [p["ifcClass"] for p in report["suppressedAssemblyParts"]]
    assert sorted(suppressed_classes) == sorted([
        "IfcStairFlight",
        "IfcPlate",
        "IfcMember",
        "IfcBeam",
        "IfcBeam",
    ])

