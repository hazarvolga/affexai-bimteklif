import { AuthService } from "../../services/auth/authService";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

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
      };
    }
  }
}

export const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const decoded = AuthService.verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  const [user] = await db.select({ 
    email: users.email, 
    emailVerified: users.emailVerified, 
    passwordChangedAt: users.passwordChangedAt,
    isSuperAdmin: users.isSuperAdmin 
  }).from(users).where(eq(users.id, decoded.userId));
  
  if (!user) return res.status(401).json({ error: "Invalid token" });
  if (user.passwordChangedAt && (!decoded.iat || decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))) return res.status(401).json({ error: "Session expired" });

  req.user = { ...decoded, email: user.email, emailVerified: user.emailVerified, isSuperAdmin: user.isSuperAdmin };
  next();
};

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
