import { deliverTransactionalEmail } from '../auth/email-delivery';
import { withAppTenant } from "../../db/app-tenant";
import type { EmailRenderContext } from '../auth/email-templates';
import { assertAuthEmailAvailable, requireAuthEmailDelivery, EmailDeliveryError } from "../auth/email-policy";
import { stageAndDeliverAuthAction } from '../auth/action-email';
import type { Express, Response } from "express";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { getControlDatabase } from "../../db/control-plane";
import { academyAcquisitionEvents, academyActivationEvents, academyEditions, academyEnrollmentAuditLogs, academyEnrollments, academyLearnerProfiles, academyProducts, adminAuditLogs, authActionTokens, companies, memberships, subscriptions, users } from "../../db/schema";
import { ALLPLAN_PROGRAM_VERSION } from "../../academy/allplan/certification";
import { AuthService } from "../../services/auth/authService";
import { createInitialPaymentOrder } from "../../services/billing/bank-transfer";
import { formatBillingCycleLabel, normalizeBillingCycle } from "../../services/billing/billing-periods";
import { selectTrialPlan } from "../../services/billing/trial-plan";
import { authenticate } from "../middleware/auth";
import { ACADEMY_MARKETING_VERSION, ACADEMY_PRIVACY_VERSION, ACADEMY_TERMS_VERSION, isPlatformSuperAdminEmail, parseRegistrationInput, parseSelectedPlanId, publicRegisteredUser } from "../auth/registration";
import { clientAddress, consumeRateLimit, createActionToken, hashActionToken } from "../auth/security";
import { ADMIN_COOKIE, bodyToken, clearSessionCookies, isSameOriginMutation, parseCookies, restoreAdminSession, setSessionCookies } from "../auth/session-cookie";

export const actionUrl = (path: string) => `${(process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;

export async function deliverAuthLink(
  template: 'verify_email' | 'reset_password',
  email: string,
  url: string,
  context?: EmailRenderContext,
) {
  const delivery = await deliverTransactionalEmail(template, email, url, process.env, fetch, undefined, context);
  return delivery.status === 'development' ? delivery.url : null;
}

export async function issueAuthAction(userId: string, type: 'verify_email' | 'reset_password', lifetimeMs: number) {
  assertAuthEmailAvailable();
  const staged = await stageAuthAction(userId, type, lifetimeMs);
  await finalizeAuthAction(userId, type, staged.id);
  return staged.raw;
}

async function stageAuthAction(userId: string, type: 'verify_email' | 'reset_password', lifetimeMs: number) {
  assertAuthEmailAvailable();
  const created = createActionToken();
  const [record] = await getControlDatabase().db.insert(authActionTokens).values({ userId, type, tokenHash: created.tokenHash, expiresAt: new Date(Date.now() + lifetimeMs) }).returning({ id: authActionTokens.id });
  return { id: record.id, raw: created.token };
}

async function finalizeAuthAction(userId: string, type: 'verify_email' | 'reset_password', id: string) {
  await getControlDatabase().db.update(authActionTokens).set({ expiresAt: new Date() }).where(and(
    eq(authActionTokens.userId, userId), eq(authActionTokens.type, type), isNull(authActionTokens.consumedAt), sql`${authActionTokens.id} <> ${id}`,
  ));
}

async function discardAuthAction(id: string) {
  await getControlDatabase().db.delete(authActionTokens).where(eq(authActionTokens.id, id));
}

export async function issueAndDeliverAuthAction(input: {
  userId: string;
  type: 'verify_email' | 'reset_password';
  lifetimeMs: number;
  email: string;
  path: (token: string) => string;
  context?: EmailRenderContext;
}) {
  let developmentUrl: string | null = null;
  const raw = await stageAndDeliverAuthAction({
    stage: () => stageAuthAction(input.userId, input.type, input.lifetimeMs),
    deliver: async raw => {
      developmentUrl = await deliverAuthLink(
        input.type,
        input.email,
        actionUrl(input.path(raw)),
        input.context,
      );
    },
    finalize: id => finalizeAuthAction(input.userId, input.type, id),
    discard: discardAuthAction,
  });
  return { raw, developmentUrl };
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
    await getControlDatabase().db.insert(academyAcquisitionEvents).values({ acquisitionId, landingPath }).onConflictDoNothing();
    return res.status(202).json({ accepted: true });
  });

  app.post("/api/auth/register", requireAuthEmailDelivery, async (req, res) => {
    try {
      const rate = await guardedRateLimit(res, `register:${clientAddress(req)}`, 5, 15 * 60 * 1000);
      if (!rate) return;
      if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." });
      const input = parseRegistrationInput(req.body);
      if (!input) return res.status(400).json({ error: "Kayıt bilgileri geçersiz." });
      const selectedPlanId = parseSelectedPlanId(req.body);
      const selectedBillingCycle = normalizeBillingCycle(req.body?.selectedBillingCycle ?? req.body?.billingCycle);
      const { email, password, fullName, companyName, intent } = input;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
      const passwordHash = await AuthService.hashPassword(password);
      const result = await getControlDatabase().db.transaction(async tx => {
        const [edition] = intent === "academy" ? await tx.select({ id: academyEditions.id }).from(academyEditions)
          .innerJoin(academyProducts, eq(academyProducts.id, academyEditions.productId))
          .where(and(eq(academyProducts.code, "allplan-pro"), eq(academyProducts.isActive, true), eq(academyEditions.version, ALLPLAN_PROGRAM_VERSION), eq(academyEditions.accessMode, "free_pilot"), eq(academyEditions.isActive, true)))
          .limit(1) : [];
        if (intent === "academy" && !edition) throw new Error("ACADEMY_EDITION_UNAVAILABLE");
        const [company] = await tx.insert(companies).values({ name: companyName, isSmartcheckEnabled: true }).returning();
        const [user] = await tx.insert(users).values({ email, fullName, passwordHash, isSuperAdmin: isPlatformSuperAdminEmail(email) }).returning();
        await tx.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
        const trialPlan = await selectTrialPlan(tx);
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.insert(subscriptions).values({
          companyId: company.id,
          plan: "starter",
          planId: trialPlan ? trialPlan.id : null,
          currentPeriodStart: now,
          currentPeriodEnd: trialPlan ? trialEnd : null,
        });
        const pendingPaymentOrder = selectedPlanId
          ? await createInitialPaymentOrder({
              tx,
              companyId: company.id,
              companyName: company.name,
              userId: user.id,
              userEmail: user.email,
              planId: selectedPlanId,
              billingCycle: selectedBillingCycle,
            })
          : null;
        if (edition) {
          const [enrollment] = await tx.insert(academyEnrollments).values({ editionId: edition.id, companyId: company.id, userId: user.id, status: "active", source: "pilot" }).returning();
          await tx.insert(academyEnrollmentAuditLogs).values({ enrollmentId: enrollment.id, companyId: company.id, actorUserId: user.id, action: "granted", reason: "Ücretsiz Academy öğrenci kaydı", details: { registrationIntent: "academy" } });
          const now = new Date();
          await tx.insert(academyLearnerProfiles).values({ userId: user.id, companyId: company.id, termsVersion: ACADEMY_TERMS_VERSION, termsAcceptedAt: now, privacyVersion: ACADEMY_PRIVACY_VERSION, privacyAcceptedAt: now, marketingConsent: input.marketingConsent, marketingConsentVersion: input.marketingConsent ? ACADEMY_MARKETING_VERSION : null, marketingConsentAt: input.marketingConsent ? now : null, acquisitionId: input.acquisitionId });
          await tx.insert(academyActivationEvents).values({ companyId: company.id, userId: user.id, eventType: "registration_completed", metadata: input.acquisitionId ? { acquisitionId: input.acquisitionId } : {} });
          if (input.acquisitionId) await tx.update(academyAcquisitionEvents).set({ registeredUserId: user.id, registeredAt: now }).where(eq(academyAcquisitionEvents.acquisitionId, input.acquisitionId));
        }
        return { company, user, academyEnrolled: Boolean(edition), pendingPaymentOrder };
      });

      let emailVerificationDeliveryPending = false;
      try {
        const order = result.pendingPaymentOrder;
        await issueAndDeliverAuthAction({
          userId: result.user.id,
          type: 'verify_email',
          lifetimeMs: 24 * 60 * 60 * 1000,
          email: result.user.email,
          path: raw => `/verify-email/${raw}`,
          context: {
            recipientName: result.user.fullName || undefined,
            companyName: result.company.name || undefined,
            detailRows: order
              ? [
                  { label: 'Çalışma Alanı (Firma)', value: result.company.name },
                  { label: 'Seçilen Paket', value: order.planName },
                  { label: 'Faturalama Dönemi', value: formatBillingCycleLabel(order.billingCycle) },
                  {
                    label: 'Sipariş Referans Kodu',
                    value: order.referenceCode,
                    mono: true,
                    highlight: true,
                  },
                  {
                    label: 'Havale / EFT Tutarı',
                    value: `₺${order.amountTry.toLocaleString('tr-TR')} (KDV Hariç)`,
                    highlight: true,
                  },
                ]
              : [
                  { label: 'Çalışma Alanı (Firma)', value: result.company.name },
                  { label: 'Başlangıç Paketi', value: '14 Günlük Ücretsiz Deneme' },
                ],
          },
        });
      } catch (error) {
        emailVerificationDeliveryPending = true;
        console.error('Registration persisted; verification delivery must be retried:', error instanceof Error ? error.name : 'UnknownError');
      }
      const token = AuthService.generateToken({ userId: result.user.id, companyId: result.company.id, role: "owner" });
      setSessionCookies(res, token, { isSuperAdmin: result.user.isSuperAdmin });
      const pendingPaymentOrder = result.pendingPaymentOrder
        ? (({ createdNow: _createdNow, ...order }) => order)(result.pendingPaymentOrder)
        : null;
      res.status(201).json({
        token: bodyToken(req, token),
        user: publicRegisteredUser(result.user),
        company: result.company,
        role: "owner",
        accountType: intent === 'academy' ? 'academy_learner' : 'workspace',
        academyEnrolled: result.academyEnrolled,
        emailVerificationRequired: true,
        emailVerificationDeliveryPending,
        pendingPaymentOrder,
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) return res.status(error.status).json({ code: error.code, error: error.message });
      console.error("Registration error:", error);
      if (error instanceof Error && error.message === "ACADEMY_EDITION_UNAVAILABLE") return res.status(503).json({ error: "Ücretsiz Academy kaydı şu anda kullanılamıyor." });
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ error: "Bu e-posta adresiyle bir hesap zaten mevcut." });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.get('/api/auth/verify-email/:token', async (req, res) => {
    const tokenHash = hashActionToken(req.params.token || '');
    const verified = await getControlDatabase().db.transaction(async tx => {
      const now = new Date();
      const [claimed] = await tx.update(authActionTokens).set({ consumedAt: now })
        .where(and(eq(authActionTokens.tokenHash, tokenHash), eq(authActionTokens.type, 'verify_email'),
          isNull(authActionTokens.consumedAt), gt(authActionTokens.expiresAt, sql`clock_timestamp()`)))
        .returning({ userId: authActionTokens.userId });
      if (claimed) {
        await tx.update(users).set({ emailVerified: now }).where(eq(users.id, claimed.userId));
        return true;
      }
      // Preserve successful verification-link replay without repeating the mutation.
      const [record] = await tx.select({ emailVerified: users.emailVerified, consumedAt: authActionTokens.consumedAt })
        .from(authActionTokens).innerJoin(users, eq(users.id, authActionTokens.userId))
        .where(and(eq(authActionTokens.tokenHash, tokenHash), eq(authActionTokens.type, 'verify_email'),
          gt(authActionTokens.expiresAt, sql`clock_timestamp()`)));
      return Boolean(record?.consumedAt && record.emailVerified);
    });
    return verified ? res.json({ message: 'E-posta adresiniz doğrulandı.' })
      : res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.' });
  });

  app.post('/api/auth/resend-verification', requireAuthEmailDelivery, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rate = await guardedRateLimit(res, `verify:${clientAddress(req)}:${email}`, 3, 60 * 60 * 1000);
    if (!rate) return;
    if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: 'Yeni bağlantı isteme limiti doldu.' });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && !user.emailVerified) {
      try {
        await issueAndDeliverAuthAction({
          userId: user.id,
          type: 'verify_email',
          lifetimeMs: 24 * 60 * 60 * 1000,
          email: user.email,
          path: raw => `/verify-email/${raw}`,
          context: { recipientName: user.fullName || undefined },
        });
      } catch (error) {
        if (error instanceof EmailDeliveryError) return res.status(error.status).json({ code: error.code, error: error.message });
        throw error;
      }
      return res.json({ message: 'Hesap uygunsa doğrulama bağlantısı gönderildi.' });
    }
    return res.json({ message: 'Hesap uygunsa doğrulama bağlantısı gönderildi.' });
  });

  app.post('/api/auth/forgot-password', requireAuthEmailDelivery, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rate = await guardedRateLimit(res, `reset:${clientAddress(req)}:${email}`, 3, 60 * 60 * 1000);
    if (!rate) return;
    if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: 'Yeni bağlantı isteme limiti doldu.' });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      try {
        await issueAndDeliverAuthAction({
          userId: user.id,
          type: 'reset_password',
          lifetimeMs: 60 * 60 * 1000,
          email: user.email,
          path: raw => `/reset-password/${raw}`,
          context: {
            recipientName: user.fullName || undefined,
            detailRows: [
              { label: 'Hesap E-postası', value: user.email, mono: true },
              { label: 'Bağlantı Geçerlilik Süresi', value: '60 Dakika' },
            ],
          },
        });
      } catch (error) {
        if (error instanceof EmailDeliveryError) return res.status(error.status).json({ code: error.code, error: error.message });
        throw error;
      }
      return res.json({ message: 'Hesap uygunsa parola yenileme bağlantısı gönderildi.' });
    }
    return res.json({ message: 'Hesap uygunsa parola yenileme bağlantısı gönderildi.' });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Parola 8 ile 128 karakter arasında olmalıdır.' });
    const tokenHash = hashActionToken(typeof req.body?.token === 'string' ? req.body.token : '');
    const [record] = await db.select().from(authActionTokens).where(and(eq(authActionTokens.tokenHash, tokenHash), eq(authActionTokens.type, 'reset_password'), isNull(authActionTokens.consumedAt), gt(authActionTokens.expiresAt, new Date())));
    if (!record) return res.status(400).json({ error: 'Parola yenileme bağlantısı geçersiz veya süresi dolmuş.' });
    const passwordHash = await AuthService.hashPassword(password);
    const consumed = await getControlDatabase().db.transaction(async tx => {
      const now = new Date();
      const [claimed] = await tx.update(authActionTokens).set({ consumedAt: now })
        .where(and(eq(authActionTokens.id, record.id), eq(authActionTokens.type, 'reset_password'),
          isNull(authActionTokens.consumedAt), gt(authActionTokens.expiresAt, sql`clock_timestamp()`)))
        .returning({ userId: authActionTokens.userId });
      if (!claimed) return false;
      await tx.update(users).set({ passwordHash, passwordChangedAt: now }).where(eq(users.id, claimed.userId));
      return true;
    });
    if (!consumed) return res.status(400).json({ error: 'Parola yenileme bağlantısı geçersiz veya süresi dolmuş.' });
    return res.json({ message: 'Parolanız yenilendi. Yeniden giriş yapabilirsiniz.' });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const rate = await guardedRateLimit(res, `login:${clientAddress(req)}:${email}`, 10, 15 * 60 * 1000);
      if (!rate) return;
      if (!rate.allowed) return res.set('Retry-After', String(rate.retryAfterSeconds)).status(429).json({ error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." });
      if (email) {
        const accountRate = await guardedRateLimit(res, `login-account:${email}`, 20, 15 * 60 * 1000);
        if (!accountRate) return;
        if (!accountRate.allowed) return res.set('Retry-After', String(accountRate.retryAfterSeconds)).status(429).json({ error: "Bu hesap için çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin." });
      }
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !(await AuthService.comparePassword(password, user.passwordHash || ""))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (!user.isSuperAdmin && isPlatformSuperAdminEmail(user.email)) {
        await getControlDatabase().db.update(users).set({ isSuperAdmin: true }).where(eq(users.id, user.id));
        user.isSuperAdmin = true;
      }

      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id)).orderBy(desc(memberships.createdAt));
      const company = membership
        ? await withAppTenant({ companyId: membership.companyId, userId: user.id }, (tenantDb) => tenantDb.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }))
        : null;

      const token = AuthService.generateToken({
        userId: user.id,
        companyId: membership?.companyId || null,
        role: membership?.role || null
      });

      const learner = await db.query.academyLearnerProfiles.findFirst({ where: eq(academyLearnerProfiles.userId, user.id) });
      setSessionCookies(res, token, { isSuperAdmin: user.isSuperAdmin });
      res.json({ token: bodyToken(req, token), user: publicRegisteredUser(user), company, role: membership?.role, accountType: learner ? 'academy_learner' : 'workspace' });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.user.userId) });
      if (!user) return res.status(401).json({ error: "Invalid token" });
      const [membership] = req.user.companyId
        ? await db.select().from(memberships).where(and(eq(memberships.userId, req.user.userId), eq(memberships.companyId, req.user.companyId)))
        : [];
      if (req.user.companyId && !membership) return res.status(403).json({ error: "Forbidden: Company membership required" });
      const company = membership
        ? await withAppTenant({ companyId: membership.companyId, userId: req.user.userId }, (tenantDb) => tenantDb.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }))
        : null;
      if (membership && !company) return res.status(403).json({ error: "Forbidden: Company unavailable" });
      const learner = await db.query.academyLearnerProfiles.findFirst({ where: req.user.companyId
        ? and(eq(academyLearnerProfiles.userId, req.user.userId), eq(academyLearnerProfiles.companyId, req.user.companyId))
        : eq(academyLearnerProfiles.userId, req.user.userId) });
      res.json({
        user: {
          ...publicRegisteredUser(user),
          ...(req.user.impersonatedBy ? { impersonatedBy: req.user.impersonatedBy, readOnly: req.user.readOnly } : {})
        },
        company,
        role: membership?.role ?? null,
        accountType: learner ? 'academy_learner' : 'workspace',
        learnerProfile: learner ? { onboardingCompletedAt: learner.onboardingCompletedAt, selectedLessonSlug: learner.selectedLessonSlug } : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Cookies are HttpOnly, so only the server can end a browser session.
  app.post("/api/auth/logout", (req, res) => {
    // Unauthenticated by design (idempotent), but never cross-site: SameSite=Strict cookies plus the origin proof below.
    if (!isSameOriginMutation(req)) return res.status(403).json({ error: "Geçersiz istek kaynağı.", code: "CSRF_ORIGIN_MISMATCH" });
    clearSessionCookies(res);
    res.json({ success: true });
  });

  app.post("/api/auth/impersonate/exit", authenticate, async (req, res) => {
    try {
      if (!req.user?.impersonatedBy) {
        return res.status(400).json({ error: "Aktif bir impersonasyon oturumu bulunmuyor." });
      }

      await db.insert(adminAuditLogs).values({
        adminId: req.user.impersonatedBy,
        targetCompanyId: req.user.companyId ?? null,
        action: "impersonation.ended",
        details: {
          impersonatedUserId: req.user.userId,
          tokenHash: req.user.impersonationTokenHash,
          endedAt: new Date().toISOString(),
        },
      });

      // Browser sessions live in cookies: drop the impersonation session and return to the admin's own session.
      const adminRestored = restoreAdminSession(res, parseCookies(req.headers.cookie)[ADMIN_COOKIE]);
      res.json({ success: true, adminRestored, message: "Impersonasyon oturumu başarıyla sonlandırıldı." });
    } catch (error) {
      console.error("Failed to exit impersonation:", error);
      res.status(500).json({ error: "Impersonasyon oturumu sonlandırılırken hata oluştu." });
    }
  });
}
