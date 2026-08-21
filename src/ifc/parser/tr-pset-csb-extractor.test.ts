import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractElementPozNo, extractProjectComplianceData } from "./tr-pset-csb-extractor";
import { parseIfcText } from "./legacy-parser";

describe("Tr_Pset_CSB PozNo extraction (element-level)", () => {
  it("extracts PozNo from Tr_Pset_CSB through RelDefinesByProperties", () => {
    const ifcText = [
      "#10=IFCCOLUMN('3uKl6XxnD728DtNh4imxAX',#5,'Kolon S-100',$,$,#1,#2,$);",
      "#11=IFCPROPERTYSINGLEVALUE('PozNo',$,IFCTEXT('15.150.1001'),$);",
      "#12=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
    ].join("\n");

    const result = extractElementPozNo(ifcText);
    const entry = result.pozNoByStepId.get("10");

    assert.ok(entry);
    assert.equal(entry?.value, "15.150.1001");
    assert.equal(entry?.sourcePath, "#13/#12/#11:Tr_Pset_CSB/PozNo");
  });

  it("does not match unrelated Allplan PozNoListe property", () => {
    const ifcText = [
      "#10=IFCREINFORCINGBAR('1Kr_GNHGP4YuGM2mWADG7e',#5,'Donati',$,$,#1,#2,$);",
      "#11=IFCPROPERTYSINGLEVALUE('PozNoListe',$,IFCTEXT('2 2 1 1 3'),$);",
      "#12=IFCPROPERTYSET('2pKTuvV4b5LAlbtKP9QQNM',#5,'AllplanAttributes',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('3eFTCDGef1BuGQgXYTSwsw',#5,$,$,(#10),#12);",
    ].join("\n");

    const result = extractElementPozNo(ifcText);

    assert.equal(result.pozNoByStepId.size, 0);
  });

  it("ignores PozNo values outside the Tr_Pset_CSB property set", () => {
    const ifcText = [
      "#10=IFCWALL('3uKl6XxnD728DtNh4imxAX',#5,'Perde P-100',$,$,#1,#2,$);",
      "#11=IFCPROPERTYSINGLEVALUE('PozNo',$,IFCTEXT('99.999.9999'),$);",
      "#12=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'SomeOtherPset',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
    ].join("\n");

    const result = extractElementPozNo(ifcText);

    assert.equal(result.pozNoByStepId.size, 0);
  });
});

describe("Tr_Pset_CSB project compliance extraction (site/building-level)", () => {
  it("extracts TAKS/KAKS/CekmeOn/CekmeYan from IfcSite", () => {
    const ifcText = [
      "#86=IFCSITE('006B3G1E5E$AG$cPSlrI4B',#5,'Vaziyet Plan',$,$,#89,$,$,.ELEMENT.,(48,8,10),(11,41,19),$,$,$);",
      "#20=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.35),$);",
      "#21=IFCPROPERTYSINGLEVALUE('KAKS',$,IFCREAL(1.8),$);",
      "#22=IFCPROPERTYSINGLEVALUE('CekmeOn',$,IFCREAL(5.0),$);",
      "#23=IFCPROPERTYSINGLEVALUE('CekmeYan',$,IFCREAL(3.0),$);",
      "#24=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#20,#21,#22,#23));",
      "#25=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#86),#24);",
    ].join("\n");

    const result = extractProjectComplianceData(ifcText);

    assert.equal(result.source, "ifc_site");
    assert.equal(result.taks, 0.35);
    assert.equal(result.kaks, 1.8);
    assert.equal(result.cekmeOn, 5.0);
    assert.equal(result.cekmeYan, 3.0);
    assert.equal(result.sourcePath, "#25/#24:Tr_Pset_CSB");
  });

  it("falls back to IfcBuilding when IfcSite has no Tr_Pset_CSB data", () => {
    const ifcText = [
      "#90=IFCBUILDING('3eFTCDGef1BuGQgXYTSwsw',#5,'Blok A',$,$,#93,$,$,.ELEMENT.,$,$,$);",
      "#20=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.4),$);",
      "#24=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#20));",
      "#25=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#90),#24);",
    ].join("\n");

    const result = extractProjectComplianceData(ifcText);

    assert.equal(result.source, "ifc_building");
    assert.equal(result.taks, 0.4);
  });

  it("prefers IfcSite over IfcBuilding when both carry Tr_Pset_CSB data", () => {
    const ifcText = [
      "#86=IFCSITE('006B3G1E5E$AG$cPSlrI4B',#5,'Vaziyet Plan',$,$,#89,$,$,.ELEMENT.,$,$,$,$,$);",
      "#90=IFCBUILDING('3eFTCDGef1BuGQgXYTSwsw',#5,'Blok A',$,$,#93,$,$,.ELEMENT.,$,$,$);",
      "#20=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.35),$);",
      "#24=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#20));",
      "#25=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#86),#24);",
      "#30=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.99),$);",
      "#34=IFCPROPERTYSET('1_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#30));",
      "#35=IFCRELDEFINESBYPROPERTIES('3LTCbz1ln0cBIf0n979fWN',#5,$,$,(#90),#34);",
    ].join("\n");

    const result = extractProjectComplianceData(ifcText);

    assert.equal(result.source, "ifc_site");
    assert.equal(result.taks, 0.35);
  });

  it("returns a null source when no IfcSite/IfcBuilding Tr_Pset_CSB data is present", () => {
    const result = extractProjectComplianceData("#10=IFCCOLUMN('x',#5,'K',$,$,#1,#2,$);");

    assert.equal(result.source, null);
    assert.equal(result.taks, undefined);
  });
});

describe("Tr_Pset_CSB integration through parseIfcText", () => {
  it("attaches pozNo to matching elements and reports compliance counts", () => {
    const ifcText = [
      "#10=IFCCOLUMN('3uKl6XxnD728DtNh4imxAX',#5,'Kolon S-100',$,$,#1,#2,$);",
      "#11=IFCPROPERTYSINGLEVALUE('PozNo',$,IFCTEXT('15.150.1001'),$);",
      "#12=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
      "#14=IFCBEAM('4vLm7YyoE839EuOi5jnyBY',#5,'Kiris K-100',$,$,#1,#2,$);",
      "#86=IFCSITE('006B3G1E5E$AG$cPSlrI4B',#5,'Vaziyet Plan',$,$,#89,$,$,.ELEMENT.,$,$,$,$,$);",
      "#20=IFCPROPERTYSINGLEVALUE('TAKS',$,IFCREAL(0.35),$);",
      "#24=IFCPROPERTYSET('1_JX4StCj7L8hBtpAcrRP4',#5,'Tr_Pset_CSB',$,(#20));",
      "#25=IFCRELDEFINESBYPROPERTIES('3LTCbz1ln0cBIf0n979fWN',#5,$,$,(#86),#24);",
    ].join("\n");

    const result = parseIfcText(ifcText);
    const column = result.elements.find((el) => el.id === "10");
    const beam = result.elements.find((el) => el.id === "14");

    assert.equal(column?.pozNo, "15.150.1001");
    assert.equal(beam?.pozNo, undefined);
    assert.equal(result.summary.elementsWithPozNoCount, 1);
    assert.equal(result.summary.elementsMissingPozNoCount, 1);
    assert.equal(result.summary.trPsetCsb.source, "ifc_site");
    assert.equal(result.summary.trPsetCsb.taks, 0.35);
  });
});
