import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { getControlDatabase } from '../../db/control-plane';
import type { subscriptions } from '../../db/schema';
import { describeQuotationAllowance, quotaUnavailable } from '../../services/billing/quota-policy';

type TenantRow = {
  id: string; name: string; created_at: Date; owner_email: string | null;
  subscription_id: string | null;
  subscription_status: typeof subscriptions.$inferSelect.status;
  legacy_plan: typeof subscriptions.$inferSelect.plan;
  plan_id: string | null; linked_plan_id: string | null; plan_name: string | null;
  monthly_quote_limit: number | null; plan_active: boolean | null;
  monthly_ifc_limit: number | null; ifc_max_file_mb: number | null; ifc_max_concurrent: number | null;
  bonus_quote_limit: number; bonus_ifc_limit: number;
  current_period_start: string; current_period_end: string | null;
  quota_period_key: string;
  plan_is_trial: boolean;
  current_usage: string; current_ifc_usage: string; invalid_usage: boolean;
  is_smartcheck_enabled: boolean; admin_notes: string | null;
};

function tenantStats(row: TenantRow, now: Date) {
  const current = Number(row.current_usage);
  const currentIfc = Number(row.current_ifc_usage || 0);
  if (row.invalid_usage || !Number.isSafeInteger(current) || current < 0) throw quotaUnavailable();
  const subscription = row.subscription_id ? {
    planId: row.plan_id, plan: row.legacy_plan, status: row.subscription_status,
    bonusQuoteLimit: row.bonus_quote_limit,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: row.current_period_end === null ? null : new Date(row.current_period_end),
  } : undefined;
  const plan = row.linked_plan_id ? {
    id: row.linked_plan_id, monthlyQuoteLimit: row.monthly_quote_limit!, isActive: row.plan_active!, isTrial: Boolean(row.plan_is_trial),
  } : undefined;
  const allowance = describeQuotationAllowance(subscription, plan, now);
  const reason = allowance.reason ?? (allowance.limit !== null && current >= allowance.limit ? 'QUOTA_EXCEEDED' : null);
  const { subscription_id, linked_plan_id, legacy_plan, plan_active, invalid_usage, quota_period_key, plan_is_trial, ...fields } = row;
  const ifcLimit = row.monthly_ifc_limit != null ? row.monthly_ifc_limit + (row.bonus_ifc_limit || 0) : null;
  return {
    ...fields, current_usage: current,
    current_ifc_usage: currentIfc,
    ifc_limit: ifcLimit,
    ifc_max_file_mb: row.ifc_max_file_mb ?? 50,
    ifc_max_concurrent: row.ifc_max_concurrent ?? 1,
    is_smartcheck_enabled: Boolean(row.is_smartcheck_enabled),
    admin_notes: row.admin_notes ?? null,
    plan_name: row.plan_name ?? (subscription && !row.plan_id ? row.legacy_plan : null),
    quota_limit: allowance.limit, quota_period: allowance.period,
    quota_available: reason === null, quota_reason: reason,
  };
}

export async function readAdminTenants() {
  // companies/subscriptions are FORCE RLS; the super admin view reads them as the control-plane role.
  return getControlDatabase().db.transaction(async tx => {
    const clock = await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`);
    const now = new Date(clock.rows[0].now);
    if (!Number.isFinite(now.getTime())) throw quotaUnavailable();
    const period = now.toISOString().slice(0, 7);
    const result = await tx.execute<Omit<TenantRow, 'current_usage' | 'current_ifc_usage' | 'invalid_usage'>>(sql`
      SELECT c.id, c.name, c.created_at, c.is_smartcheck_enabled, c.admin_notes, owners.owner_email,
        s.id AS subscription_id, s.status AS subscription_status, s.plan AS legacy_plan,
        s.plan_id, p.id AS linked_plan_id, p.name AS plan_name,
        p.monthly_quote_limit, p.is_active AS plan_active,
        p.monthly_ifc_limit, p.ifc_max_file_mb, p.ifc_max_concurrent,
        s.bonus_quote_limit, s.bonus_ifc_limit,
        s.current_period_start, s.current_period_end,
        CASE WHEN p.is_trial AND s.current_period_start IS NOT NULL AND s.current_period_end IS NOT NULL
          THEN to_char(s.current_period_start, 'YYYY-MM-DD') ELSE ${period} END AS quota_period_key,
        COALESCE(p.is_trial, false) AS plan_is_trial
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN (
        SELECT m.company_id, string_agg(u.email, ', ' ORDER BY u.email) AS owner_email
        FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.role = 'owner' GROUP BY m.company_id
      ) owners ON owners.company_id = c.id
      ORDER BY c.created_at DESC, c.id
    `);
    // usage_records has no RLS and is not a control-plane table: read it with the app role.
    const usage = await db.execute<{ company_id: string; period: string; quote_count: string; ifc_count: string; invalid_usage: boolean }>(sql`
      SELECT company_id, period, SUM(quote_count) AS quote_count, SUM(ifc_count) AS ifc_count,
        bool_or(quote_count < 0 OR quote_count IS NULL) AS invalid_usage
      FROM usage_records WHERE period = ${period} OR period ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' GROUP BY company_id, period
    `);
    const usageByCompany = new Map(usage.rows.map(row => [`${row.company_id}:${row.period}`, row]));
    return result.rows.map(row => {
      const counters = usageByCompany.get(`${row.id}:${row.quota_period_key}`);
      return tenantStats({
        ...row,
        current_usage: counters?.quote_count ?? '0',
        current_ifc_usage: counters?.ifc_count ?? '0',
        invalid_usage: counters?.invalid_usage ?? false,
      }, now);
    });
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}
