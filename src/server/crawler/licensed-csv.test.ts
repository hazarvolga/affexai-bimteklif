import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLicensedPriceCsv } from './licensed-csv';
const request={csv:'itemCode,itemName,unit,price\nA,Concrete,m3,123.45',fileName:'supplier.csv',licenseConfirmed:true,licenseReference:'Supplier written permission 2026',validityStart:'2026-01-01',validityEnd:'2026-12-31'};
test('licensed CSV refuses missing permission, malformed prices and duplicate codes',()=>{
 for(const override of [{licenseConfirmed:false},{licenseReference:''},{csv:'itemCode,itemName,unit,price\nA,X,m3,-1'},{csv:'itemCode,itemName,unit,price\nA,X,m3,1\nA,Y,m3,2'},{validityEnd:'2025-01-01'},{csv:'itemCode,itemName,unit,price\nA,X,m3,1e4'}]) assert.throws(()=>parseLicensedPriceCsv({...request,...override}));
});
test('licensed CSV fingerprints actual bytes and preserves bounded exact decimals',()=>{
 const result=parseLicensedPriceCsv(request);assert.equal(result.rows[0].price,'123.45');assert.match(result.documentHash,/^[a-f0-9]{64}$/);
 assert.equal(result.documentHash,parseLicensedPriceCsv(request).documentHash);
 assert.notEqual(result.documentHash,parseLicensedPriceCsv({...request,csv:request.csv+'\n'}).documentHash);
});
