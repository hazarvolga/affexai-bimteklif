import postgres from "postgres";

const sql = postgres("postgres://hazarekiz@localhost:5432/teklifpro_local");

async function run() {
  try {
    const plansCount = await sql`SELECT count(*) FROM plans;`;
    if (Number(plansCount[0].count) === 0) {
      console.log("Seeding plans...");
      const plans = await sql`
        INSERT INTO plans (name, monthly_quote_limit, monthly_price, is_active)
        VALUES 
        ('Başlangıç', 15, 499, true),
        ('Profesyonel', 50, 1299, true),
        ('Kurumsal', 99999, 2999, true)
        RETURNING id, name;
      `;
      
      const compRes = await sql`SELECT id FROM companies LIMIT 1;`;
      if (compRes.length > 0) {
        const compId = compRes[0].id;
        const profPlanId = plans.find(p => p.name === 'Profesyonel').id;
        
        await sql`
          UPDATE subscriptions 
          SET plan_id = ${profPlanId}, status = 'active'
          WHERE company_id = ${compId};
        `;

        await sql`
          INSERT INTO usage_records (company_id, period, quote_count)
          VALUES (${compId}, to_char(CURRENT_DATE, 'YYYY-MM'), 12)
          ON CONFLICT DO NOTHING;
        `;
      }
      console.log("Seeded plans.");
    } else {
      console.log("Plans already exist.");
    }
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await sql.end();
  }
}
run();
