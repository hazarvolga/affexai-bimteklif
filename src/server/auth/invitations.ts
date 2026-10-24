import { deliverTransactionalEmail } from './email-delivery';
import { assertAuthEmailAvailable, EmailDeliveryError } from './email-policy';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler, Response } from 'express';
import { db } from '../../db';
import { getControlDatabase } from '../../db/control-plane';
import { academyLearnerProfiles, companies, invitations, memberships, users } from '../../db/schema';
import { AuthService } from '../../services/auth/authService';
import { clientAddress, consumeRateLimit, createActionToken, hashActionToken } from './security';
import { publicRegisteredUser } from './registration';

const invitationRole = z.enum(['admin', 'manager', 'viewer']);
export const invitationInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: invitationRole.default('viewer'),
}).strict();
const newAccountInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128).refine(value => Buffer.byteLength(value, 'utf8') <= 72),
});

export class InvitationError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export const invitationRateLimit = (action: 'issue' | 'preview' | 'accept', consume = consumeRateLimit): RequestHandler => async (req, res, next) => {
  try {
    const limit = await consume(`invitation:${action}:${clientAddress(req)}:${req.user?.userId || 'anonymous'}`, action === 'preview' ? 60 : 10, 15 * 60000);
    if (!limit.allowed) {
      res.set('Retry-After', String(limit.retryAfterSeconds)).status(429).json({ error: 'Çok fazla davet denemesi. Daha sonra tekrar deneyin.' });
      return;
    }
  } catch {
    res.status(503).json({ error: 'Davet hizmeti geçici olarak kullanılamıyor.' });
    return;
  }
  next();
};

export function invitationErrorResponse(error: unknown, res: Response) {
  if (error instanceof EmailDeliveryError) return res.status(error.status).json({ code: error.code, error: error.message });
  const messages: Record<string, string> = {
    INVITATION_REISSUE_REQUIRED: 'Bu davet yeniden oluşturulmalıdır. Şirket yöneticinize başvurun.',
    INVALID_INVITATION: 'Davet geçersiz, kullanılmış veya süresi dolmuş.',
    INVALID_INVITATION_INPUT: 'Geçerli bir e-posta ve davet rolü seçin.',
    INVITATION_SIGN_IN_REQUIRED: 'Bu e-posta ile mevcut hesabınıza giriş yapın.',
    INVITATION_IDENTITY_MISMATCH: 'Davet edilen e-posta adresine ait hesapla giriş yapın.',
    INVITATION_PASSWORD_REQUIRED: 'Ad soyad ve en az 8 karakterli parola gereklidir. Parola en fazla 72 UTF-8 bayt olabilir.',
  };
  if (error instanceof InvitationError) return res.status(error.status).json({ code: error.code, error: messages[error.code] || 'Davet kabul edilemedi.' });
  return res.status(500).json({ error: 'Davet işlemi tamamlanamadı.' });
}

export function invitationTokenHash(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new InvitationError('INVITATION_REISSUE_REQUIRED');
  return `sha256:${hashActionToken(token)}`;
}

export function publicInvitation(invite: typeof invitations.$inferSelect) {
  const status = invite.acceptedAt ? 'accepted' : !invite.token.startsWith('sha256:') ? 'reissue_required'
    : invite.expiresAt <= new Date() ? 'expired' : 'pending';
  return { id: invite.id, email: invite.email, role: invite.role, createdAt: invite.createdAt, expiresAt: invite.expiresAt, acceptedAt: invite.acceptedAt, status };
}

export async function deliverInvitation(email: string, url: string, env = process.env, transport = fetch) {
  assertAuthEmailAvailable(env);
  try {
    const delivery = await deliverTransactionalEmail('invitation', email, url, env, transport);
    return delivery.status === 'development'
      ? { status: 'development' as const, devInvitationUrl: delivery.url }
      : { status: 'accepted' as const };
  } catch {
    return { status: 'failed' as const };
  }
}

export async function issueInvitation(companyId: string, invitedBy: string, value: unknown, database = getControlDatabase().db) {
  assertAuthEmailAvailable();
  const input = invitationInput.safeParse(value);
  if (!input.success) throw new InvitationError('INVALID_INVITATION_INPUT');
  const { email, role } = input.data;
  const created = createActionToken();
  const invite = await database.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invite:${companyId}:${email}`}))`);
    const now = new Date();
    // Reissue explicitly expires all older links, including legacy plaintext rows.
    await tx.update(invitations).set({ expiresAt: now }).where(and(eq(invitations.companyId, companyId), sql`lower(${invitations.email}) = ${email}`, isNull(invitations.acceptedAt)));
    const [record] = await tx.insert(invitations).values({ companyId, invitedBy, email, role, token: `sha256:${created.tokenHash}`, expiresAt: new Date(now.getTime() + 7 * 86400000) }).returning();
    return record;
  });
  const base = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const delivery = await deliverInvitation(email, `${base}/accept-invite/${created.token}`);
  if (delivery.status === 'failed') {
    const [expired] = await database.update(invitations).set({ expiresAt: new Date() }).where(eq(invitations.id, invite.id)).returning();
    return { invitation: publicInvitation(expired), delivery };
  }
  return { invitation: publicInvitation(invite), delivery };
}

export async function previewInvitation(token: string) {
  const invite = await db.query.invitations.findFirst({ where: eq(invitations.token, invitationTokenHash(token)) });
  assertUsableInvitation(invite);
  const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${invite.email.toLowerCase()}`, columns: { id: true } });
  return { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt, requiresSignIn: Boolean(existing) };
}

function assertUsableInvitation(invite: typeof invitations.$inferSelect | undefined): asserts invite is typeof invitations.$inferSelect {
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) throw new InvitationError('INVALID_INVITATION');
  if (!invitationRole.safeParse(invite.role).success) throw new InvitationError('INVITATION_REISSUE_REQUIRED');
}

export async function acceptInvitation(token: string, value: unknown, actor?: { userId: string }, database = getControlDatabase().db) {
  const tokenHash = invitationTokenHash(token);
  const accepted = await database.transaction(async tx => {
    const [invite] = await tx.select().from(invitations).where(eq(invitations.token, tokenHash)).for('update');
    assertUsableInvitation(invite);
    const email = invite.email.toLowerCase();
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invite-account:${email}`}))`);
    const [existing] = await tx.select().from(users).where(sql`lower(${users.email}) = ${email}`);
    let user = existing;
    if (existing) {
      if (!actor) throw new InvitationError('INVITATION_SIGN_IN_REQUIRED', 401);
      if (actor.userId !== existing.id) throw new InvitationError('INVITATION_IDENTITY_MISMATCH', 403);
    } else {
      if (actor) throw new InvitationError('INVITATION_IDENTITY_MISMATCH', 403);
      const input = newAccountInput.safeParse(value);
      if (!input.success) throw new InvitationError('INVITATION_PASSWORD_REQUIRED');
      const passwordHash = await AuthService.hashPassword(input.data.password);
      const [created] = await tx.insert(users).values({ email, fullName: input.data.fullName, passwordHash, emailVerified: new Date() }).onConflictDoNothing().returning();
      if (!created) throw new InvitationError('INVITATION_SIGN_IN_REQUIRED', 401);
      user = created;
    }
    assertUsableInvitation(invite);
    // Existing membership is retained: a repeated invitation cannot upgrade a role.
    await tx.insert(memberships).values({ userId: user.id, companyId: invite.companyId, role: invitationRole.parse(invite.role) }).onConflictDoNothing({ target: [memberships.userId, memberships.companyId] });
    const [membership] = await tx.select({ role: memberships.role }).from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.companyId, invite.companyId)));
    const [company] = await tx.select().from(companies).where(eq(companies.id, invite.companyId));
    if (!membership || !company) throw new InvitationError('INVALID_INVITATION');
    const [learner] = await tx.select({ userId: academyLearnerProfiles.userId }).from(academyLearnerProfiles).where(and(eq(academyLearnerProfiles.userId, user.id), eq(academyLearnerProfiles.companyId, invite.companyId)));
    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
    return { id: user.id, email: user.email, fullName: user.fullName, accepted: true, user: publicRegisteredUser(user), company, role: membership.role, accountType: learner ? 'academy_learner' as const : 'workspace' as const };
  });
  const tokenValue = AuthService.generateToken({ userId: accepted.id, companyId: accepted.company.id, role: accepted.role });
  return { ...accepted, token: tokenValue };
}
