import type { Express, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { academyAcquisitionEvents, academyActivationEvents, academyEditions, academyEnrollmentAuditLogs, academyEnrollments, academyLearnerProfiles, academyProducts, authActionTokens, companies, memberships, subscriptions, users } from "../../db/schema";
import { ALLPLAN_PROGRAM_VERSION } from "../../academy/allplan/certification";
import { AuthService } from "../../services/auth/authService";
import { authenticate } from "../middleware/auth";
import { ACADEMY_MARKETING_VERSION, ACADEMY_PRIVACY_VERSION, ACADEMY_TERMS_VERSION, parseRegistrationInput, publicRegisteredUser } from "../auth/registration";
import { clientAddress, consumeRateLimit, createActionToken, hashActionToken } from "../auth/security";

const actionUrl = (path: string) => `${(process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;

async function deliverAuthLink(template: 'verify_email' | 'reset_password', email: string, url: string) {
  if (!process.env.AUTH_EMAIL_WEBHOOK_URL) return process.env.NODE_ENV === 'production' ? null : url;
  const response = await fetch(process.env.AUTH_EMAIL_WEBHOOK_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.AUTH_EMAIL_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.AUTH_EMAIL_WEBHOOK_SECRET}` } : {}) },
    body: JSON.stringify({ template, email, url }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`AUTH_EMAIL_DELIVERY_${response.status}`);
  return null;
}

async function issueAuthAction(userId: string, type: 'verify_email' | 'reset_password', lifetimeMs: number) {
  const created = createActionToken();
  await db.delete(authActionTokens).where(and(eq(authActionTokens.userId, userId), eq(authActionTokens.type, type), isNull(authActionTokens.consumedAt)));
  await db.insert(authActionTokens).values({ userId, type, tokenHash: created.tokenHash, expiresAt: new Date(Date.now() + lifetimeMs) });
  return created.token;
}

async function guardedRateLimit(res: Response, key: string, limit: number, windowMs: number) {
  try {
    return await consumeRateLimit(key, limit, windowMs);
  } catch (error) {
    console.error('Rate-limit storage error:', error);
    res.status(503).json({ error: 'Kimlik doğrulama hizmeti geçici olarak kullanılamıyor.' });
    return null;
  }
}

export function registerAuthRoutes(app: Express) {
  app.post('/api/auth/academy-acquisition', async (req, res) => {
    const acquisitionId = typeof req.body?.acquisitionId === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(req.body.acquisitionId) ? req.body.acquisitionId : '';
    const landingPath = typeof req.body?.landingPath === 'string' && /^\/academy(?:\/allplan)?$/.test(req.body.landingPath) ? req.body.landingPath : '';
    if (!acquisitionId || !landingPath) return res.status(400).json({ error: 'Geçersiz edinim olayı.' });
    const rate = await guardedRateLimit(res, `acquisition:${clientAddress(req)}`, 20, 60 * 60 * 1000);
    if (!rate) return;
    if (!rate.allowed) return res.status(202).json({ accepted: true });
    await db.insert(academyAcquisitionEvents).values({ acquisitionId, landingPath }).onConflictDoNothing();
    return res.status(202).json({ accepted: true });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const rate = await guardedRateLimit(res, `register:${clientAddress(req)}`, 5, 15 * 60 * 1000);
      if (!rate) return;
      if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." });
      const input = parseRegistrationInput(req.body);
      if (!input) return res.status(400).json({ error: "Kayıt bilgileri geçersiz." });
      const { email, password, fullName, companyName, intent } = input;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
      const passwordHash = await AuthService.hashPassword(password);
      const result = await db.transaction(async tx => {
        const [edition] = intent === "academy" ? await tx.select({ id: academyEditions.id }).from(academyEditions)
          .innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId))
          .where(and(eq(academyProducts.code, "allplan-pro"), eq(academyProducts.isActive, true), eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION), eq(academyEditions.accessMode, "free_pilot"), eq(academyEditions.isActive, true)))
          .limit(1) : [];
        if (intent === "academy" && !edition) throw new Error("ACADEMY_EDITION_UNAVAILABLE");
        const [company] = await tx.insert(companies).values({ name: companyName }).returning();
        const [user] = await tx.insert(users).values({ email, fullName, passwordHash }).returning();
        await tx.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
        await tx.insert(subscriptions).values({ companyId: company.id, plan: "starter" });
        if (edition) {
          const [enrollment] = await tx.insert(academyEnrollments).values({ editionId: edition.id, companyId: company.id, userId: user.id, status: "active", source: "pilot" }).returning();
          await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: enrollment.id, companyId: company.id, actorUserId: user.id, action: "granted", reason: "Ücretsiz Academy öğrenci kaydı", details: { registrationIntent: "academy" } });
          const now = new Date();
          await tx.insert(academyLearnerProfiles).values({ userId: user.id, companyId: company.id, termsVersion: ACADEMY_TERMS_VERSION, termsAcceptedAt: now, privacyVersion: ACADEMY_PRIVACY_VERSION, privacyAcceptedAt: now, marketingConsent: input.marketingConsent, marketingConsentVersion: input.marketingConsent ? ACADEMY_MARKETING_VERSION : null, marketingConsentAt: input.marketingConsent ? now : null, acquisitionId: input.acquisitionId });
          await tx.insert(academyActivationEvents).values({ companyId: company.id, userId: user.id, eventType: "registration_completed", metadata: input.acquisitionId ? { acquisitionId: input.acquisitionId } : {} });
          if (input.acquisitionId) await tx.update(academyAcquisitionEvents).set({ registeredUserId: user.id, registeredAt: now }).where(eq(academyAcquisitionEvents.acquisitionId, input.acquisitionId));
        }
        return { company, user, academyEnrolled: Boolean(edition) };
      });

      const verificationToken = await issueAuthAction(result.user.id, 'verify_email', 24 * 60 * 60 * 1000);
      const devVerificationUrl = await deliverAuthLink('verify_email', result.user.email, actionUrl(`/verify-email/${verificationToken}`));
      const token = AuthService.generateToken({ userId: result.user.id, companyId: result.company.id, role: "owner" });
      res.status(201).json({ token, user: publicRegisteredUser(result.user), company: result.company, role: "owner", accountType: intent === 'academy' ? 'academy_learner' : 'workspace', academyEnrolled: result.academyEnrolled, emailVerificationRequired: true, ...(devVerificationUrl ? { devVerificationUrl } : {}) });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error && error.message === "ACADEMY_EDITION_UNAVAILABLE") return res.status(503).json({ error: "Ücretsiz Academy kaydı şu anda kullanılamıyor." });
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.get('/api/auth/verify-email/:token', async (req, res) => {
    const tokenHash = hashActionToken(req.params.token || '');
    const [record] = await db.select().from(authActionTokens).where(and(eq(authActionTokens.tokenHash, tokenHash), eq(authActionTokens.type, 'verify_email'), gt(authActionTokens.expiresAt, new Date())));
    if (!record) return res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.' });
    if (record.consumedAt) {
      const [verified] = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.id, record.userId));
      return verified?.emailVerified ? res.json({ message: 'E-posta adresiniz doğrulandı.' }) : res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.' });
    }
    const now = new Date();
    await db.transaction(async tx => {
      await tx.update(users).set({ emailVerified: now }).where(eq(users.id, record.userId));
      await tx.update(authActionTokens).set({ consumedAt: now }).where(eq(authActionTokens.id, record.id));
    });
    return res.json({ message: 'E-posta adresiniz doğrulandı.' });
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rate = await guardedRateLimit(res, `verify:${clientAddress(req)}:${email}`, 3, 60 * 60 * 1000);
    if (!rate) return;
    if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: 'Yeni bağlantı isteme limiti doldu.' });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && !user.emailVerified) {
      const raw = await issueAuthAction(user.id, 'verify_email', 24 * 60 * 60 * 1000);
      const devVerificationUrl = await deliverAuthLink('verify_email', user.email, actionUrl(`/verify-email/${raw}`));
      return res.json({ message: 'Hesap uygunsa doğrulama bağlantısı gönderildi.', ...(devVerificationUrl ? { devVerificationUrl } : {}) });
    }
    return res.json({ message: 'Hesap uygunsa doğrulama bağlantısı gönderildi.' });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rate = await guardedRateLimit(res, `reset:${clientAddress(req)}:${email}`, 3, 60 * 60 * 1000);
    if (!rate) return;
    if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: 'Yeni bağlantı isteme limiti doldu.' });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      const raw = await issueAuthAction(user.id, 'reset_password', 60 * 60 * 1000);
      const devResetUrl = await deliverAuthLink('reset_password', user.email, actionUrl(`/reset-password/${raw}`));
      return res.json({ message: 'Hesap uygunsa parola yenileme bağlantısı gönderildi.', ...(devResetUrl ? { devResetUrl } : {}) });
    }
    return res.json({ message: 'Hesap uygunsa parola yenileme bağlantısı gönderildi.' });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Parola 8 ile 128 karakter arasında olmalıdır.' });
    const tokenHash = hashActionToken(typeof req.body?.token === 'string' ? req.body.token : '');
    const [record] = await db.select().from(authActionTokens).where(and(eq(authActionTokens.tokenHash, tokenHash), eq(authActionTokens.type, 'reset_password'), isNull(authActionTokens.consumedAt), gt(authActionTokens.expiresAt, new Date())));
    if (!record) return res.status(400).json({ error: 'Parola yenileme bağlantısı geçersiz veya süresi dolmuş.' });
    const now = new Date();
    const passwordHash = await AuthService.hashPassword(password);
    await db.transaction(async tx => {
      await tx.update(users).set({ passwordHash, passwordChangedAt: now }).where(eq(users.id, record.userId));
      await tx.update(authActionTokens).set({ consumedAt: now }).where(eq(authActionTokens.id, record.id));
    });
    return res.json({ message: 'Parolanız yenilendi. Yeniden giriş yapabilirsiniz.' });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const rate = await guardedRateLimit(res, `login:${clientAddress(req)}:${email}`, 10, 15 * 60 * 1000);
      if (!rate) return;
      if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." });
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !(await AuthService.comparePassword(password, user.passwordHash || ""))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;

      const token = AuthService.generateToken({
        userId: user.id,
        companyId: membership?.companyId || null,
        role: membership?.role || null
      });

      const learner = await db.query.academyLearnerProfiles.findFirst({ where: eq(academyLearnerProfiles.userId, user.id) });
      res.json({ token, user: publicRegisteredUser(user), company, role: membership?.role, accountType: learner ? 'academy_learner' : 'workspace' });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.user.userId) });
      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, req.user.userId));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;
      const learner = await db.query.academyLearnerProfiles.findFirst({ where: eq(academyLearnerProfiles.userId, req.user.userId) });
      res.json({ user: user ? publicRegisteredUser(user) : null, company, role: membership?.role, accountType: learner ? 'academy_learner' : 'workspace', learnerProfile: learner ? { onboardingCompletedAt: learner.onboardingCompletedAt, selectedLessonSlug: learner.selectedLessonSlug } : null });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
}
