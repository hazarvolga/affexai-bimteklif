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
      };
    }
  }
}

export const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const decoded = AuthService.verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  const [user] = await db.select({ passwordChangedAt: users.passwordChangedAt }).from(users).where(eq(users.id, decoded.userId));
  if (!user) return res.status(401).json({ error: "Invalid token" });
  if (user.passwordChangedAt && (!decoded.iat || decoded.iat * 1000 < user.passwordChangedAt.getTime())) return res.status(401).json({ error: "Session expired" });

  req.user = decoded;
  next();
};

export const checkRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};
