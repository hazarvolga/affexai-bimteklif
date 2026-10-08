import postgres from "postgres";

const sql = postgres("postgres://hazarekiz@localhost:5432/teklifpro_local");

async function run() {
  try {
    // plans table
    await sql`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        monthly_quote_limit INTEGER NOT NULL,
        monthly_price INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `;

    // users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false NOT NULL;`;

    // subscriptions table
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);`;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS bonus_quote_limit INTEGER DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP DEFAULT now() NOT NULL;`;

    // usage_records table
    await sql`
      CREATE TABLE IF NOT EXISTS usage_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) NOT NULL,
        period TEXT NOT NULL,
        quote_count INTEGER DEFAULT 0 NOT NULL
      );
    `;

    // admin_audit_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) NOT NULL,
        target_company_id UUID REFERENCES companies(id),
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `;

    await sql`UPDATE users SET is_super_admin = true WHERE email = 'admin@teklifpro.ai';`;

    console.log("Migration successful");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}
run();
