import assert from 'node:assert/strict';
import test from 'node:test';
import { containsEveryImportedPrice } from './catalog-reuse';

test('reuse preserves price normalization and duplicate semantics without mixing units or codes', () => {
 const current=[{itemCode:'A',unit:'m',crawledPrice:'100.00'},{itemCode:'A',unit:'kg',crawledPrice:'100'},{itemCode:'B',unit:'m',crawledPrice:'0'}];
 assert.equal(containsEveryImportedPrice([{itemCode:'A',unit:'m',price:'100'},{itemCode:'A',unit:'m',price:'100.0'}],current),true);
 assert.equal(containsEveryImportedPrice([{itemCode:'A',unit:'cm',price:'100'}],current),false);
 assert.equal(containsEveryImportedPrice([{itemCode:'B',unit:'m',price:'-0'}],current),true);
 assert.equal(containsEveryImportedPrice([{itemCode:'B',unit:'m',price:'NaN'}],[{itemCode:'B',unit:'m',crawledPrice:'NaN'}]),false);
});
test('reuse handles large catalog with linear key lookups including duplicate rows', () => {
 const current=Array.from({length:30000},(_,i)=>({itemCode:`C${i}`,unit:'m',crawledPrice:`${i}.00`}));
 const imported=current.map(row=>({itemCode:row.itemCode,unit:row.unit,price:row.crawledPrice}));
 assert.equal(containsEveryImportedPrice([...imported,imported[0]],current),true);
 assert.equal(containsEveryImportedPrice([...imported,{itemCode:'missing',unit:'m',price:'1'}],current),false);
});
