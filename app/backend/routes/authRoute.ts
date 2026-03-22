import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/userModel';
import { TenantModel } from '../models/tenantModel';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Stricter rate limit for auth endpoint — 100 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts, please try again later.' },
});

// Rate limit for registration — 50 registrations per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many registration attempts, please try again later.' },
});

/**
 * POST /auth/register
 * Self-service tenant registration.
 * Body: { store_name, admin_name, email, password, openai_api_key }
 * Creates a new tenant + tenant-admin user. Returns token + user info (auto-login).
 *
 * Email must be globally unique (no two users across any tenant may share an email).
 */
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { store_name, admin_name, email, password, openai_api_key } =
      req.body as {
        store_name?: unknown;
        admin_name?: unknown;
        email?: unknown;
        password?: unknown;
        openai_api_key?: unknown;
      };

    if (!store_name || typeof store_name !== 'string' || !store_name.trim()) {
      return res.status(400).json({ msg: 'store_name is required' });
    }
    if (!admin_name || typeof admin_name !== 'string' || !admin_name.trim()) {
      return res.status(400).json({ msg: 'admin_name is required' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ msg: 'email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ msg: 'password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Enforce global email uniqueness before creating the tenant
    const taken = await UserModel.emailExists(normalizedEmail);
    if (taken) {
      return res.status(409).json({ msg: 'An account with this email already exists. Please use a different email address.' });
    }

    const apiKey = openai_api_key && typeof openai_api_key === 'string' ? openai_api_key.trim() : '';
    const tenant = await TenantModel.create(store_name.trim(), apiKey);

    // Create tenant-admin user for this tenant
    const user = await UserModel.create(
      tenant.id,
      admin_name.trim(),
      normalizedEmail,
      password,
      'tenant-admin',
    );

    // Issue token: base64(userId:email:tenantId:tenant-admin:timestamp)
    const token = Buffer.from(`${user.id}:${user.email}:${tenant.id}:tenant-admin:${Date.now()}`).toString('base64');

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      role: 'tenant-admin',
      tenant: { id: tenant.id, store_name: tenant.store_name, slug: tenant.slug, has_openai_key: !!apiKey },
    });
  } catch (error: unknown) {
    console.error('register error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 *
 * Slug-free login: email is globally unique across all tenants.
 * The backend looks up the user by email to determine their role and tenant.
 * - superuser (tenant_id IS NULL) → superuser session
 * - tenant-admin → full-access tenant session
 * - user → read-only tenant session
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ msg: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ msg: 'Password is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up the user globally by email
    const user = await UserModel.findByEmailGlobal(normalizedEmail);
    if (!user) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.pwd_hash);
    if (!match) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    // ── Superuser ───────────────────────────────────────────────────────────
    if (user.role === 'superuser' || user.tenant_id === null) {
      const token = Buffer.from(
        `${user.id}:${user.email}::superuser:${Date.now()}`
      ).toString('base64');

      return res.status(200).json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
        role: 'superuser',
        tenant: null,
      });
    }

    // ── Tenant user (tenant-admin or user) ──────────────────────────────────
    const tenant = await TenantModel.findById(user.tenant_id);
    if (!tenant) {
      return res.status(500).json({ msg: 'Tenant not found for this user' });
    }

    // Block login if tenant is suspended
    if (tenant.is_active === false) {
      return res.status(403).json({ msg: 'Your store account has been suspended. Please contact support.' });
    }

    const token = Buffer.from(
      `${user.id}:${user.email}:${tenant.id}:${user.role}:${Date.now()}`
    ).toString('base64');

    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      role: user.role,
      tenant: { id: tenant.id, store_name: tenant.store_name, slug: tenant.slug, has_openai_key: !!tenant.openai_api_key_enc },
    });
  } catch (error: unknown) {
    console.error('login error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * GET /auth/me
 * Returns the current user's info + tenant public info.
 * For superusers, tenant is null.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.isSuperuser) {
      return res.status(200).json({
        user: req.authUser,
        role: 'superuser',
        tenant: null,
      });
    }
    const tenantId = req.tenantId!;
    const tenantInfo = await TenantModel.getPublicInfo(tenantId);
    return res.status(200).json({
      user: req.authUser,
      role: req.authUser?.role || 'tenant-admin',
      tenant: tenantInfo,
    });
  } catch (error: unknown) {
    console.error('me error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * PUT /auth/profile
 * Update the currently logged-in tenant-admin's email and/or password.
 * Only accessible to users with role 'tenant-admin'.
 * Body: { email?, current_password, new_password? }
 *
 * - current_password is always required to authorize the change.
 * - email must be globally unique if changing.
 * - new_password must be at least 8 characters if provided.
 */
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;

    const { email, current_password, new_password } = req.body as {
      email?: unknown;
      current_password?: unknown;
      new_password?: unknown;
    };

    if (!current_password || typeof current_password !== 'string') {
      return res.status(400).json({ msg: 'current_password is required to authorize changes' });
    }

    // Verify current password
    const userRow = await UserModel.findByEmailGlobal(authUser.email);
    if (!userRow) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const passwordMatch = await bcrypt.compare(current_password, userRow.pwd_hash);
    if (!passwordMatch) {
      return res.status(401).json({ msg: 'Current password is incorrect' });
    }

    const updates: { email?: string; password?: string } = {};

    // Validate new email if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ msg: 'email must be a non-empty string' });
      }
      const newEmail = email.toLowerCase().trim();
      if (newEmail !== authUser.email) {
        const taken = await UserModel.emailExists(newEmail);
        if (taken) {
          return res.status(409).json({ msg: 'This email is already in use by another account' });
        }
        updates.email = newEmail;
      }
    }

    // Validate new password if provided
    if (new_password !== undefined) {
      if (typeof new_password !== 'string' || new_password.length < 8) {
        return res.status(400).json({ msg: 'new_password must be at least 8 characters' });
      }
      updates.password = new_password;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ msg: 'No changes provided' });
    }

    const updated = await UserModel.updateProfile(authUser.id, updates);
    if (!updated) {
      return res.status(500).json({ msg: 'Failed to update profile' });
    }

    return res.status(200).json({
      msg: 'Profile updated successfully',
      user: { id: updated.id, name: updated.name, email: updated.email },
    });
  } catch (error: unknown) {
    console.error('profile update error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * GET /auth/users
 * List all users for the current tenant (tenant-admin only).
 */
router.get('/users', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    if (authUser.role !== 'tenant-admin') {
      return res.status(403).json({ msg: 'Only tenant admins can list users' });
    }
    const tenantId = req.tenantId!;
    const users = await UserModel.findByTenantId(tenantId);
    return res.status(200).json({
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
      })),
    });
  } catch (error: unknown) {
    console.error('list users error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /auth/users
 * Create a new ordinary user ('user' role) for the current tenant.
 * Only accessible to tenant-admins.
 * Body: { name, email, password }
 */
router.post('/users', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    if (authUser.role !== 'tenant-admin') {
      return res.status(403).json({ msg: 'Only tenant admins can create users' });
    }

    const { name, email, password } = req.body as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ msg: 'name is required' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ msg: 'email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ msg: 'password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const taken = await UserModel.emailExists(normalizedEmail);
    if (taken) {
      return res.status(409).json({ msg: 'An account with this email already exists' });
    }

    const tenantId = req.tenantId!;
    const newUser = await UserModel.create(tenantId, name.trim(), normalizedEmail, password, 'user');

    return res.status(201).json({
      msg: 'User created successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error: unknown) {
    console.error('create user error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * DELETE /auth/users/:id
 * Delete a user from the current tenant (tenant-admin only).
 * Cannot delete yourself.
 */
router.delete('/users/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    if (authUser.role !== 'tenant-admin') {
      return res.status(403).json({ msg: 'Only tenant admins can delete users' });
    }

    const { id } = req.params;
    if (id === authUser.id) {
      return res.status(400).json({ msg: 'You cannot delete your own account' });
    }

    const tenantId = req.tenantId!;
    const deleted = await UserModel.deleteById(id, tenantId);
    if (!deleted) {
      return res.status(404).json({ msg: 'User not found' });
    }

    return res.status(200).json({ msg: 'User deleted successfully' });
  } catch (error: unknown) {
    console.error('delete user error:', (error as Error).message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

export default router;
