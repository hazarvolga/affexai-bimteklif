import type { Express } from "express";
import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, companyIndustrySettings, invitations, memberships, users } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";

export function registerCompanyRoutes(app: Express) {
  app.get("/api/company/team", authenticate, async (req, res) => {
    const members = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.companyId, req.user.companyId));

    res.json(members);
  });

  app.get("/api/company/industry-settings", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const settings = await db.select().from(companyIndustrySettings)
        .where(eq(companyIndustrySettings.companyId, companyId));

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industry settings" });
    }
  });

  app.post("/api/company/industry-settings", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { industryId, isEnabled } = req.body;
      const companyId = req.user.companyId;

      await db.insert(companyIndustrySettings)
        .values({ companyId, industryId, isEnabled })
        .onConflictDoUpdate({
          target: [companyIndustrySettings.companyId, companyIndustrySettings.industryId],
          set: { isEnabled }
        });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update industry settings" });
    }
  });

  app.get("/api/company", async (req, res) => {
    try {
      const company = await db.query.companies.findFirst();
      res.json(company || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.get("/api/invitations", authenticate, async (req, res) => {
    try {
      const invites = await db.select().from(invitations).where(eq(invitations.companyId, req.user.companyId)).orderBy(desc(invitations.createdAt));
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.post("/api/invitations", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { email, role } = req.body;
      const companyId = req.user.companyId;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [newInvite] = await db.insert(invitations).values({
        companyId,
        email,
        role: role || "viewer",
        token,
        invitedBy: req.user.userId,
        expiresAt,
      } as any).returning();

      console.log(`Invitation link: http://0.0.0.0:3000/accept-invite/${token}`);
      res.json(newInvite);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invite);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify invitation" });
    }
  });

  app.post("/api/invitations/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { fullName } = req.body;

      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: "Invalid or expired invitation" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");

      const [newUser] = await db.insert(users).values({
        email: invite.email,
        fullName,
        verificationToken,
        emailVerified: null,
      } as any).returning();

      await db.update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      console.log(`Verification link: http://0.0.0.0:3000/verify-email/${verificationToken}`);

      res.json(newUser);
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await db.query.users.findFirst({
        where: eq(users.verificationToken, token)
      });

      if (!user) {
        return res.status(404).json({ error: "Invalid verification token" });
      }

      await db.update(users)
        .set({
          emailVerified: new Date(),
          verificationToken: null
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Email successfully verified!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
}
