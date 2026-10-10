import { AuthService } from "../../services/auth/authService";
import { db } from "../../db";
import { memberships, subscriptions, users } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

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
      };
    }
  }
}

type AuthUser = Pick<typeof users.$inferSelect, "email" | "emailVerified" | "passwordChangedAt" | "isSuperAdmin">;
type AuthMembership = Pick<typeof memberships.$inferSelect, "role">;
type AuthDependencies = {
  findUser(userId: string): Promise<AuthUser | undefined>;
  findMembership(userId: string, companyId: string): Promise<AuthMembership | undefined>;
};

const sessionClaims = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  iat: z.number().int().positive(),
  impersonatedBy: z.string().uuid().optional(),
  readOnly: z.boolean().optional(),
});

const authDependencies: AuthDependencies = {
  async findUser(userId) {
    const [user] = await db.select({
      email: users.email,
      emailVerified: users.emailVerified,
      passwordChangedAt: users.passwordChangedAt,
      isSuperAdmin: users.isSuperAdmin,
    }).from(users).where(eq(users.id, userId));
    return user;
  },
  async findMembership(userId, companyId) {
    const [membership] = await db.select({ role: memberships.role }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));
    return membership;
  },
};

export const createAuthenticate = (dependencies: AuthDependencies = authDependencies) => async (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    const token = typeof header === "string" ? /^Bearer ([^\s]+)$/i.exec(header)?.[1] : undefined;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const parsed = sessionClaims.safeParse(AuthService.verifyToken(token));
    if (!parsed.success) return res.status(401).json({ error: "Invalid token" });
    const { userId, companyId, iat, impersonatedBy, readOnly } = parsed.data;
    const user = await dependencies.findUser(userId);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    if (user.passwordChangedAt && iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) return res.status(401).json({ error: "Session expired" });

    // Tenant roles are live DB authority, never claims carried over from the JWT.
    const membership = companyId ? await dependencies.findMembership(userId, companyId) : undefined;
    if (companyId && !membership) return res.status(403).json({ error: "Forbidden: Company membership required" });
    req.user = {
      userId,
      companyId,
      role: membership?.role ?? null,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      impersonatedBy,
      readOnly,
    };

    // Impersonation read-only guard: block mutating methods
    if (req.user.impersonatedBy && req.user.readOnly && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return res.status(403).json({ error: "Salt-okunur impersonate modundasınız. Değişiklik yapılamaz.", code: "IMPERSONATION_READ_ONLY" });
    }

    // Suspended tenant guard: block mutating methods for non-active subscription
    if (!req.user.isSuperAdmin && !req.user.impersonatedBy && companyId && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const [sub] = await db.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
      if (sub && sub.status !== "active") {
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
  if (!req.user?.emailVerified) return res.status(403).json({ error: "Bu işlem için e-posta adresinizi doğrulamalısınız.", code: "EMAIL_VERIFICATION_REQUIRED" });
  next();
};

export const checkRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};

export const checkSuperAdmin = () => (req: any, res: any, next: any) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin only" });
  }
  next();
};
