import type { Request, Response, NextFunction } from 'express';
import { OrgRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getTokenFromRequest, verifyToken } from '../lib/auth.js';
import { acceptPendingInvites } from '../lib/invites.js';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export interface OrgContext {
  organizationId: string;
  role: OrgRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  org?: OrgContext;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    await acceptPendingInvites(user.id, user.email);
    req.user = { userId: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function orgMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const orgId = req.headers['x-organization-id'] as string | undefined;
  if (!orgId) {
    return res.status(400).json({ error: 'Organization context required' });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId: req.user!.userId, organizationId: orgId },
    },
  });

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this organization' });
  }

  req.org = { organizationId: orgId, role: membership.role };
  next();
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.org || req.org.role !== OrgRole.owner) {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}
