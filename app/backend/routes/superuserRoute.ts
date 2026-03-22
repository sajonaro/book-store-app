import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { TenantModel } from '../models/tenantModel';
import { UserModel } from '../models/userModel';

const router = express.Router();

/** Guard: superuser only */
function requireSuperuser(req: Request, res: Response, next: express.NextFunction): void {
  if (!req.isSuperuser) {
    res.status(403).json({ msg: 'Superuser access required' });
    return;
  }
  next();
}

/**
 * GET /superuser/tenants
 * List all tenants with their tenant-admin users.
 */
router.get('/tenants', requireAuth, requireSuperuser, async (req: Request, res: Response) => {
  try {
    const tenants = await TenantModel.findAll();

    // Attach admins for each tenant
    const result = await Promise.all(
      tenants.map(async (t) => {
        const admins = await UserModel.findAdminsByTenantId(t.id);
        return {
          id: t.id,
          store_name: t.store_name,
          slug: t.slug,
          is_active: t.is_active,
          created_at: t.created_at,
          admins: admins.map((a) => ({ id: a.id, name: a.name, email: a.email })),
        };
      }),
    );

    return res.status(200).json({ data: result });
  } catch (error: unknown) {
    console.error('superuser list tenants error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * PUT /superuser/tenants/:id/suspend
 * Suspend a tenant (is_active = false). All their users are blocked from logging in.
 */
router.put('/tenants/:id/suspend', requireAuth, requireSuperuser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await TenantModel.setActive(id, false);
    if (!ok) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }
    return res.status(200).json({ msg: 'Tenant suspended successfully' });
  } catch (error: unknown) {
    console.error('suspend tenant error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * PUT /superuser/tenants/:id/activate
 * Re-activate a suspended tenant.
 */
router.put('/tenants/:id/activate', requireAuth, requireSuperuser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await TenantModel.setActive(id, true);
    if (!ok) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }
    return res.status(200).json({ msg: 'Tenant activated successfully' });
  } catch (error: unknown) {
    console.error('activate tenant error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * PUT /superuser/tenants/:tenantId/admins/:userId/password
 * Reset a tenant-admin's password (superuser only).
 * Body: { new_password }
 */
router.put(
  '/tenants/:tenantId/admins/:userId/password',
  requireAuth,
  requireSuperuser,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = req.params;
      const { new_password } = req.body as { new_password?: unknown };

      if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
        return res.status(400).json({ msg: 'new_password must be at least 8 characters' });
      }

      // Verify the user belongs to the tenant and is a tenant-admin
      const admins = await UserModel.findAdminsByTenantId(tenantId);
      const target = admins.find((a) => a.id === userId);
      if (!target) {
        return res.status(404).json({ msg: 'Tenant admin not found for this tenant' });
      }

      const updated = await UserModel.updateProfile(userId, { password: new_password });
      if (!updated) {
        return res.status(500).json({ msg: 'Failed to update password' });
      }

      return res.status(200).json({ msg: `Password updated for ${target.email}` });
    } catch (error: unknown) {
      console.error('reset admin password error:', (error as Error).message);
      return res.status(500).json({ msg: 'Internal server error' });
    }
  },
);

export default router;
