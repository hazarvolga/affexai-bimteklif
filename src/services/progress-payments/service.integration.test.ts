import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { useTestIsolation } from "../../server/routes/test-isolation";

const isolation = useTestIsolation();

const ids = {
  company: randomUUID(), maker: randomUUID(), checker: randomUUID(),
};

let service: import("./service").ProgressPaymentService;
let testPool: pg.Pool;

describe("revisioned progress payment service", { concurrency: 1 }, () => {
before(async () => {
  // The outer isolation hook must finish before opening pools. Root hooks run concurrently.
  const { readFile } = await import("node:fs/promises");
  const migration = await readFile(new URL("../../../drizzle-release/0012_progress_payment_evidence.sql", import.meta.url), "utf8");
  // LIKE does not copy triggers. Install the canonical evidence guards in this
  // isolated search_path so these assertions exercise actual DB enforcement.
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (/^CREATE (?:FUNCTION|(?:CONSTRAINT )?TRIGGER)\b/.test(statement.trim())) {
      await isolation.fixtureClient().query(statement);
    }
  }
  const triggerCount = await isolation.fixtureClient().query<{ count: number }>(
    "select count(*)::int as count from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=current_schema() and not t.tgisinternal"
  );
  assert.equal(triggerCount.rows[0]?.count, 18, "the complete migration 0012 trigger contract must be active in the isolated schema");
  const { ProgressPaymentService } = await import("./service");
  testPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  service = new ProgressPaymentService(testPool, async (database, _context, work) => {
    const client = await database.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  await testPool.query("insert into companies(id,name) values ($1,'Phase 6 fixture')", [ids.company]);
  await testPool.query("insert into users(id,email,full_name) values ($1,$3,'Maker'),($2,$4,'Checker')", [ids.maker, ids.checker, `maker-${ids.maker}@phase6.test`, `checker-${ids.checker}@phase6.test`]);
  await testPool.query("insert into memberships(user_id,company_id,role) values ($1,$3,'manager'),($2,$3,'manager')", [ids.maker, ids.checker, ids.company]);
});

after(async () => { await testPool.end(); });

  it("materializes cumulative quantities under maker-checker and preserves approved history", async () => {
    const maker = { companyId: ids.company, userId: ids.maker };
    const checker = { companyId: ids.company, userId: ids.checker };
    const detail = await service.createContract(maker, {
      contractNumber: "HP-2026-001", projectName: "Phase 6", currency: "TRY", regime: "4735",
      initialAmount: "1000.00", sourceDocumentHash: "a".repeat(64),
      items: [{ itemCode: "15.001", description: "Beton", unit: "m3", contractQuantity: "10.0000", unitPrice: "100.00", sourceHash: "b".repeat(64) }],
    });
    const contractId = (detail.contract as { id: string }).id;
    const itemId = (detail.items[0] as { id: string }).id;
    const period1 = await service.createPeriod(maker, contractId, { paymentNumber: 1, periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") }) as { id: string; version: number };
    await service.saveDraft(maker, period1.id, { expectedVersion: period1.version, measurements: [{ contractItemId: itemId, location: "A Blok", sourceType: "manual", quantity: "2.5000", unit: "m3", sourceIdentity: "manual:a-blok:1" }] });
    const draft1 = await service.periodDetail(maker, period1.id);
    const measurement1 = (draft1.measurements[0] as { id: string }).id;
    await assert.rejects(service.reviewMeasurements(maker, period1.id, "p1-maker-review", { expectedVersion: 1, decisions: [{ measurementId: measurement1, decision: "approved", reason: "Kontrol edildi" }] }), (error: any) => error.code === "MEASUREMENT_MAKER_CHECKER_REQUIRED");
    await service.reviewMeasurements(checker, period1.id, "p1-review", { expectedVersion: 1, decisions: [{ measurementId: measurement1, decision: "approved", reason: "Yer ve miktar kontrol edildi" }] });
    const reviewReplay = await service.reviewMeasurements(checker, period1.id, "p1-review", { expectedVersion: 1, decisions: [{ measurementId: measurement1, decision: "approved", reason: "Yer ve miktar kontrol edildi" }] });
    assert.equal(reviewReplay.replayed, true);
    await service.transition(maker, period1.id, "p1-submit", { action: "submit", expectedVersion: 2 });
    await assert.rejects(service.transition(maker, period1.id, "p1-self-approve", { action: "approve", expectedVersion: 3 }), (error: any) => error.code === "MAKER_CHECKER_REQUIRED");
    await service.transition(checker, period1.id, "p1-approve", { action: "approve", expectedVersion: 3 });
    const approved1 = await service.periodDetail(maker, period1.id);
    const scopeHash = (approved1.period as { scope_hash: string }).scope_hash;
    assert.match(scopeHash, /^[a-f0-9]{64}$/);
    const approvalReplay = await service.transition(checker, period1.id, "p1-approve", { action: "approve", expectedVersion: 3 });
    assert.equal(approvalReplay.replayed, true);
    assert.equal((approvalReplay.period as { scope_hash: string }).scope_hash, scopeHash);
    assert.ok(approved1.events.every((event: any) => !("idempotency_key" in event) && !("request_hash" in event) && !("actor_user_id" in event)));
    assert.ok(approved1.measurements.every((measurement: any) => !("created_by_user_id" in measurement) && !("reviewed_by_user_id" in measurement)));
    assert.deepEqual(approved1.lines.map((line: any) => ({ previous: line.previous_quantity, current: line.current_quantity, cumulative: line.cumulative_quantity, amount: line.current_amount })), [
      { previous: "0.0000", current: "2.5000", cumulative: "2.5000", amount: "250.00" },
    ]);
    await assert.rejects(testPool.query("update progress_payment_lines set current_quantity=9 where period_id=$1", [period1.id]), /append-only/);
    await assert.rejects(testPool.query("delete from progress_measurements where period_id=$1", [period1.id]), /non-draft/);

    const period2 = await service.createPeriod(maker, contractId, { paymentNumber: 2, periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") }) as { id: string; version: number };
    await service.saveDraft(maker, period2.id, { expectedVersion: period2.version, measurements: [{ contractItemId: itemId, location: "B Blok", sourceType: "manual", quantity: "1.2500", unit: "m3", sourceIdentity: "manual:b-blok:1" }] });
    const measurement2 = ((await service.periodDetail(maker, period2.id)).measurements[0] as { id: string }).id;
    await service.reviewMeasurements(checker, period2.id, "p2-review", { expectedVersion: 1, decisions: [{ measurementId: measurement2, decision: "approved", reason: "Yer ve miktar kontrol edildi" }] });
    await service.transition(maker, period2.id, "p2-submit", { action: "submit", expectedVersion: 2 });
    await service.transition(checker, period2.id, "p2-approve", { action: "approve", expectedVersion: 3 });
    const approved2 = await service.periodDetail(maker, period2.id);
    assert.deepEqual(approved2.lines.map((line: any) => ({ previous: line.previous_quantity, current: line.current_quantity, cumulative: line.cumulative_quantity, amount: line.cumulative_amount })), [
      { previous: "2.5000", current: "1.2500", cumulative: "3.7500", amount: "375.00" },
    ]);
    await assert.rejects(service.correct(maker, period1.id, "p1-correct-too-late", 4, "Ölçüm düzeltmesi"), (error: any) => error.code === "LATER_PERIOD_EXISTS");
    const corrected = await service.correct(maker, period2.id, "p2-correct", 4, "Ölçüm düzeltmesi");
    assert.equal(corrected.replayed, false);
    const correctionReplay = await service.correct(maker, period2.id, "p2-correct", 4, "Ölçüm düzeltmesi");
    assert.equal(correctionReplay.replayed, true);
    assert.equal((correctionReplay.period as { id: string }).id, (corrected.period as { id: string }).id);
    await assert.rejects(service.correct(maker, period2.id, "p2-correct", 4, "Farklı gerekçe"), (error: any) => error.code === "IDEMPOTENCY_KEY_REUSED");
  });

  it("enforces contract quantity cap and cumulative rounding delta", async () => {
    const maker = { companyId: ids.company, userId: ids.maker };
    const checker = { companyId: ids.company, userId: ids.checker };
    const detail = await service.createContract(maker, {
      contractNumber: "HP-ROUNDING", projectName: "Rounding", currency: "TRY", regime: "özel",
      initialAmount: "0.01", sourceDocumentHash: "c".repeat(64),
      items: [{ itemCode: "R-1", description: "Alt kuruş", unit: "ad", contractQuantity: "1.0000", unitPrice: "0.01", sourceHash: "d".repeat(64) }],
    });
    const contractId = (detail.contract as { id: string }).id;
    const itemId = (detail.items[0] as { id: string }).id;

    const approve = async (number: number, quantity: string) => {
      const period = await service.createPeriod(maker, contractId, { paymentNumber: number, periodStart: new Date(`2026-0${number}-01`), periodEnd: new Date(`2026-0${number}-02`) }) as { id: string; version: number };
      await service.saveDraft(maker, period.id, { expectedVersion: 0, measurements: [{ contractItemId: itemId, location: `P${number}`, sourceType: "manual", quantity, unit: "ad", sourceIdentity: `manual:rounding:${number}` }] });
      const measurementId = ((await service.periodDetail(maker, period.id)).measurements[0] as { id: string }).id;
      await service.reviewMeasurements(checker, period.id, `round-review-${number}`, { expectedVersion: 1, decisions: [{ measurementId, decision: "approved", reason: "Kontrol edildi" }] });
      await service.transition(maker, period.id, `round-submit-${number}`, { action: "submit", expectedVersion: 2 });
      await service.transition(checker, period.id, `round-approve-${number}`, { action: "approve", expectedVersion: 3 });
      return service.periodDetail(maker, period.id);
    };

    const firstPeriod = await approve(1, "0.5000");
    const secondPeriod = await approve(2, "0.5000");
    assert.equal((firstPeriod.lines[0] as any).current_amount, "0.01");
    assert.equal((secondPeriod.lines[0] as any).current_amount, "0.00");
    assert.equal((secondPeriod.lines[0] as any).cumulative_amount, "0.01");

    const period3 = await service.createPeriod(maker, contractId, { paymentNumber: 3, periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-02") }) as { id: string };
    await service.saveDraft(maker, period3.id, { expectedVersion: 0, measurements: [{ contractItemId: itemId, location: "P3", sourceType: "manual", quantity: "0.0001", unit: "ad", sourceIdentity: "manual:rounding:3" }] });
    const measurement3 = ((await service.periodDetail(maker, period3.id)).measurements[0] as { id: string }).id;
    await service.reviewMeasurements(checker, period3.id, "round-review-3", { expectedVersion: 1, decisions: [{ measurementId: measurement3, decision: "approved", reason: "Kontrol edildi" }] });
    await service.transition(maker, period3.id, "round-submit-3", { action: "submit", expectedVersion: 2 });
    await assert.rejects(service.transition(checker, period3.id, "round-approve-3", { action: "approve", expectedVersion: 3 }), (error: any) => error.code === "CONTRACT_QUANTITY_EXCEEDED");
    await assert.rejects(service.detail({ companyId: randomUUID(), userId: ids.maker }, contractId), (error: any) => error.code === "PROGRESS_CONTRACT_NOT_FOUND");
  });

  it("binds imported measurements to exact immutable canonical source evidence", async () => {
    const maker = { companyId: ids.company, userId: ids.maker };
    const checker = { companyId: ids.company, userId: ids.checker };
    const documentId = randomUUID();
    const runId = randomUUID();
    const rowId = randomUUID();
    await testPool.query(`insert into documents
      (id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256,status)
      values ($1,$2,$3,'phase6.xlsx','Phase 6 source','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',1,$4,$5,'completed')`,
    [documentId, ids.company, ids.maker, `phase6/${documentId}.xlsx`, "e".repeat(64)]);
    await testPool.query(`insert into document_processing_runs
      (id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,provider,model,progress_percent)
      values ($1,$2,$3,'succeeded','completed',$4,6,'xlsx-parser','canonical-v1',100)`,
    [runId, ids.company, documentId, `phase6-source-${runId}`]);
    await testPool.query(`insert into normalized_quantity_rows
      (id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,
       normalized_unit,normalized_quantity,review_status,reviewer_user_id,reviewed_at,reviewer_notes)
      values ($1,$2,$3,$4,'Metraj',7,'A7:D7','Beton','m3',2.5,'approved',$5,now(),'Kaynak satır kontrol edildi')`,
    [rowId, ids.company, documentId, runId, ids.checker]);

    const detail = await service.createContract(maker, {
      contractNumber: `HP-SOURCE-${documentId}`, projectName: "Source binding", currency: "TRY", regime: "4735",
      initialAmount: "1000.00", sourceDocumentHash: "e".repeat(64),
      items: [{ itemCode: "SRC-1", description: "Beton", unit: "m3", contractQuantity: "10.0000", unitPrice: "100.00", sourceHash: "f".repeat(64) }],
    });
    const contractId = (detail.contract as { id: string }).id;
    const itemId = (detail.items[0] as { id: string }).id;
    const period = await service.createPeriod(maker, contractId, { paymentNumber: 1, periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-04-30") }) as { id: string };
    const source = { sourceDocumentId: documentId, sourceProcessingRunId: runId, sourceQuantityRowId: rowId, sourceCellRange: "A7:D7" };

    await assert.rejects(service.saveDraft(maker, period.id, { expectedVersion: 0, measurements: [{
      contractItemId: itemId, location: "A Blok", sourceType: "xlsx", quantity: "2.5001", unit: "m3", sourceIdentity: "xlsx:metraj:7:bad", ...source,
    }] }), (error: any) => error.code === "MEASUREMENT_SOURCE_VALUE_MISMATCH");
    await assert.rejects(service.saveDraft(maker, period.id, { expectedVersion: 0, measurements: [{
      contractItemId: itemId, location: "A Blok", sourceType: "field_record", quantity: "2.5000", unit: "m3", sourceIdentity: "field:unbound", sourceDocumentId: documentId, sourceProcessingRunId: runId, sourceCellRange: "A7:D7",
    }] }), (error: any) => error.code === "FIELD_RECORD_MEASUREMENT_PIPELINE_UNAVAILABLE");
    await service.saveDraft(maker, period.id, { expectedVersion: 0, measurements: [{
      contractItemId: itemId, location: "A Blok", sourceType: "xlsx", quantity: "2.5000", unit: "m3", sourceIdentity: "xlsx:metraj:7", ...source,
    }] });

    await assert.rejects(testPool.query("update normalized_quantity_rows set normalized_quantity=3 where id=$1", [rowId]), /progress-bound source evidence is immutable/);
    await assert.rejects(testPool.query("update document_processing_runs set pipeline_version=7 where id=$1", [runId]), /progress-bound source evidence is immutable/);
    await assert.rejects(testPool.query("update documents set checksum_sha256=$1 where id=$2", ["0".repeat(64), documentId]), /progress-bound source evidence is immutable/);

    const measurementId = ((await service.periodDetail(maker, period.id)).measurements[0] as { id: string }).id;
    await service.reviewMeasurements(checker, period.id, "source-review", { expectedVersion: 1, decisions: [{ measurementId, decision: "approved", reason: "Kanonik kaynakla karşılaştırıldı" }] });
    await service.transition(maker, period.id, "source-submit", { action: "submit", expectedVersion: 2 });
    await service.transition(checker, period.id, "source-approve", { action: "approve", expectedVersion: 3 });
    assert.match(((await service.periodDetail(maker, period.id)).period as { scope_hash: string }).scope_hash, /^[a-f0-9]{64}$/);
  });
});
