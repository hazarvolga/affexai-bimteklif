import test from 'node:test';
import assert from 'node:assert/strict';
import { volumeUnitResolver } from './units';

test('independent project volume and explicit conversion units', () => {
  const resolve = volumeUnitResolver(`#1=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#2=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#3=IFCUNITASSIGNMENT((#1,#2));
#4=IFCPROJECT('p',$,$,$,$,$,$,$, #3);
#5=IFCMEASUREWITHUNIT(IFCVOLUMEMEASURE(0.028316846592),#2);
#6=IFCCONVERSIONBASEDUNIT(#9,.VOLUMEUNIT.,'cubic foot', #5);`);
  assert.equal(resolve(), 1);
  assert.equal(resolve('#6'), 0.028316846592);
  assert.equal(resolve('#1'), null);
});

import { parseIfcText } from './legacy-parser';
import { extractIfcQtoVolumeQuantities } from './qto-extractor';
const fixture = (order: string) => `#10=IFCSLAB('1111111111111111111111',#1,'Slab',$,$,$,$,$,.FLOOR.);
#11=IFCQUANTITYVOLUME('NetVolume',$,$,8.,$);
#12=IFCQUANTITYVOLUME('GrossVolume',$,$,10.,$);
#13=IFCELEMENTQUANTITY('2222222222222222222222',#1,'Qto_SlabBaseQuantities',$,$,(${order}));
#14=IFCRELDEFINESBYPROPERTIES('3333333333333333333333',#1,$,$,(#10),#13);`;
test('net volume is order independent and conflicting sources are traced', () => {
  for (const order of ['#11,#12','#12,#11']) {
    const element = parseIfcText(fixture(order)).elements[0];
    assert.equal(element.volumeM3, 8);
    assert.match(element.smartCheckNote!, /IFC_QUANTITY_CONFLICT/);
    assert.match(element.smartCheckNote!, /GrossVolume=10/);
  }
});
test('declared unsupported volume units fail closed instead of admitting m3', () => {
  const text = fixture('#11') + '\n#50=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);\n#51=IFCUNITASSIGNMENT((#50));';
  assert.equal(extractIfcQtoVolumeQuantities(text).quantities.length, 0);
});
