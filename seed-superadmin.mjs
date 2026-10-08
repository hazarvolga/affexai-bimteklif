import { db } from "./src/db/index.js";
import { users, companies, memberships } from "./src/db/schema.js";
import { AuthService } from "./src/services/auth/authService.js";

async function run() {
  const email = "admin@teklifpro.ai";
  const password = "admin123";
  const name = "Sistem Super Admin";
  
  const hash = await AuthService.hashPassword(password);
  
  // Create user
  const [user] = await db.insert(users).values({
    email,
    passwordHash: hash,
    fullName: name,
    emailVerified: new Date(),
  }).returning();
  
  // Create system company
  const [company] = await db.insert(companies).values({
    name: "TeklifPro System",
    industry: "Software",
    tenantType: "enterprise",
  }).returning();
  
  // Create membership
  await db.insert(memberships).values({
    userId: user.id,
    companyId: company.id,
    role: "owner"
  });
  
  console.log("Super admin created: admin@teklifpro.ai / admin123");
  process.exit(0);
}

run().catch(console.error);
