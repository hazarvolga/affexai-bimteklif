import { randomBytes, randomUUID } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getControlDatabase } from '../../db/control-plane';
import { adminMfaAccounts, adminMfaChallenges, adminAuditLogs, users } from '../../db/schema';
import { AuthService } from '../../services/auth/authService';
import { authenticate } from '../middleware/auth';
import { clientAddress, consumeRateLimit, hashActionToken } from './security';
import { base32, decryptMfaSecret, encryptMfaSecret, generateRecoveryCodes, hashRecoveryCode, matchTotpCounter } from './mfa-crypto';

type SessionIssuer = (req: Request, res: Response, user: typeof users.$inferSelect, mfaEpoch?: string, recoveryCodes?: string[]) => Promise<unknown>;
function key(): string { return process.env.MFA_ENCRYPTION_KEY || ''; }
const db = () => getControlDatabase().db;

async function rate(res: Response, identity: string): Promise<boolean> {
  try {
    const result = await consumeRateLimit(identity, 10, 15 * 60 * 1000);
    if (!result.allowed) { res.set('Retry-After', String(result.retryAfterSeconds)).status(429).json({ error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' }); return false; }
    return true;
  } catch { res.status(503).json({ error: 'Kimlik doğrulama hizmeti kullanılamıyor.' }); return false; }
}

export async function createMfaChallenge(userId: string, passwordHash: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  await db().transaction(async tx => {
    await tx.insert(adminMfaChallenges).values({ challengeHash: hashActionToken(raw), userId, passwordFingerprint: hashActionToken(passwordHash), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    await tx.execute(sql`DELETE FROM public.admin_mfa_challenges WHERE challenge_hash IN (SELECT challenge_hash FROM public.admin_mfa_challenges WHERE expires_at < clock_timestamp() - interval '7 days' ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED)`);
  });
  return raw;
}

export function registerMfaRoutes(app: Express, issueSession: SessionIssuer) {
  app.get('/api/auth/mfa/status', authenticate, async (req, res) => {
    if (!req.user.isSuperAdmin || req.user.impersonatedBy) return res.status(403).json({ error: 'Yetkisiz.' });
    return res.json({ enabled: Boolean(req.user.mfaEpoch) });
  });
  app.post('/api/auth/mfa/enroll/start', authenticate, async (req, res) => {
    if (!req.user.isSuperAdmin || req.user.impersonatedBy) return res.status(403).json({ error: 'Yetkisiz.' });
    res.set('Cache-Control', 'no-store');
    if (!(await rate(res, `mfa-enroll:${req.user.userId}`))) return;
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    try {
      const [user] = await db().select().from(users).where(eq(users.id, req.user.userId));
      if (!user?.isSuperAdmin || !user.emailVerified || user.mfaEpoch) return res.status(409).json({ error: 'MFA zaten etkin veya hesap uygun değil.' });
      if (!(await AuthService.comparePassword(password, user.passwordHash || ''))) return res.status(401).json({ error: 'Parola doğrulanamadı.' });
      const secret = randomBytes(20), encrypted = encryptMfaSecret(secret, key(), user.id);
      const recoveryCodes = generateRecoveryCodes(), pendingRecoveryHashes = recoveryCodes.map(hashRecoveryCode);
      const pendingPasswordFingerprint = hashActionToken(user.passwordHash!);
      await db().insert(adminMfaAccounts).values({ userId: user.id, pendingCiphertext: encrypted, pendingRecoveryHashes, pendingPasswordFingerprint, pendingExpiresAt: new Date(Date.now() + 10 * 60 * 1000) })
        .onConflictDoUpdate({ target: adminMfaAccounts.userId, set: { pendingCiphertext: encrypted, pendingRecoveryHashes, pendingPasswordFingerprint, pendingExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
      const encoded = base32(secret);
      return res.json({ secret: encoded, recoveryCodes, otpauthUrl: `otpauth://totp/${encodeURIComponent(`BIMMetraj:${user.email}`)}?secret=${encoded}&issuer=BIMMetraj&algorithm=SHA1&digits=6&period=30` });
    } catch { return res.status(503).json({ error: 'MFA kurulumu kullanılamıyor.' }); }
  });
  app.post('/api/auth/mfa/enroll/confirm', authenticate, async (req, res) => {
    if (!req.user.isSuperAdmin || req.user.impersonatedBy) return res.status(403).json({ error: 'Yetkisiz.' });
    res.set('Cache-Control', 'no-store');
    if (!(await rate(res, `mfa-confirm:${req.user.userId}`))) return;
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (req.body?.recoverySaved !== true) return res.status(400).json({ error: 'Kurtarma kodlarını kaydettiğinizi onaylayın.' });
    try {
      const result = await db().transaction(async tx => {
        const [user] = await tx.select().from(users).where(eq(users.id, req.user.userId)).for('update');
        const [account] = await tx.select().from(adminMfaAccounts).where(eq(adminMfaAccounts.userId, req.user.userId)).for('update');
        if (!user?.isSuperAdmin || !user.emailVerified || user.mfaEpoch || !user.passwordHash || !account?.pendingCiphertext || account.pendingPasswordFingerprint !== hashActionToken(user.passwordHash) || !account.pendingExpiresAt || account.pendingExpiresAt.getTime() <= Date.now() || !account.pendingRecoveryHashes || account.pendingRecoveryHashes.length !== 10) return null;
        const counter = matchTotpCounter(decryptMfaSecret(account.pendingCiphertext, key(), user.id), code, Math.floor(Date.now() / 1000), -1);
        if (counter === null) return null;
        const epoch = randomUUID();
        await tx.update(adminMfaAccounts).set({ secretCiphertext: account.pendingCiphertext, pendingCiphertext: null, pendingExpiresAt: null, pendingRecoveryHashes: null, pendingPasswordFingerprint: null, lastCounter: counter, recoveryHashes: account.pendingRecoveryHashes }).where(eq(adminMfaAccounts.userId, user.id));
        await tx.update(users).set({ mfaEpoch: epoch }).where(eq(users.id, user.id));
        await tx.insert(adminAuditLogs).values({ adminId: user.id, action: 'admin.mfa_enabled', details: {} });
        return { user: { ...user, mfaEpoch: epoch }, epoch };
      });
      if (!result) return res.status(400).json({ error: 'Kod geçersiz veya kurulum süresi doldu.' });
      return await issueSession(req, res, result.user, result.epoch);
    } catch { return res.status(503).json({ error: 'MFA kurulumu tamamlanamadı.' }); }
  });
  app.post('/api/auth/mfa/verify', async (req, res) => {
    const raw = typeof req.body?.challenge === 'string' ? req.body.challenge : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw) || code.length > 40) return res.status(400).json({ error: 'Kod veya doğrulama isteği geçersiz.' });
    res.set('Cache-Control', 'no-store');
    if (!(await rate(res, `mfa-verify-ip:${clientAddress(req)}`))) return;
    try {
      const [candidate] = await db().select({ userId: adminMfaChallenges.userId }).from(adminMfaChallenges).where(eq(adminMfaChallenges.challengeHash, hashActionToken(raw)));
      if (!candidate) return res.status(401).json({ error: 'Kod geçersiz veya doğrulama süresi doldu.' });
      if (!(await rate(res, `mfa-verify-account:${candidate.userId}`))) return;
      const result = await db().transaction(async tx => {
        const [challenge] = await tx.select().from(adminMfaChallenges).where(eq(adminMfaChallenges.challengeHash, hashActionToken(raw))).for('update');
        if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) return null;
        const [user] = await tx.select().from(users).where(eq(users.id, challenge.userId)).for('update');
        const [account] = await tx.select().from(adminMfaAccounts).where(eq(adminMfaAccounts.userId, challenge.userId)).for('update');
        if (!user?.isSuperAdmin || !user.emailVerified || !user.mfaEpoch || !user.passwordHash || challenge.passwordFingerprint !== hashActionToken(user.passwordHash) || !account?.secretCiphertext) return null;
        const counter = matchTotpCounter(decryptMfaSecret(account.secretCiphertext, key(), user.id), code, Math.floor(Date.now() / 1000), account.lastCounter);
        const recovery = /^[0-9a-f]{4}(?:-[0-9a-f]{4}){7}$/i.test(code) ? hashRecoveryCode(code) : '';
        if (counter === null && !account.recoveryHashes.includes(recovery)) return null;
        await tx.update(adminMfaAccounts).set(counter === null ? { recoveryHashes: account.recoveryHashes.filter(hash => hash !== recovery) } : { lastCounter: counter }).where(eq(adminMfaAccounts.userId, user.id));
        if (counter === null) await tx.insert(adminAuditLogs).values({ adminId: user.id, action: 'admin.mfa_recovery_used', details: { remainingCodes: account.recoveryHashes.length - 1 } });
        await tx.update(adminMfaChallenges).set({ consumedAt: new Date() }).where(and(eq(adminMfaChallenges.challengeHash, challenge.challengeHash), isNull(adminMfaChallenges.consumedAt)));
        return { user, epoch: user.mfaEpoch };
      });
      if (!result) return res.status(401).json({ error: 'Kod geçersiz veya doğrulama süresi doldu.' });
      return await issueSession(req, res, result.user, result.epoch);
    } catch { return res.status(503).json({ error: 'MFA doğrulaması kullanılamıyor.' }); }
  });
}
