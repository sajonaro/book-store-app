import { Request, Response, NextFunction } from 'express';

/**
 * Auth token format: base64(userId:email:tenantId:role:timestamp)
 * For superusers, tenantId is an empty string.
 *
 * Backward-compatible: old 4-part tokens (no role field) are decoded as role='admin'.
 */

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string | null;
  role: string;
  isSuperuser: boolean;
}

// Extend Express Request to carry auth info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      tenantId?: string;       // undefined for superusers
      isSuperuser?: boolean;
    }
  }
}

/**
 * requireAuth — verifies the Authorization Bearer token and attaches
 * authUser + tenantId to the request. Returns 401 if missing or invalid.
 *
 * Superusers: tenantId is NOT set on req (undefined); req.isSuperuser = true.
 * Tenant admins: req.tenantId is set; req.isSuperuser = false.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ msg: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    // New format: userId:email:tenantId:role:timestamp (5+ parts)
    // Old format: userId:email:tenantId:timestamp (4 parts) — treat as role='admin'
    if (parts.length < 4) {
      res.status(401).json({ msg: 'Invalid token' });
      return;
    }

    const [id, email, tenantIdRaw] = parts;
    const role = parts.length >= 5 ? parts[3] : 'tenant-admin';
    const isSuperuser = role === 'superuser';
    const tenantId = !tenantIdRaw || tenantIdRaw === '' ? null : tenantIdRaw;

    req.authUser = { id, email, tenantId, role, isSuperuser };
    req.isSuperuser = isSuperuser;
    if (!isSuperuser && tenantId) {
      req.tenantId = tenantId;
    }
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
}
