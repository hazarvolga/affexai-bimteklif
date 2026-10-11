import assert from 'node:assert/strict';
import type pg from 'pg';
import { catalog } from './catalog';
import { applyMigrations, type Migration } from './runner';

const company = '11111111-1111-4111-8111-111111111111';
const cases = [
  { table: 'usage_records', code: '23505', constraint: 'usage_records_company_id_period_key',
    sql: `insert into usage_records(company_id,period,quote_count) values ('${company}','2026-10',1),('${company}','2026-10',2)` },
  { table: 'usage_records', code: '23514', constraint: 'usage_records_quote_count_nonnegative',
    sql: `insert into usage_records(company_id,period,quote_count) values ('${company}','2026-10',-1)` },
  { table: 'plans', code: '23514', constraint: 'plans_monthly_quote_limit_nonnegative',
    sql: "insert into plans(name,monthly_quote_limit,monthly_price) values ('Invalid synthetic plan',-1,0)" },
  { table: 'plans', code: '23514', constraint: 'plans_monthly_price_nonnegative',
    sql: "insert into plans(name,monthly_quote_limit,monthly_price) values ('Invalid synthetic plan',0,-1)" },
  { table: 'subscriptions', code: '23514', constraint: 'subscriptions_bonus_quote_limit_nonnegative',
    sql: `insert into subscriptions(company_id,bonus_quote_limit) values ('${company}',-1)` },
];

// Invoked only by the provisioning harness on its owned upgrade database at 0001.
export async function verifyQuotaMigration(client: pg.Client, migrations: Migration[]) {
  const before = await catalog(client);
  const ledger = (await client.query('select * from teklifpro_release.migrations order by idx')).rows;
  for (const fixture of cases) {
    const inserted = (await client.query(`${fixture.sql} returning *`)).rows;
    const data = (await client.query(`select * from ${fixture.table} order by id`)).rows;
    await assert.rejects(applyMigrations(client, migrations), { code: fixture.code, constraint: fixture.constraint });
    assert.deepEqual((await client.query(`select * from ${fixture.table} order by id`)).rows, data);
    assert.deepEqual((await client.query('select * from teklifpro_release.migrations order by idx')).rows, ledger);
    assert.equal((await catalog(client)).signature, before.signature);
    // Remove only this test's synthetic rows after proving no migration repaired them.
    await client.query(`delete from ${fixture.table} where id = any($1::uuid[])`, [inserted.map(row => row.id)]);
  }
  assert.deepEqual(await applyMigrations(client, migrations), migrations.slice(2).map(m => m.tag));
  for (const fixture of cases) {
    await assert.rejects(client.query(fixture.sql), { code: fixture.code, constraint: fixture.constraint });
  }
  await client.query(`insert into usage_records(company_id,period,quote_count) values ('${company}','2026-10',0),('${company}','2026-11',1)`);
  await client.query("insert into companies(id,name) values ('22222222-2222-4222-8222-222222222222','Second synthetic tenant')");
  await client.query("insert into usage_records(company_id,period,quote_count) values ('22222222-2222-4222-8222-222222222222','2026-10',0)");
  await client.query("insert into plans(name,monthly_quote_limit,monthly_price) values ('Synthetic zero plan',0,0)");
  await client.query(`insert into subscriptions(company_id,bonus_quote_limit) values ('${company}',0)`);
  assert.deepEqual(await applyMigrations(client, migrations), []);
}
