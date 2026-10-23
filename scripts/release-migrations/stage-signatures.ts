// PostgreSQL 16 logical catalogs verified from empty-to-stage release SQL and
// independently materialized Drizzle snapshots. Never derive pins from a candidate
// database or its ledger. New stages require separate disposable verification/review.
const stages = [
  { tag: '0000_baseline',
    sql: '32765484c0e9ed02676301fca55a1930c21cb287cdbdd1c7e533a223fc48263d',
    snapshot: '6e273fb83c2810206e4d006c31912a46343bacffa99b347e579d3a324500fe29',
    catalog: 'ee012a21f5e1e5aa36418e52e3797201537457c9533e96d8936fecc13278c071' },
  { tag: '0001_admin_billing',
    sql: 'be59a2fc754c26a894adfbe1ac9f72913c3ae15777c4bdaba3dba3b68d858d38',
    snapshot: '05ded3b2cd5c1d32c530a6ec7572226d19a2292d932eb3d7590e5ef715fe8534',
    catalog: '3c04027a9691cb5dc9803687058a63446bc6a72f4a387f7d08f6f0e3d871652b' },
  { tag: '0002_quota_constraints',
    sql: '0d4520be2cd97dcb87b312fbaec53e8f2227e973baa01cf6edda0ba81e9d721d',
    snapshot: 'f903c4f85b18fe1b7e731d77e41d4ad1dfe6e2f6175cb6da8c4224a75b63d560',
    catalog: '4af9c0f3de75b11a7a55091b03c55245ce1a186d94156022e45a978c017908e6' },
  { tag: '0003_super_admin_ifc_limits',
    sql: '3426f48be90e4849ca947d1de7457bff6c34572a830454f0db82ce96ffab7634',
    snapshot: '18e2108edefc9cf2573299167ad8ade3624ab9a7acb69170ea03e61bfc52620d',
    catalog: '09c0bc6d8ded854bed2c3bf618b6a36d3a9f45daf5297a6283e78aa65399add2' },
  { tag: '0004_quota_consumed',
    sql: '91226dadbd2bc002e8a1f8a71e88cbed6cac99edc74b09408316a161bb4f30d2',
    snapshot: '2484253ecf85ca1b8177974d12471606d3db8fad0e0670ead2f179785794dceb',
    catalog: '4546828f9a3893380261ddc3538bb4a768d17e4f0fa1d3aa04d79e2e38af3aeb' },
  { tag: '0005_regional_pricing_sources',
    sql: '9aaa1793724cde5bcfcf37c0cc322780619a36e70ca769bcc42caf8d0f099828',
    snapshot: 'df0bf9d804db9072ee7e4ee01f47c1bbf9e41ef84436ec6b26848d27ccfb00a5',
    catalog: '9c1dfda2d5f6607f6e23316a74645cb266a49a19f880818eccd5004a4fc33d8d' },
  { tag: '0006_public_plan_catalog',
    sql: '5ab65226703cd3318eb257afd5ded49dfd162c5d4972a3d501fd5218af1166be',
    snapshot: '64343932b71070593f34ec84b4dd24395021affd459212064fad1ab548b6f911',
    catalog: 'f7778cc7858703a8c3bc2a63c7d581772b24aa17c105b9887acf781fba258ed4' },
  { tag: '0007_plan_feature_limits',
    sql: '076267ca8a2af4957c10ce658d1677a71521aa40954c1d4251149b0d506517e0',
    snapshot: '0a9e4fb342abff4dc0da2db7c1d672f7b617884c8cb0accccad34ae374452326',
    catalog: '59c032070d70522c6d32bd7a65c802049543e8256fb2633d5d32134c6ce72018' },
  { tag: '0008_pilot_exception_rows',
    sql: '8f70d3864074e4b704faafbf467dc61b032409e714d4938d580e7654ee21b1cb',
    snapshot: '65eaf36fbcc1611d0f969457b3b9fe02f098d2a968095cd05001eb1826f5e1f8',
    catalog: '39799e522bd0e03364fa4a7497fdc5cc1767e0da61d36c1a1118c69e86cbc1f7' },
  { tag: '0009_price_source_authorization',
    sql: '48fab3d1a4fff1bf1306222ab7984f0fec0561e8a68c048245b50e67cbf3fdfa',
    snapshot: 'e7ae6d386dc05d224aea6c9e841bf0a131410289a37c48faeaf793654a58ea5b',
    catalog: '74e00d182574c961f682dcc7fc75d818ee228d7e01bb76587f44e3de22b4a55d' },
] as const;

export function pinnedSignature(migration: { idx: number; tag: string; sha256: string; snapshotSha256: string }) {
  const stage = stages[migration.idx];
  if (!stage || stage.tag !== migration.tag || stage.sql !== migration.sha256 || stage.snapshot !== migration.snapshotSha256) {
    throw new Error('Unknown or modified migration history: no pinned release signature for artifact');
  }
  return stage.catalog;
}
