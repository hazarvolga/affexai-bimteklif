import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { summarizeQuotes, fetchAllQuotes } from './dashboard-summary';
import { QuoteStatus } from '../types';

test('counts all currencies and separates active volumes and decisions', () => {
  const now = Date.now();
  const rows = [
    { id:'1', status:QuoteStatus.SENT, currency:'TRY', grandTotal:'100', expiryDate:now+1000 },
    { id:'2', status:QuoteStatus.NEGOTIATION, currency:'USD', grandTotal:'200', expiryDate:now+1000 },
    { id:'3', status:QuoteStatus.DRAFT, currency:'EUR', grandTotal:'50', expiryDate:now+1000 },
    { id:'4', status:QuoteStatus.WON, currency:'USD', grandTotal:'999', expiryDate:now+1000 },
    { id:'5', status:QuoteStatus.LOST, currency:'TRY', grandTotal:'20', expiryDate:now+1000 },
  ];
  const result = summarizeQuotes(rows as never, now);
  assert.equal(result.active.length, 3); assert.equal(result.pendingDecisions.length, 2); assert.equal(result.expiringSoon.length, 2); assert.equal(result.winRate, 50);
  assert.deepEqual(result.volumes, [{currency:'EUR',total:50},{currency:'TRY',total:100},{currency:'USD',total:200}]);
});

test('loads every page and fails closed on malformed or failed page', async () => {
  let calls = 0; const fetcher = async () => ({ ok:true, json: async () => (++calls === 1 ? Array.from({length:100},(_,i)=>({id:String(i)})) : [{id:'100'}]) });
  assert.equal((await fetchAllQuotes(fetcher as never)).quotes.length,101);
  await assert.rejects(fetchAllQuotes((async()=>({ok:true,json:async()=>({})})) as never));
  await assert.rejects(fetchAllQuotes((async()=>({ok:false})) as never));
});

test('bounds loading at 1000 and marks totals partial', async () => { let calls=0; const fetcher=async () => ({ok:true,json:async()=>Array.from({length:100},(_,i)=>({id:String(calls*100+i)}))}); const wrapped=async () => { const result=await fetcher(); calls++; return result; }; const result=await fetchAllQuotes(wrapped as never); assert.equal(calls,10); assert.equal(result.quotes.length,1000); assert.equal(result.truncated,true); });
test('refuses duplicate records across pages and a failure on later pages', async () => {
 let n=0; const first=Array.from({length:100},(_,i)=>({id:String(i)}));
 await assert.rejects(fetchAllQuotes((async()=>({ok:true,json:async()=>++n===1?first:[{id:'0'}]})) as never));
 n=0; await assert.rejects(fetchAllQuotes((async()=>++n===1?{ok:true,json:async()=>first}:{ok:false}) as never));
});
