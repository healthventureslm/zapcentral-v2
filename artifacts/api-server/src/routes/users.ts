import { Router } from "express";
import { getAuth, clerkClient } from "../lib/devAuth";
import { db } from "@workspace/db";
import {
  tenantUsersTable,
  departmentAgentsTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  requireAuth,
  requireTenantMember,
  requireTenantAdmin,
} from "../middlewares/auth";

const router = Router();

/** ISO date string in the future, or null for continuous access */
const accessExpiresAtSchema = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((v) => (v == null ? v : new Date(v)))
  .refine((v) => v == null || v.getTime() > Date.now(), {
    message: "accessExpiresAt must be in the future",
  });

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "supervisor", "agent"]),
  accessExpiresAt: accessExpiresAtSchema,
});

const userPatchSchema = z.object({
  role: z.enum(["admin", "supervisor", "agent"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  accessExpiresAt: accessExpiresAtSchema,
});

const LAST_ADMIN_ERROR =
  "Não é possível deixar a central sem um admin ativo. Adicione outro admin antes de continuar.";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function isCallerSuperAdmin(clerkUserId: string): Promise<boolean> {
  const [membership] = await db
    .select({ isSuperAdmin: tenantUsersTable.isSuperAdmin })
    .from(tenantUsersTable)
    .where(
      and(
        eq(tenantUsersTable.clerkUserId, clerkUserId),
        eq(tenantUsersTable.isSuperAdmin, true),
      ),
    )
    .limit(1);

  return membership?.isSuperAdmin === true;
}

async function ensureSuperAdminCanManageTenant(
  tx: DbTransaction,
  tenantId: number,
  clerkUserId: string,
): Promise<void> {
  const [existingMembership] = await tx
    .select({ clerkUserId: tenantUsersTable.clerkUserId })
    .from(tenantUsersTable)
    .where(
      and(
        eq(tenantUsersTable.tenantId, tenantId),
        eq(tenantUsersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);

  if (existingMembership) {
    await tx
      .update(tenantUsersTable)
      .set({
        role: "admin",
        status: "active",
        accessExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tenantUsersTable.tenantId, tenantId),
          eq(tenantUsersTable.clerkUserId, clerkUserId),
        ),
      );
    return;
  }

  const [superAdminMembership] = await tx
    .select({
      email: tenantUsersTable.email,
      firstName: tenantUsersTable.firstName,
      lastName: tenantUsersTable.lastName,
      avatarUrl: tenantUsersTable.avatarUrl,
    })
    .from(tenantUsersTable)
    .where(
      and(
        eq(tenantUsersTable.clerkUserId, clerkUserId),
        eq(tenantUsersTable.isSuperAdmin, true),
      ),
    )
    .limit(1);

  if (!superAdminMembership) {
    throw new Error("SUPER_ADMIN_MEMBERSHIP_NOT_FOUND");
  }

  await tx.insert(tenantUsersTable).values({
    tenantId,
    clerkUserId,
    email: superAdminMembership.email,
    firstName: superAdminMembership.firstName,
    lastName: superAdminMembership.lastName,
    avatarUrl: superAdminMembership.avatarUrl,
    role: "admin",
    status: "active",
    isSuperAdmin: true,
    accessExpiresAt: null,
  });
}

function isUsableActiveAdmin(membership: {
  role: string;
  status: string;
  accessExpiresAt: Date | null;
}): boolean {
  return (
    membership.role === "admin" &&
    membership.status === "active" &&
    (membership.accessExpiresAt === null ||
      membership.accessExpiresAt.getTime() > Date.now())
  );
}

/**
 * GET /api/tenants/:tenantId/users — tenant member
 */
router.get(
  "/tenants/:tenantId/users",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const users = await db
      .select()
      .from(tenantUsersTable)
      .where(eq(tenantUsersTable.tenantId, tenantId));

    const enriched = await Promise.all(
      users.map(async (u) => {
        const depts = await db
          .select({ name: departmentsTable.name })
          .from(departmentAgentsTable)
          .innerJoin(
            departmentsTable,
            eq(departmentAgentsTable.departmentId, departmentsTable.id),
          )
          .where(
            and(
              eq(departmentAgentsTable.clerkUserId, u.clerkUserId),
              eq(departmentAgentsTable.tenantId, tenantId),
            ),
          );

        return {
          clerkUserId: u.clerkUserId,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
          role: u.role,
          status: u.status,
          isSuperAdmin: u.isSuperAdmin,
          accessExpiresAt: u.accessExpiresAt,
          departments: depts.map((d) => d.name),
          joinedAt: u.joinedAt,
        };
      }),
    );

    res.json(enriched);
  },
);

/**
 * POST /api/tenants/:tenantId/users/invite — admin only
 * Creates a Clerk invitation and a pending membership record.
 * When the invited user signs up via Clerk and calls GET /api/me,
 * the invite is automatically reconciled (placeholder → real userId, status → active).
 */
router.post(
  "/tenants/:tenantId/users/invite",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }
    const { email, role, accessExpiresAt } = parsed.data;

    // Check if user is already a member (by email)
    const [alreadyMember] = await db
      .select()
      .from(tenantUsersTable)
      .where(
        and(
          eq(tenantUsersTable.tenantId, tenantId),
          eq(tenantUsersTable.email, email),
        ),
      )
      .limit(1);

    if (alreadyMember && alreadyMember.status !== "invited") {
      res
        .status(409)
        .json({ error: "User is already a member of this tenant" });
      return;
    }

    // Send a real Clerk invitation email
    let clerkInvitationId: string | null = null;
    try {
      const invitation = await clerkClient.invitations.createInvitation({
        emailAddress: email,
        ignoreExisting: true,
      });
      clerkInvitationId = invitation.id;
    } catch {
      // Non-fatal: Clerk invitation may fail for existing Clerk users;
      // the pending membership record still allows claim-invites reconciliation.
    }

    // Upsert a pending invite record
    const inviteToken = `invite_${tenantId}_${Date.now()}`;
    const [user] = await db
      .insert(tenantUsersTable)
      .values({
        tenantId,
        clerkUserId: alreadyMember?.clerkUserId ?? inviteToken,
        email,
        role,
        status: "invited",
        accessExpiresAt: accessExpiresAt ?? null,
      })
      .onConflictDoUpdate({
        target: [tenantUsersTable.tenantId, tenantUsersTable.clerkUserId],
        set: {
          role,
          status: "invited",
          email,
          accessExpiresAt: accessExpiresAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.status(201).json({
      ...user,
      departments: [],
      clerkInvitationId,
    });
  },
);

/**
 * PATCH /api/tenants/:tenantId/users/:userId — admin only
 */
router.patch(
  "/tenants/:tenantId/users/:userId",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const userId = String(req.params["userId"]);
    const { userId: callerId } = getAuth(req);
    if (!callerId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const callerIsSuperAdmin = await isCallerSuperAdmin(callerId);

    if (userId === callerId) {
      res.status(400).json({ error: "Cannot modify your own role or status" });
      return;
    }

    const parsed = userPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }

    const { role, status, accessExpiresAt } = parsed.data;

    if (
      role === undefined &&
      status === undefined &&
      accessExpiresAt === undefined
    ) {
      res.status(400).json({
        error: "At least one of role, status or accessExpiresAt is required",
      });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) updates["role"] = role;
    if (status !== undefined) updates["status"] = status;
    if (accessExpiresAt !== undefined)
      updates["accessExpiresAt"] = accessExpiresAt;

    const outcome = await db.transaction(async (tx) => {
      // Lock every membership in a stable order before checking the remaining
      // admins. Concurrent removals or suspensions for the same central will
      // wait here, then re-read the already-updated membership state.
      const memberships = await tx
        .select({
          clerkUserId: tenantUsersTable.clerkUserId,
          role: tenantUsersTable.role,
          status: tenantUsersTable.status,
          accessExpiresAt: tenantUsersTable.accessExpiresAt,
        })
        .from(tenantUsersTable)
        .where(eq(tenantUsersTable.tenantId, tenantId))
        .orderBy(tenantUsersTable.clerkUserId)
        .for("update");

      const target = memberships.find(
        (membership) => membership.clerkUserId === userId,
      );
      if (!target) return { kind: "not_found" as const };

      const removesAdminAccess =
        isUsableActiveAdmin(target) &&
        ((role !== undefined && role !== "admin") ||
          status === "suspended" ||
          (accessExpiresAt !== undefined && accessExpiresAt !== null));
      const hasOtherUsableAdmin = memberships.some(
        (membership) =>
          membership.clerkUserId !== userId && isUsableActiveAdmin(membership),
      );

      if (removesAdminAccess && !hasOtherUsableAdmin) {
        if (!callerIsSuperAdmin) {
          return { kind: "last_admin" as const };
        }

        // The platform super-admin may intervene, but becomes an active tenant
        // admin first so the central never loses its local administrator.
        await ensureSuperAdminCanManageTenant(tx, tenantId, callerId);
      }

      const [updated] = await tx
        .update(tenantUsersTable)
        .set(updates)
        .where(
          and(
            eq(tenantUsersTable.tenantId, tenantId),
            eq(tenantUsersTable.clerkUserId, userId),
          ),
        )
        .returning();

      return { kind: "updated" as const, user: updated };
    });

    if (outcome.kind === "not_found") {
      res.status(404).json({ error: "User not found in tenant" });
      return;
    }

    if (outcome.kind === "last_admin") {
      res.status(400).json({ error: LAST_ADMIN_ERROR });
      return;
    }

    if (!outcome.user) {
      res.status(404).json({ error: "User not found in tenant" });
      return;
    }

    res.json({ ...outcome.user, departments: [] });
  },
);

/**
 * DELETE /api/tenants/:tenantId/users/:userId — admin only
 */
router.delete(
  "/tenants/:tenantId/users/:userId",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const userId = String(req.params["userId"]);
    const { userId: callerId } = getAuth(req);
    if (!callerId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const callerIsSuperAdmin = await isCallerSuperAdmin(callerId);

    if (userId === callerId) {
      res.status(400).json({ error: "Cannot remove yourself from tenant" });
      return;
    }

    const outcome = await db.transaction(async (tx) => {
      // This lock uses the same tenant-wide membership set as PATCH so a
      // simultaneous delete, suspension, or demotion cannot race the guard.
      const memberships = await tx
        .select({
          clerkUserId: tenantUsersTable.clerkUserId,
          role: tenantUsersTable.role,
          status: tenantUsersTable.status,
          accessExpiresAt: tenantUsersTable.accessExpiresAt,
        })
        .from(tenantUsersTable)
        .where(eq(tenantUsersTable.tenantId, tenantId))
        .orderBy(tenantUsersTable.clerkUserId)
        .for("update");

      const target = memberships.find(
        (membership) => membership.clerkUserId === userId,
      );
      if (!target) return { kind: "not_found" as const };

      const hasOtherUsableAdmin = memberships.some(
        (membership) =>
          membership.clerkUserId !== userId && isUsableActiveAdmin(membership),
      );

      if (isUsableActiveAdmin(target) && !hasOtherUsableAdmin) {
        if (!callerIsSuperAdmin) {
          return { kind: "last_admin" as const };
        }

        await ensureSuperAdminCanManageTenant(tx, tenantId, callerId);
      }

      await tx
        .delete(tenantUsersTable)
        .where(
          and(
            eq(tenantUsersTable.tenantId, tenantId),
            eq(tenantUsersTable.clerkUserId, userId),
          ),
        );

      await tx
        .delete(departmentAgentsTable)
        .where(
          and(
            eq(departmentAgentsTable.tenantId, tenantId),
            eq(departmentAgentsTable.clerkUserId, userId),
          ),
        );

      return { kind: "deleted" as const };
    });

    if (outcome.kind === "not_found") {
      res.status(404).json({ error: "User not found in tenant" });
      return;
    }

    if (outcome.kind === "last_admin") {
      res.status(400).json({ error: LAST_ADMIN_ERROR });
      return;
    }

    res.status(204).end();
  },
);

export default router;
