import type pg from "pg";
import { pool } from "../../db";
import { withTenantTransaction, type TenantContext } from "../../db/tenant-context";
import { canonicalProgressRequestHash, type CreateConstructionContractInput, type CreateProgressPeriodInput, type ReviewProgressMeasurementsInput, type SaveProgressDraftInput, type ProgressTransitionInput } from "../../contracts/progress-payment";

type Actor = { companyId: string; userId: string };

export class ProgressPaymentServiceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

type Queryable = Pick<pg.PoolClient, "query">;
export type ProgressPaymentTenantTransactionRunner = <T>(pool: pg.Pool, context: TenantContext, work: (client: pg.PoolClient) => Promise<T>) => Promise<T>;

function first<T>(result: pg.QueryResult<T>): T | undefined { return result.rows[0]; }

function fixed(value: string, scale: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0") || "0");
}

function roundedItemAmount(quantity: string, unitPrice: string): bigint {
  const raw = fixed(quantity, 4) * fixed(unitPrice, 2);
  return (raw + 5_000n) / 10_000n;
}

export class ProgressPaymentService {
  constructor(
    private readonly database: pg.Pool = pool,
    private readonly tenantTransaction: ProgressPaymentTenantTransactionRunner = withTenantTransaction,
  ) {}

  private transaction<T>(actor: Actor, work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    return this.tenantTransaction(this.database, actor, work);
  }

  async createContract(actor: Actor, input: CreateConstructionContractInput) {
    return this.transaction(actor, async (client) => {
      if (input.sourceQuotationId) {
        const source = await client.query("select 1 from quotations where id = $1 and company_id = $2", [input.sourceQuotationId, actor.companyId]);
        if (!source.rowCount) throw new ProgressPaymentServiceError(404, "SOURCE_QUOTATION_NOT_FOUND", "Kaynak teklif bulunamadı.");
      }
      const sourcedItemIds = input.items.flatMap((item) => item.sourceQuotationItemId ? [item.sourceQuotationItemId] : []);
      if (sourcedItemIds.length && !input.sourceQuotationId) throw new ProgressPaymentServiceError(422, "SOURCE_QUOTATION_REQUIRED", "Kaynak teklif kalemi için kaynak teklif zorunludur.");
      if (sourcedItemIds.length) {
        const sourceItems = await client.query<{ id: string }>("select id from quotation_items where company_id=$1 and quotation_id=$2 and id=any($3::uuid[])", [actor.companyId, input.sourceQuotationId, sourcedItemIds]);
        if (sourceItems.rowCount !== new Set(sourcedItemIds).size) throw new ProgressPaymentServiceError(422, "SOURCE_QUOTATION_ITEM_MISMATCH", "Kaynak teklif kalemi seçilen teklife ait değil.");
      }
      const itemTotal = input.items.reduce((sum, item) => sum + roundedItemAmount(item.contractQuantity, item.unitPrice), 0n);
      if (itemTotal !== fixed(input.initialAmount, 2)) throw new ProgressPaymentServiceError(422, "CONTRACT_AMOUNT_MISMATCH", "Başlangıç sözleşme bedeli kalem toplamıyla uyuşmuyor.");
      const contract = first(await client.query(`insert into construction_contracts
        (company_id, source_quotation_id, contract_number, project_name, currency, regime, initial_amount, source_document_hash, status, created_by_user_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9) returning *`, [actor.companyId, input.sourceQuotationId ?? null, input.contractNumber, input.projectName, input.currency, input.regime, input.initialAmount, input.sourceDocumentHash, actor.userId]));
      if (!contract) throw new Error("Contract insert did not return a row");
      await client.query(`insert into construction_contract_items
        (company_id, contract_id, source_quotation_item_id, item_code, description, unit, contract_quantity, unit_price, source_hash)
        select $1, $2, source_quotation_item_id, item_code, description, unit, contract_quantity::numeric, unit_price::numeric, source_hash
        from jsonb_to_recordset($3::jsonb) as item(source_quotation_item_id uuid,item_code text,description text,unit text,contract_quantity text,unit_price text,source_hash text)`, [actor.companyId, (contract as { id: string }).id, JSON.stringify(input.items.map((item) => ({ source_quotation_item_id: item.sourceQuotationItemId ?? null, item_code: item.itemCode, description: item.description, unit: item.unit, contract_quantity: item.contractQuantity, unit_price: item.unitPrice, source_hash: item.sourceHash })))]);
      return this.detailWith(client, actor, (contract as { id: string }).id);
    });
  }

  async list(actor: Actor) {
    return this.transaction(actor, async (client) => (await client.query(`select c.id,c.contract_number,c.project_name,c.currency,c.regime,c.initial_amount,c.status,c.version,c.created_at,c.updated_at,
      count(distinct p.id)::int as period_count,
      count(distinct p.id) filter (where p.status = 'approved')::int as approved_period_count
      from construction_contracts c left join progress_payment_periods p on p.contract_id = c.id and p.company_id = c.company_id
      where c.company_id = $1 group by c.id order by c.created_at desc`, [actor.companyId])).rows);
  }

  async detail(actor: Actor, contractId: string) {
    return this.transaction(actor, (client) => this.detailWith(client, actor, contractId));
  }

  private async detailWith(queryable: Queryable, actor: Actor, contractId: string) {
    const contract = first(await queryable.query(`select id,source_quotation_id,contract_number,project_name,currency,regime,
      initial_amount,source_document_hash,status,version,created_at,updated_at
      from construction_contracts where id=$1 and company_id=$2`, [contractId, actor.companyId]));
    if (!contract) throw new ProgressPaymentServiceError(404, "PROGRESS_CONTRACT_NOT_FOUND", "Hakediş sözleşmesi bulunamadı.");
    const items = await queryable.query("select id,source_quotation_item_id,item_code,description,unit,contract_quantity,unit_price,source_hash,created_at from construction_contract_items where contract_id=$1 and company_id=$2 order by item_code", [contractId, actor.companyId]);
    const periods = await queryable.query(`select id,payment_number,revision_number,parent_period_id,period_start,period_end,status,is_current,
      version,scope_hash,correction_reason,submitted_at,approved_at,sealed_at,created_at,updated_at
      from progress_payment_periods where contract_id=$1 and company_id=$2 order by payment_number,revision_number`, [contractId, actor.companyId]);
    const variations = await queryable.query(`select id,variation_number,kind,amount,decision_document_hash,status,created_at
      from contract_variations where contract_id=$1 and company_id=$2 order by variation_number`, [contractId, actor.companyId]);
    return { contract, items: items.rows, periods: periods.rows, variations: variations.rows };
  }

  async createPeriod(actor: Actor, contractId: string, input: CreateProgressPeriodInput) {
    return this.transaction(actor, async (client) => {
      await this.lockContract(client, actor, contractId);
      const preceding = await client.query<{ payment_number: number; status: string }>("select payment_number,status from progress_payment_periods where company_id=$1 and contract_id=$2 and is_current=true order by payment_number desc limit 1 for update", [actor.companyId, contractId]);
      const latest = preceding.rows[0]?.payment_number ?? 0;
      if (latest > 0 && preceding.rows[0].status !== "approved") throw new ProgressPaymentServiceError(409, "PREVIOUS_PERIOD_NOT_APPROVED", "Yeni dönem için önceki güncel hakediş onaylı ve mühürlü olmalıdır.");
      if (input.paymentNumber !== latest + 1) throw new ProgressPaymentServiceError(409, "PAYMENT_NUMBER_SEQUENCE_INVALID", `Sıradaki hakediş numarası ${latest + 1} olmalıdır.`);
      return first(await client.query(`insert into progress_payment_periods
        (company_id, contract_id, payment_number, revision_number, period_start, period_end, status, is_current, version, created_by_user_id)
        values ($1,$2,$3,0,$4,$5,'draft',true,0,$6) returning *`, [actor.companyId, contractId, input.paymentNumber, input.periodStart, input.periodEnd, actor.userId]));
    });
  }

  async saveDraft(actor: Actor, periodId: string, input: SaveProgressDraftInput) {
    return this.transaction(actor, async (client) => {
      const period = await this.lockPeriod(client, actor, periodId);
      if (period.status !== "draft") throw new ProgressPaymentServiceError(409, "PERIOD_NOT_DRAFT", "Yalnız taslak dönemin ölçümleri düzenlenebilir.");
      if (period.version !== input.expectedVersion) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      const reviewed = await client.query("select 1 from progress_measurement_review_events where period_id=$1 and company_id=$2 limit 1", [periodId, actor.companyId]);
      if (reviewed.rowCount) throw new ProgressPaymentServiceError(409, "MEASUREMENT_REVIEW_ALREADY_RECORDED", "İnceleme kararı verilmiş ölçümler değiştirilemez; yeni dönem revizyonu gerekir.");
      const itemIds = [...new Set(input.measurements.map((measurement) => measurement.contractItemId))];
      const itemRows = await client.query<{ id: string; unit: string }>("select id,unit from construction_contract_items where company_id=$1 and contract_id=$2 and id=any($3::uuid[])", [actor.companyId, period.contract_id, itemIds]);
      const units = new Map(itemRows.rows.map((row) => [row.id, row.unit]));
      if (units.size !== itemIds.length) throw new ProgressPaymentServiceError(404, "CONTRACT_ITEM_NOT_FOUND", "Sözleşme kalemi bulunamadı.");
      for (const measurement of input.measurements) {
        if (units.get(measurement.contractItemId) !== measurement.unit) throw new ProgressPaymentServiceError(422, "MEASUREMENT_UNIT_MISMATCH", "Ölçüm birimi sözleşme kalemiyle uyuşmuyor.");
      }
      const external = input.measurements.filter((measurement) => measurement.sourceType !== "manual");
      if (external.some((measurement) => measurement.sourceType === "pdf")) throw new ProgressPaymentServiceError(422, "PDF_MEASUREMENT_PIPELINE_UNAVAILABLE", "PDF ölçüm satırı çıkarımı doğrulanmış bir pipeline bağlanana kadar kullanılamaz.");
      if (external.some((measurement) => measurement.sourceType === "field_record")) throw new ProgressPaymentServiceError(422, "FIELD_RECORD_MEASUREMENT_PIPELINE_UNAVAILABLE", "Saha ölçüm kaydı doğrulanmış ve değişmez bir kaynak satırına bağlanana kadar kullanılamaz.");
      if (external.length) {
        const evidence = await client.query<{ ordinal: number; source_quantity: string; source_unit: string }>(`select e.ordinal::int,
            n.normalized_quantity::text source_quantity, n.normalized_unit source_unit
          from jsonb_to_recordset($1::jsonb) as e(ordinal int, source_type text, document_id uuid, run_id uuid, row_id uuid, cell_range text)
          join documents d on d.id=e.document_id and d.company_id=$2 and d.status='completed'
          join document_processing_runs r on r.id=e.run_id and r.document_id=d.id and r.company_id=d.company_id and r.status='succeeded'
          join normalized_quantity_rows n on n.id=e.row_id and n.company_id=d.company_id and n.document_id=d.id and n.processing_run_id=r.id
            and n.source_cell_range=e.cell_range and n.review_status in ('approved','accepted_exception')
            and n.normalized_quantity is not null and n.normalized_unit is not null
          where e.source_type in ('ifc','xlsx')`, [JSON.stringify(external.map((measurement, ordinal) => ({ ordinal, source_type: measurement.sourceType, document_id: measurement.sourceDocumentId, run_id: measurement.sourceProcessingRunId, row_id: measurement.sourceQuantityRowId ?? null, cell_range: measurement.sourceCellRange }))), actor.companyId]);
        if (evidence.rowCount !== external.length) throw new ProgressPaymentServiceError(422, "MEASUREMENT_SOURCE_NOT_VERIFIED", "Ölçüm kaynağı aynı tenant içindeki başarılı koşu ve onaylı satırla doğrulanamadı.");
        for (const row of evidence.rows) {
          const measurement = external[row.ordinal];
          if (!measurement || fixed(measurement.quantity, 4) !== fixed(row.source_quantity, 4) || measurement.unit !== row.source_unit) {
            throw new ProgressPaymentServiceError(422, "MEASUREMENT_SOURCE_VALUE_MISMATCH", "Ölçüm miktarı ve birimi onaylı kaynak satırın kanonik değeriyle birebir uyuşmalıdır.");
          }
        }
      }
      await client.query("delete from progress_measurements where period_id=$1 and company_id=$2", [periodId, actor.companyId]);
      await client.query(`insert into progress_measurements
        (company_id, contract_id, period_id, contract_item_id, location, element_key, source_type, quantity, unit,
         source_document_id, source_processing_run_id, source_quantity_row_id, source_cell_range, source_identity, review_status, created_by_user_id)
        select $1,$2,$3,contract_item_id,location,element_key,source_type,quantity::numeric,unit,
          source_document_id,source_processing_run_id,source_quantity_row_id,source_cell_range,source_identity,'pending_review',$4
        from jsonb_to_recordset($5::jsonb) as m(contract_item_id uuid,location text,element_key text,source_type text,quantity text,unit text,
          source_document_id uuid,source_processing_run_id uuid,source_quantity_row_id uuid,source_cell_range text,source_identity text)`, [actor.companyId, period.contract_id, periodId, actor.userId, JSON.stringify(input.measurements.map((measurement) => ({ contract_item_id: measurement.contractItemId, location: measurement.location, element_key: measurement.elementKey ?? null, source_type: measurement.sourceType, quantity: measurement.quantity, unit: measurement.unit, source_document_id: measurement.sourceDocumentId ?? null, source_processing_run_id: measurement.sourceProcessingRunId ?? null, source_quantity_row_id: measurement.sourceQuantityRowId ?? null, source_cell_range: measurement.sourceCellRange ?? null, source_identity: measurement.sourceIdentity })))]);
      const updated = first(await client.query("update progress_payment_periods set version=version+1, updated_at=now() where id=$1 and company_id=$2 and version=$3 returning *", [periodId, actor.companyId, input.expectedVersion]));
      if (!updated) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      return updated;
    });
  }

  async reviewMeasurements(actor: Actor, periodId: string, idempotencyKey: string, input: ReviewProgressMeasurementsInput) {
    return this.transaction(actor, async (client) => {
      const period = await this.lockPeriod(client, actor, periodId);
      const requestHash = canonicalProgressRequestHash(input);
      const existing = await client.query<{ request_hash: string }>("select distinct request_hash from progress_measurement_review_events where company_id=$1 and period_id=$2 and idempotency_key=$3", [actor.companyId, periodId, idempotencyKey]);
      if (existing.rowCount) {
        if (existing.rows.some((row) => row.request_hash !== requestHash)) throw new ProgressPaymentServiceError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key farklı bir inceleme için kullanılmış.");
        return { replayed: true, period: first(await client.query("select * from progress_payment_periods where id=$1 and company_id=$2", [periodId, actor.companyId])) };
      }
      if (period.status !== "draft") throw new ProgressPaymentServiceError(409, "PERIOD_NOT_DRAFT", "Yalnız taslak ölçümler incelenebilir.");
      if (period.version !== input.expectedVersion) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      const ids = input.decisions.map((decision) => decision.measurementId);
      const measurements = await client.query<{ id: string; created_by_user_id: string; review_status: string }>("select id,created_by_user_id,review_status from progress_measurements where company_id=$1 and period_id=$2 and id=any($3::uuid[]) for update", [actor.companyId, periodId, ids]);
      if (measurements.rowCount !== ids.length) throw new ProgressPaymentServiceError(404, "MEASUREMENT_NOT_FOUND", "İncelenecek ölçüm bulunamadı.");
      if (measurements.rows.some((row) => row.created_by_user_id === actor.userId)) throw new ProgressPaymentServiceError(409, "MEASUREMENT_MAKER_CHECKER_REQUIRED", "Ölçümü kaydeden kullanıcı aynı ölçümü inceleyemez.");
      if (measurements.rows.some((row) => row.review_status !== "pending_review")) throw new ProgressPaymentServiceError(409, "MEASUREMENT_ALREADY_REVIEWED", "Ölçüm için daha önce karar verilmiş.");
      const resultingVersion = input.expectedVersion + 1;
      for (const decision of input.decisions) {
        await client.query("update progress_measurements set review_status=$1,reviewed_by_user_id=$2,reviewed_at=now(),review_reason=$3 where id=$4 and company_id=$5 and period_id=$6", [decision.decision, actor.userId, decision.reason, decision.measurementId, actor.companyId, periodId]);
        await client.query(`insert into progress_measurement_review_events
          (company_id,contract_id,period_id,measurement_id,decision,reason,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [actor.companyId, period.contract_id, periodId, decision.measurementId, decision.decision, decision.reason, input.expectedVersion, resultingVersion, idempotencyKey, requestHash, actor.userId]);
      }
      const updated = first(await client.query("update progress_payment_periods set version=$1,updated_at=now() where id=$2 and company_id=$3 and version=$4 returning *", [resultingVersion, periodId, actor.companyId, input.expectedVersion]));
      if (!updated) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      return { replayed: false, period: updated };
    });
  }

  async transition(actor: Actor, periodId: string, idempotencyKey: string, input: ProgressTransitionInput) {
    return this.transaction(actor, async (client) => {
      const period = await this.lockPeriod(client, actor, periodId);
      const requestHash = canonicalProgressRequestHash(input);
      const replay = first(await client.query<{ request_hash: string; resulting_version: number; to_status: string }>("select request_hash, resulting_version, to_status from progress_payment_events where company_id=$1 and period_id=$2 and idempotency_key=$3", [actor.companyId, periodId, idempotencyKey]));
      if (replay) {
        if (replay.request_hash !== requestHash) throw new ProgressPaymentServiceError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key farklı bir istek için kullanılmış.");
        return { replayed: true, period: first(await client.query("select * from progress_payment_periods where id=$1 and company_id=$2", [periodId, actor.companyId])) };
      }
      if (period.version !== input.expectedVersion) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      const toStatus = this.allowedTransition(period.status, input.action);
      if (input.action === "submit") await this.validateDraftForSubmission(client, actor, period);
      let approvalScopeHash: string | null = null;
      if (input.action === "approve") {
        if (period.submitted_by_user_id === actor.userId) throw new ProgressPaymentServiceError(409, "MAKER_CHECKER_REQUIRED", "Hakedişi hazırlayan kullanıcı aynı revizyonu onaylayamaz.");
        const incompletePredecessor = await client.query(`select 1 from progress_payment_periods
          where company_id=$1 and contract_id=$2 and is_current=true and payment_number<$3
            and (status<>'approved' or sealed_at is null or scope_hash is null) limit 1`, [actor.companyId, period.contract_id, period.payment_number]);
        if (incompletePredecessor.rowCount) throw new ProgressPaymentServiceError(409, "PREVIOUS_PERIOD_NOT_SEALED", "Onay için önceki tüm güncel hakedişler onaylı ve kapsam özetiyle mühürlü olmalıdır.");
        await this.materializeApprovedLines(client, actor, period);
        approvalScopeHash = await this.approvalScopeHash(client, actor, period);
      }
      const resultingVersion = input.expectedVersion + 1;
      const updated = first(await client.query(`update progress_payment_periods set status=$1, version=$2, updated_at=now(),
        submitted_by_user_id=case when $3='submit' then $4 else submitted_by_user_id end,
        submitted_at=case when $3='submit' then now() else submitted_at end,
        approved_by_user_id=case when $3='approve' then $4 else approved_by_user_id end,
        approved_at=case when $3='approve' then now() else approved_at end,
        sealed_at=case when $3='approve' then now() else sealed_at end,
        scope_hash=case when $3='approve' then $5 else scope_hash end
        where id=$6 and company_id=$7 and version=$8 returning *`, [toStatus, resultingVersion, input.action, actor.userId, approvalScopeHash, periodId, actor.companyId, input.expectedVersion]));
      if (!updated) throw new ProgressPaymentServiceError(409, "PERIOD_VERSION_CONFLICT", "Hakediş başka bir işlem tarafından güncellendi.");
      await client.query(`insert into progress_payment_events
        (company_id, contract_id, period_id, action, from_status, to_status, expected_version, resulting_version, idempotency_key, request_hash, reason, actor_user_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [actor.companyId, period.contract_id, periodId, input.action, period.status, toStatus, input.expectedVersion, resultingVersion, idempotencyKey, requestHash, input.reason ?? null, actor.userId]);
      return { replayed: false, period: updated };
    });
  }

  async correct(actor: Actor, periodId: string, idempotencyKey: string, expectedVersion: number, reason: string) {
    return this.transaction(actor, async (client) => {
      const period = await this.lockPeriod(client, actor, periodId);
      const requestHash = canonicalProgressRequestHash({ action: "correct", expectedVersion, reason });
      const existing = first(await client.query<{ request_hash: string }>("select request_hash from progress_payment_events where company_id=$1 and period_id=$2 and idempotency_key=$3", [actor.companyId, periodId, idempotencyKey]));
      if (existing) {
        if (existing.request_hash !== requestHash) throw new ProgressPaymentServiceError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key farklı bir düzeltme için kullanılmış.");
        const successor = first(await client.query("select * from progress_payment_periods where company_id=$1 and parent_period_id=$2 order by revision_number desc limit 1", [actor.companyId, periodId]));
        return { replayed: true, period: successor };
      }
      if (period.status !== "approved" || period.version !== expectedVersion) throw new ProgressPaymentServiceError(409, "APPROVED_PERIOD_REQUIRED", "Düzeltme için güncel onaylı dönem gerekir.");
      const later = await client.query("select 1 from progress_payment_periods where company_id=$1 and contract_id=$2 and payment_number>$3 and status<>'cancelled' limit 1", [actor.companyId, period.contract_id, period.payment_number]);
      if (later.rowCount) throw new ProgressPaymentServiceError(409, "LATER_PERIOD_EXISTS", "Sonraki iptal edilmemiş dönem varken geçmiş dönem düzeltilemez; kesin hesap incelemesi gerekir.");
      await client.query("update progress_payment_periods set status='superseded', is_current=false, version=version+1, updated_at=now() where id=$1 and company_id=$2", [periodId, actor.companyId]);
      const successor = first(await client.query(`insert into progress_payment_periods
        (company_id, contract_id, payment_number, revision_number, parent_period_id, period_start, period_end, status, is_current, version, correction_reason, created_by_user_id)
        values ($1,$2,$3,$4,$5,$6,$7,'draft',true,0,$8,$9) returning *`, [actor.companyId, period.contract_id, period.payment_number, period.revision_number + 1, periodId, period.period_start, period.period_end, reason, actor.userId]));
      await client.query(`insert into progress_measurements
        (company_id, contract_id, period_id, contract_item_id, parent_measurement_id, location, element_key, source_type, quantity, unit,
         source_document_id, source_processing_run_id, source_quantity_row_id, source_cell_range, source_identity, review_status, correction_reason, created_by_user_id)
        select company_id, contract_id, $1, contract_item_id, id, location, element_key, source_type, quantity, unit,
         source_document_id, source_processing_run_id, source_quantity_row_id, source_cell_range, source_identity || ':r' || $2, 'pending_review', $3, $4
        from progress_measurements where period_id=$5 and company_id=$6`, [(successor as { id: string }).id, period.revision_number + 1, reason, actor.userId, periodId, actor.companyId]);
      await client.query(`insert into progress_payment_events
        (company_id, contract_id, period_id, action, from_status, to_status, expected_version, resulting_version, idempotency_key, request_hash, reason, actor_user_id)
        values ($1,$2,$3,'correct','approved','superseded',$4,$5,$6,$7,$8,$9)`, [actor.companyId, period.contract_id, periodId, expectedVersion, expectedVersion + 1, idempotencyKey, requestHash, reason, actor.userId]);
      return { replayed: false, period: successor };
    });
  }

  async periodDetail(actor: Actor, periodId: string) {
    return this.transaction(actor, (client) => this.periodDetailWith(client, actor, periodId));
  }

  private async periodDetailWith(queryable: Queryable, actor: Actor, periodId: string) {
    const period = first(await queryable.query(`select id,contract_id,payment_number,revision_number,parent_period_id,
      period_start,period_end,status,is_current,version,scope_hash,correction_reason,submitted_at,approved_at,sealed_at,created_at,updated_at
      from progress_payment_periods where id=$1 and company_id=$2`, [periodId, actor.companyId]));
    if (!period) throw new ProgressPaymentServiceError(404, "PERIOD_NOT_FOUND", "Hakediş dönemi bulunamadı.");
    const measurements = await queryable.query(`select id,contract_item_id,parent_measurement_id,location,element_key,source_type,quantity,unit,
        source_document_id,source_processing_run_id,source_quantity_row_id,source_cell_range,source_identity,
        review_status,reviewed_at,review_reason,correction_reason,created_at
        from progress_measurements where period_id=$1 and company_id=$2 order by created_at,id`, [periodId, actor.companyId]);
    const lines = await queryable.query("select * from progress_payment_lines where period_id=$1 and company_id=$2 order by contract_item_id", [periodId, actor.companyId]);
    const adjustments = await queryable.query(`select id,adjustment_type,amount,evidence_hash,review_status,created_at
      from progress_payment_adjustments where period_id=$1 and company_id=$2 order by created_at,id`, [periodId, actor.companyId]);
    const events = await queryable.query(`select action,from_status,to_status,expected_version,resulting_version,reason,created_at
      from progress_payment_events where period_id=$1 and company_id=$2 order by created_at,id`, [periodId, actor.companyId]);
    return { period, measurements: measurements.rows, lines: lines.rows, adjustments: adjustments.rows, events: events.rows, documentLabel: "Yeşil Defter çalışma cetveli — resmî belge değildir" };
  }

  private async lockContract(client: Queryable, actor: Actor, contractId: string) {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`progress:${actor.companyId}:${contractId}`]);
    const contract = first(await client.query("select * from construction_contracts where id=$1 and company_id=$2 for update", [contractId, actor.companyId]));
    if (!contract) throw new ProgressPaymentServiceError(404, "PROGRESS_CONTRACT_NOT_FOUND", "Hakediş sözleşmesi bulunamadı.");
    return contract as Record<string, any>;
  }

  private async lockPeriod(client: Queryable, actor: Actor, periodId: string) {
    const lookup = first(await client.query("select contract_id from progress_payment_periods where id=$1 and company_id=$2", [periodId, actor.companyId]));
    if (!lookup) throw new ProgressPaymentServiceError(404, "PERIOD_NOT_FOUND", "Hakediş dönemi bulunamadı.");
    await this.lockContract(client, actor, (lookup as { contract_id: string }).contract_id);
    return first(await client.query("select * from progress_payment_periods where id=$1 and company_id=$2 for update", [periodId, actor.companyId])) as Record<string, any>;
  }

  private allowedTransition(status: string, action: ProgressTransitionInput["action"]): string {
    const transitions: Record<string, Partial<Record<ProgressTransitionInput["action"], string>>> = {
      draft: { submit: "submitted", cancel: "cancelled" },
      submitted: { approve: "approved", reject: "draft", cancel: "cancelled" },
    };
    const next = transitions[status]?.[action];
    if (!next) throw new ProgressPaymentServiceError(409, "PERIOD_TRANSITION_INVALID", `${status} durumunda ${action} işlemi yapılamaz.`);
    return next;
  }

  private async validateDraftForSubmission(client: Queryable, actor: Actor, period: Record<string, any>) {
    const result = await client.query<{ count: string; unreviewed: string }>(`select count(*)::text count,
      count(*) filter (where review_status <> 'approved')::text unreviewed
      from progress_measurements where period_id=$1 and company_id=$2`, [period.id, actor.companyId]);
    if (result.rows[0].count === "0") throw new ProgressPaymentServiceError(422, "MEASUREMENTS_REQUIRED", "Gönderim için en az bir ölçüm gerekir.");
    if (result.rows[0].unreviewed !== "0") throw new ProgressPaymentServiceError(422, "MEASUREMENT_REVIEW_REQUIRED", "Tüm ölçümler yetkili kullanıcı tarafından onaylanmalıdır.");
  }

  private async materializeApprovedLines(client: Queryable, actor: Actor, period: Record<string, any>) {
    const exceeded = await client.query(`with current_quantities as (
        select contract_item_id, sum(quantity)::numeric(20,4) current_quantity
        from progress_measurements where company_id=$1 and period_id=$2 and review_status='approved' group by contract_item_id
      ), previous_quantities as (
        select l.contract_item_id, coalesce(sum(l.current_quantity),0)::numeric(20,4) previous_quantity
        from progress_payment_lines l join progress_payment_periods p on p.id=l.period_id and p.company_id=l.company_id
        where l.company_id=$1 and l.contract_id=$3 and p.status='approved' and p.payment_number<$4 group by l.contract_item_id
      ) select i.id from current_quantities c
        join construction_contract_items i on i.id=c.contract_item_id and i.company_id=$1 and i.contract_id=$3
        left join previous_quantities p on p.contract_item_id=i.id
        where coalesce(p.previous_quantity,0)+c.current_quantity>i.contract_quantity limit 1`, [actor.companyId, period.id, period.contract_id, period.payment_number]);
    if (exceeded.rowCount) throw new ProgressPaymentServiceError(422, "CONTRACT_QUANTITY_EXCEEDED", "Kümülatif ölçüm sözleşme kalem miktarını aşıyor; onaylı kapsam değişikliği gerekir.");
    const inserted = await client.query(`with current_quantities as (
        select contract_item_id, sum(quantity)::numeric(20,4) current_quantity
        from progress_measurements where company_id=$1 and period_id=$2 and review_status='approved' group by contract_item_id
      ), previous_quantities as (
        select l.contract_item_id, coalesce(sum(l.current_quantity),0)::numeric(20,4) previous_quantity
        from progress_payment_lines l join progress_payment_periods p on p.id=l.period_id and p.company_id=l.company_id
        where l.company_id=$1 and l.contract_id=$3 and p.status='approved' and p.payment_number < $4 group by l.contract_item_id
      ) insert into progress_payment_lines
        (company_id, contract_id, period_id, contract_item_id, previous_quantity, current_quantity, cumulative_quantity,
         unit_price_snapshot, current_amount, cumulative_amount)
      select $1, $3, $2, i.id, coalesce(p.previous_quantity,0), c.current_quantity,
        coalesce(p.previous_quantity,0)+c.current_quantity, i.unit_price,
        round((coalesce(p.previous_quantity,0)+c.current_quantity)*i.unit_price,2)-round(coalesce(p.previous_quantity,0)*i.unit_price,2),
        round((coalesce(p.previous_quantity,0)+c.current_quantity)*i.unit_price,2)
      from current_quantities c join construction_contract_items i on i.id=c.contract_item_id and i.company_id=$1 and i.contract_id=$3
      left join previous_quantities p on p.contract_item_id=i.id
      returning id`, [actor.companyId, period.id, period.contract_id, period.payment_number]);
    if (!inserted.rowCount) throw new ProgressPaymentServiceError(422, "APPROVED_MEASUREMENTS_REQUIRED", "Onay için onaylanmış ölçüm gerekir.");
  }

  private async approvalScopeHash(client: Queryable, actor: Actor, period: Record<string, any>): Promise<string> {
    const measurements = await client.query(`select id,contract_item_id,parent_measurement_id,location,element_key,source_type,quantity::text quantity,unit,
      source_document_id,source_processing_run_id,source_quantity_row_id,source_cell_range,source_identity,review_status,
      reviewed_by_user_id,reviewed_at,coalesce(review_reason,'') review_reason
      from progress_measurements where company_id=$1 and period_id=$2 order by id`, [actor.companyId, period.id]);
    const sourceEvidence = await client.query(`select m.id measurement_id,
      d.id document_id,d.checksum_sha256 document_checksum_sha256,d.status document_status,
      r.id processing_run_id,r.pipeline_version,r.provider,r.model,r.status processing_status,r.current_stage,
      n.id source_row_id,n.sheet_name,n.source_row_number,n.source_cell_range,n.raw_description,n.raw_position_code,n.raw_unit,n.raw_quantity,
      n.formula_json,n.normalized_description,n.normalized_position_code,n.normalized_unit,n.normalized_quantity::text normalized_quantity,
      n.normalized_waste_percent::text normalized_waste_percent,n.quantity_source,n.mapping_confidence::text mapping_confidence,
      n.review_status source_review_status,n.reviewer_user_id,n.reviewed_at source_reviewed_at,n.reviewer_notes,n.findings_json
      from progress_measurements m
      join documents d on d.id=m.source_document_id and d.company_id=m.company_id
      join document_processing_runs r on r.id=m.source_processing_run_id and r.document_id=d.id and r.company_id=d.company_id
      join normalized_quantity_rows n on n.id=m.source_quantity_row_id and n.company_id=m.company_id
        and n.document_id=d.id and n.processing_run_id=r.id
      where m.company_id=$1 and m.period_id=$2 and m.source_type in ('ifc','xlsx')
      order by m.id`, [actor.companyId, period.id]);
    const reviewEvents = await client.query(`select id,measurement_id,decision,reason,expected_version,resulting_version,
      request_hash,actor_user_id,created_at
      from progress_measurement_review_events where company_id=$1 and period_id=$2
      order by measurement_id,id`, [actor.companyId, period.id]);
    const lines = await client.query(`select contract_item_id,previous_quantity::text previous_quantity,current_quantity::text current_quantity,
      cumulative_quantity::text cumulative_quantity,unit_price_snapshot::text unit_price_snapshot,
      current_amount::text current_amount,cumulative_amount::text cumulative_amount
      from progress_payment_lines where company_id=$1 and period_id=$2 order by contract_item_id`, [actor.companyId, period.id]);
    return canonicalProgressRequestHash({
      contractId: period.contract_id,
      paymentNumber: period.payment_number,
      revisionNumber: period.revision_number,
      periodStart: new Date(period.period_start).toISOString(),
      periodEnd: new Date(period.period_end).toISOString(),
      measurements: measurements.rows,
      sourceEvidence: sourceEvidence.rows,
      reviewEvents: reviewEvents.rows,
      lines: lines.rows,
    });
  }
}

export const progressPaymentService = new ProgressPaymentService();
