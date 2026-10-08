import { db } from "../../db";
import { users, companies, memberships, subscriptions } from "../../db/schema";
import { pilotRepository } from "./PilotRepository";
import { eq } from "drizzle-orm";
import { issueAuthAction, deliverAuthLink, actionUrl } from "../../server/routes/auth";
import { publicRegisteredUser } from "../../server/auth/registration";

export class ApiError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class PilotService {
  async getDashboardData() {
    const applications = await pilotRepository.findAll();
    const metrics = await pilotRepository.getMetrics();
    return { applications, metrics };
  }

  async updateApplication(id: string, updates: any) {
    const existing = await pilotRepository.findById(id);
    if (!existing) throw new ApiError(404, "Pilot başvurusu bulunamadı.");

    const payload: any = {};
    if (updates.status) {
      if (updates.status === 'contacted' && !existing.contactedAt) payload.contactedAt = new Date();
      if (updates.status === 'qualified' && !existing.qualifiedAt) payload.qualifiedAt = new Date();
    }
    if (updates.paymentStatus) {
      if (updates.paymentStatus === 'offered') payload.offerSentAt = new Date();
      if (updates.paymentStatus === 'paid') payload.paidAt = new Date();
    }
    if (updates.offerAmount !== undefined) payload.offerAmount = updates.offerAmount;

    return await pilotRepository.updateStatus(id, updates.status || existing.status, {
      ...payload,
      paymentStatus: updates.paymentStatus || existing.paymentStatus
    });
  }

  async convertToTenant(id: string) {
    const application = await pilotRepository.findById(id);
    if (!application) throw new ApiError(404, "Pilot başvurusu bulunamadı.");
    if (application.provisionedCompanyId) throw new ApiError(409, "Bu başvuru zaten bir hesaba dönüştürülmüş.");

    const [existingUser] = await db.select().from(users).where(eq(users.email, application.email));
    if (existingUser) throw new ApiError(409, "Bu e-postayla zaten bir hesap var.");

    try {
      const result = await db.transaction(async (tx) => {
        const [company] = await tx.insert(companies).values({ name: application.companyName, phone: application.phone ?? undefined }).returning();
        const [user] = await tx.insert(users).values({ email: application.email, fullName: application.fullName, passwordHash: null, emailVerified: new Date() }).returning();
        await tx.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
        await tx.insert(subscriptions).values({ companyId: company.id, plan: "starter" });
        return { company, user };
      });

      const resetToken = await issueAuthAction(result.user.id, "reset_password", 7 * 24 * 60 * 60 * 1000);
      const setPasswordUrl = await deliverAuthLink("reset_password", result.user.email, actionUrl(`/reset-password/${resetToken}`));

      const updatedApplication = await pilotRepository.updateStatus(id, "converted", {
        convertedAt: application.convertedAt ?? new Date(),
        provisionedCompanyId: result.company.id,
        provisionedUserId: result.user.id
      });

      return {
        application: updatedApplication,
        company: result.company,
        user: publicRegisteredUser(result.user),
        ...(setPasswordUrl ? { setPasswordUrl } : {}),
      };
    } catch (error: any) {
      if (error?.code === "23505") throw new ApiError(409, "Bu e-postayla zaten bir hesap var.");
      throw new ApiError(500, "Hesap dönüştürme işlemi başarısız.");
    }
  }
}

export const pilotService = new PilotService();
