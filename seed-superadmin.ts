import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const plansCount = await db.execute(sql`SELECT count(*) FROM plans;`);
    const c = plansCount.rows[0]?.count || 0;
    if (Number(c) === 0) {
      console.log("Seeding plans...");
      const plans = await db.execute(sql`
        INSERT INTO plans (name, monthly_quote_limit, monthly_price, is_active)
        VALUES 
        ('Başlangıç', 15, 499, true),
        ('Profesyonel', 50, 1299, true),
        ('Kurumsal', 99999, 2999, true)
        RETURNING id, name;
      `);
      
      const compRes = await db.execute(sql`SELECT id FROM companies LIMIT 1;`);
      if (compRes.rows.length > 0) {
        const compId = compRes.rows[0].id;
        const profPlanId = plans.rows.find(p => p.name === 'Profesyonel').id;
        
        await db.execute(sql`
          UPDATE subscriptions 
          SET plan_id = ${profPlanId}, status = 'active'
          WHERE company_id = ${compId};
        `);

        await db.execute(sql`
          INSERT INTO usage_records (company_id, period, quote_count)
          VALUES (${compId}, to_char(CURRENT_DATE, 'YYYY-MM'), 12)
          ON CONFLICT DO NOTHING;
        `);
      }
      console.log("Seeded plans.");
    } else {
      console.log("Plans already exist.");
    }
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}
run();
