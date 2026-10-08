import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const tenants = await db.execute(sql`
        SELECT 
          c.id, c.name, c.created_at,
          u.email as owner_email,
          s.status as subscription_status,
          p.name as plan_name,
          p.monthly_quote_limit,
          s.bonus_quote_limit,
          s.current_period_start,
          s.current_period_end,
          COALESCE(ur.quote_count, 0) as current_usage
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN memberships m ON m.company_id = c.id AND m.role = 'owner'
        LEFT JOIN users u ON u.id = m.user_id
        LEFT JOIN usage_records ur ON ur.company_id = c.id AND ur.period = to_char(CURRENT_DATE, 'YYYY-MM')
        ORDER BY c.created_at DESC
      `);
      console.log(tenants);
      process.exit(0);
  } catch (err) {
      console.error(err);
      process.exit(1);
  }
}
run();
