import { eq, sql } from 'drizzle-orm';
import { getControlDatabase } from '../../db/control-plane';
import { revokedSessions } from '../../db/schema';
import { AuthService } from '../../services/auth/authService';
import { hashActionToken } from './security';
import { ADMIN_COOKIE, SESSION_COOKIE, parseCookies } from './session-cookie';
import { z } from 'zod';

const claims = z.object({ userId: z.string().uuid(), exp: z.number().int().positive() });
type TokenRecord = { tokenHash: string; userId: string; expiresAt: Date };
type LogoutRequest = { headers: Record<string, string | string[] | undefined> };

export function collectRevocableTokens(req: LogoutRequest): TokenRecord[] {
  const authorization = req.headers.authorization;
  const bearer = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] : undefined;
  const cookie = req.headers.cookie;
  const cookies = parseCookies(typeof cookie === 'string' ? cookie : undefined);
  const tokens = new Set([bearer, cookies[SESSION_COOKIE], cookies[ADMIN_COOKIE]].filter((value): value is string => Boolean(value)));
  const records: TokenRecord[] = [];
  for (const token of tokens) {
    const parsed = claims.safeParse(AuthService.verifyToken(token));
    if (parsed.success) records.push({ tokenHash: hashActionToken(token), userId: parsed.data.userId, expiresAt: new Date(parsed.data.exp * 1000) });
  }
  return records;
}

export function createSessionRevoker(save: (records: TokenRecord[]) => Promise<void>) {
  return async (req: LogoutRequest) => {
    const records = collectRevocableTokens(req);
    if (records.length) await save(records);
  };
}

export const revokePresentedSessions = createSessionRevoker(async records => {
  await getControlDatabase().db.transaction(async tx => {
    for (const record of records) {
      await tx.execute(sql`SELECT public.bimmetraj_revoke_session(${record.tokenHash}, ${record.userId}::uuid, ${record.expiresAt.toISOString()}::timestamptz)`);
    }
    await tx.execute(sql`SELECT public.bimmetraj_cleanup_revoked_sessions()`);
  });
});

export async function isSessionRevoked(tokenHash: string): Promise<boolean> {
  const found = await getControlDatabase().db.select({ tokenHash: revokedSessions.tokenHash }).from(revokedSessions).where(eq(revokedSessions.tokenHash, tokenHash)).limit(1);
  return found.length > 0;
}
