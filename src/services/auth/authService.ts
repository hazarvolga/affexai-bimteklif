import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" &&
      (!secret || secret.trim().length < 32 || /^(change-me|super-secret|secret|password)/i.test(secret.trim()))) {
    throw new Error("JWT_SECRET must be a non-placeholder secret of at least 32 characters.");
  }
  return secret || "super-secret-key-teklifpro";
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static generateToken(payload: { userId: string; companyId: string | null; role: string | null }): string {
    return jwt.sign(payload, jwtSecret(), { expiresIn: "7d", algorithm: "HS256", jwtid: randomUUID() });
  }

  static generateImpersonationToken(payload: {
    userId: string;
    companyId: string;
    impersonatedBy: string;
    readOnly?: boolean;
  }): string {
    return jwt.sign({ ...payload, readOnly: payload.readOnly ?? true }, jwtSecret(), { expiresIn: "15m", algorithm: "HS256", jwtid: randomUUID() });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] });
    } catch {
      return null;
    }
  }
}
