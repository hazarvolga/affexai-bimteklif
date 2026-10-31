import { AuthService } from "../../services/auth/authService";
import { db, pool } from "../../db";
import { adminAuditLogs, memberships, subscriptions, users } from "../../db/schema";
import { withTenantDrizzleTransaction } from "../../db/tenant-context";
import { and, eq, sql } from "drizzle-orm";
import { hashActionToken } from "../auth/security";
import { isSameOriginMutation, readSessionToken } from "../auth/session-cookie";
import { z } from "zod";
import { isSessionRevoked } from "../auth/session-revocation";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        companyId: string;
        role: string;
        email: string;
        emailVerified: Date | null;
        isSuperAdmin?: boolean;
        impersonatedBy?: string;
        readOnly?: boolean;
        impersonationTokenHash?: string;
        mfaEpoch?: string;
        mfaCredentialVersion?: string;
      };
    }
  }
}

type AuthUser = Pick<typeof users.$inferSelect, "email" | "emailVerified" | "passwordChangedAt" | "isSuperAdmin"> & { mfaEpoch?: string | null; passwordHash?: string | null };
type AuthMembership = Pick<typeof memberships.$inferSelect, "role">;
type AuthDependencies = {
  findUser(userId: string): Promise<AuthUser | undefined>;
  findMembership(userId: string, companyId: string): Promise<AuthMembership | undefined>;
  isImpersonationRevoked?(tokenHash: string): Promise<boolean>;
  isSessionRevoked(tokenHash: string): Promise<boolean>;
  findSubscription?(companyId: string, userId: string): Promise<{ status: string } | undefined>;
};

const sessionClaims = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  impersonatedBy: z.string().uuid().optional(),
  readOnly: z.boolean().optional(),
  mfaEpoch: z.string().uuid().optional(),
  mfaCredentialVersion: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const authDependencies: AuthDependencies = {
  isSessionRevoked,
  async isImpersonationRevoked(tokenHash) {
    const rows = await db.select({ id: adminAuditLogs.id }).from(adminAuditLogs).where(and(
      eq(adminAuditLogs.action, "impersonation.ended"),
      sql`${adminAuditLogs.details}->>'tokenHash' = ${tokenHash}`,
    )).limit(1);
    return rows.length > 0;
  },
  async findUser(userId) {
    const [user] = await db.select({
      email: users.email,
      emailVerified: users.emailVerified,
      passwordChangedAt: users.passwordChangedAt,
      isSuperAdmin: users.isSuperAdmin,
      mfaEpoch: users.mfaEpoch,
      passwordHash: users.passwordHash,
    }).from(users).where(eq(users.id, userId));
    return user;
  },
  async findMembership(userId, companyId) {
    return withTenantDrizzleTransaction(pool, { userId, companyId }, async (tenantDb) => {
      const [membership] = await tenantDb.select({ role: memberships.role }).from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));
      return membership;
    });
  },
  async findSubscription(companyId, userId) {
    return withTenantDrizzleTransaction(pool, { userId, companyId }, async (tenantDb) => {
      const [sub] = await tenantDb.select({ status: subscriptions.status }).from(subscriptions)
        .where(eq(subscriptions.companyId, companyId));
      return sub;
    });
  },
};

export const emailVerificationRequired = { error: "Devam etmek için e-posta adresinizi doğrulamalısınız.", code: "EMAIL_VERIFICATION_REQUIRED" } as const;

export const createAuthenticate = (dependencies: AuthDependencies = authDependencies) => async (req: any, res: any, next: any) => {
  try {
    const session = readSessionToken(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    const { token } = session;
    // Cookie-borne sessions are ambient credentials: mutating requests must prove they come from our own origin (CSRF).
    if (session.source === "cookie" && !isSameOriginMutation(req)) {
      return res.status(403).json({ error: "Geçersiz istek kaynağı.", code: "CSRF_ORIGIN_MISMATCH" });
    }
    const parsed = sessionClaims.safeParse(AuthService.verifyToken(token));
    if (!parsed.success) return res.status(401).json({ error: "Invalid token" });
    const { userId, companyId, iat, impersonatedBy, readOnly } = parsed.data;
    if (!dependencies.isSessionRevoked || await dependencies.isSessionRevoked(hashActionToken(token))) return res.status(401).json({ error: "Session expired" });
    const user = await dependencies.findUser(userId);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    if (user.isSuperAdmin && user.emailVerified && user.mfaEpoch && (parsed.data.mfaEpoch !== user.mfaEpoch || !user.passwordHash || parsed.data.mfaCredentialVersion !== hashActionToken(user.passwordHash))) return res.status(401).json({ error: "MFA session required", code: "MFA_REQUIRED" });
    if (user.passwordChangedAt && iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) return res.status(401).json({ error: "Session expired" });
    // Unverified accounts have no usable session; only read-only support impersonation may open them.
    if (!user.emailVerified && !impersonatedBy) return res.status(403).json(emailVerificationRequired);
    const impersonationTokenHash = impersonatedBy ? hashActionToken(token) : undefined;
    if (impersonatedBy) {
      const admin = await dependencies.findUser(impersonatedBy);
      const revoked = !dependencies.isImpersonationRevoked || await dependencies.isImpersonationRevoked(impersonationTokenHash!);
      if (!admin?.isSuperAdmin || !admin.emailVerified || (admin.mfaEpoch && (parsed.data.mfaEpoch !== admin.mfaEpoch || !admin.passwordHash || parsed.data.mfaCredentialVersion !== hashActionToken(admin.passwordHash))) || (admin.passwordChangedAt && iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) || revoked) {
        return res.status(401).json({ error: "Impersonation session expired" });
      }
    }

    // Tenant roles are live DB authority, never claims carried over from the JWT.
    const membership = companyId ? await dependencies.findMembership(userId, companyId) : undefined;
    if (companyId && !membership) return res.status(403).json({ error: "Forbidden: Company membership required" });
    req.user = {
      userId,
      companyId,
      role: membership?.role ?? null,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: Boolean(user.isSuperAdmin && user.emailVerified && !impersonatedBy),
      impersonatedBy,
      readOnly: impersonatedBy ? readOnly !== false : Boolean(readOnly),
      impersonationTokenHash,
      mfaEpoch: parsed.data.mfaEpoch,
      mfaCredentialVersion: parsed.data.mfaCredentialVersion,
    };

    const isReadMethod = !req.method || ["GET", "HEAD", "OPTIONS"].includes(req.method);

    // Impersonation read-only guard: block mutating methods
    const isImpersonationExit = req.method === "POST" && req.originalUrl?.split("?")[0] === "/api/auth/impersonate/exit";
    if (req.user.impersonatedBy && req.user.readOnly && !isImpersonationExit && !isReadMethod) {
      return res.status(403).json({ error: "Salt-okunur impersonate modundasınız. Değişiklik yapılamaz.", code: "IMPERSONATION_READ_ONLY" });
    }

    // Suspended tenant guard: block mutating methods for non-active subscription
    if (!req.user.isSuperAdmin && companyId && !isReadMethod && dependencies.findSubscription) {
      const sub = await dependencies.findSubscription(companyId, userId);
      const path = req.originalUrl?.split('?')[0];
      const billingRecovery = req.method === 'POST' && !req.user.impersonatedBy && ['owner', 'admin'].includes(req.user.role) && (path === '/api/billing/payment-requests/init' || path === '/api/billing/payment-requests');
      const clientPrivacyRequest = req.method === 'POST' && !req.user.impersonatedBy && Boolean(req.user.emailVerified) && ['owner', 'admin'].includes(req.user.role) && typeof path === 'string' && /^\/api\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/privacy$/i.test(path);
      if (sub && sub.status !== "active" && !billingRecovery && !clientPrivacyRequest) {
        return res.status(403).json({
          error: "Aboneliğiniz askıya alınmıştır veya ödeme beklenmektedir. Lütfen aboneliğinizi yenileyiniz.",
          code: "SUBSCRIPTION_SUSPENDED",
        });
      }
    }
  } catch (error) {
    return next(error);
  }
  return next();
};

export const authenticate = createAuthenticate();

export const requireVerifiedEmail = (req: any, res: any, next: any) => {
  if (!req.user?.emailVerified) return res.status(403).json(emailVerificationRequired);
  next();
};

export const checkRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};

export const checkSuperAdmin = () => (req: any, res: any, next: any) => {
  if (!req.user || !req.user.isSuperAdmin || req.user.impersonatedBy || !req.user.emailVerified) {
    return res.status(403).json({ error: "Forbidden: Super Admin only" });
  }
  next();
};
