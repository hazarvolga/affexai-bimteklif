import assert from 'node:assert/strict';
import test from 'node:test';
import { countIfcTransferEvidence } from './BimIfcParserPage';
import type { ParsedIfcElement } from '../ifc/types';

test('parser quote handoff counts only attributable non-geometry IFC evidence', () => {
  const base: ParsedIfcElement = { id: '1', guid: 'G', type: 'IfcWall', name: 'Duvar', storey: '1', storeySource: 'estimate', volumeM3: 1, formworkM2: 0, rebarKg: 0, quantitySource: 'qto', smartCheckStatus: 'review' };
  assert.equal(countIfcTransferEvidence([
    { ...base, quantitySourcePath: '#1/Qto/NetVolume' },
    { ...base, quantitySourcePath: undefined },
    { ...base, quantitySource: 'property', quantitySourcePath: '  ' },
    { ...base, quantitySource: 'property', quantitySourcePath: '#1/#2:IfcShapeRepresentation/GeometryVolume' },
    { ...base, quantitySource: 'property', quantitySourcePath: '#1/Attributes/Hacim' },
  ]), 2);
});
