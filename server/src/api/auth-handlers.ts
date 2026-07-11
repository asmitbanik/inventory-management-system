import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { OrgRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { setAuthCookie, clearAuthCookie, getTokenFromRequest, verifyToken } from '../lib/auth.js';
import { acceptPendingInvites } from '../lib/invites.js';

const registerSchema = z.object({
  email: z.string().email('Enter a valid email like you@gmail.com'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email like you@gmail.com'),
  password: z.string().min(1, 'Password is required'),
});

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'staff']).default('staff'),
});

function getOrgIdFromPath(path: string): string | null {
  const match = path.match(/\/auth\/organizations\/([^/]+)/);
  return match?.[1] ?? null;
}

async function requireOrg(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
  requireOwnerRole = false
): Promise<string | null> {
  const orgId = (req.headers['x-organization-id'] as string | undefined) || getOrgIdFromPath(req.url?.split('?')[0] ?? '');
  if (!orgId) {
    res.status(400).json({ error: 'Organization context required' });
    return null;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership) {
    res.status(403).json({ error: 'Not a member of this organization' });
    return null;
  }
  if (requireOwnerRole && membership.role !== OrgRole.owner) {
    res.status(403).json({ error: 'Owner access required' });
    return null;
  }
  return orgId;
}

function formatUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  memberships: { organization: { id: string; name: string }; role: OrgRole }[];
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    organizations: user.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    })),
  };
}

async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      memberships: {
        include: { organization: { select: { id: true, name: true } } },
      },
    },
  });
}

function readJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.reject(new Error('Invalid JSON'));
    }
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validationError(res: VercelResponse, error: z.ZodError) {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

async function requireUserId(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const token = getTokenFromRequest({
    cookies: req.cookies as Record<string, string> | undefined,
    headers: {
      authorization: req.headers.authorization as string | undefined,
      cookie: req.headers.cookie as string | undefined,
    },
  });
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }
    return user.id;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  const parsed = registerSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return validationError(res, parsed.error);

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true },
  });

  await acceptPendingInvites(user.id, user.email);
  const profile = await getUserProfile(user.id);
  if (!profile) return res.status(500).json({ error: 'Failed to create account' });

  setAuthCookie(res, { userId: user.id, email: user.email });
  return res.status(201).json({ user: formatUser(profile) });
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const parsed = loginSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return validationError(res, parsed.error);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  await acceptPendingInvites(user.id, user.email);
  const profile = await getUserProfile(user.id);
  if (!profile) return res.status(404).json({ error: 'User not found' });

  setAuthCookie(res, { userId: user.id, email: user.email });
  return res.json({ user: formatUser(profile) });
}

async function handleLogout(_req: VercelRequest, res: VercelResponse) {
  clearAuthCookie(res);
  return res.json({ success: true });
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const token = getTokenFromRequest({
    cookies: req.cookies as Record<string, string> | undefined,
    headers: {
      authorization: req.headers.authorization as string | undefined,
      cookie: req.headers.cookie as string | undefined,
    },
  });
  if (!token) return res.status(200).json({ user: null });

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

    await acceptPendingInvites(user.id, user.email);
    const profile = await getUserProfile(user.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: formatUser(profile) });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function handleCreateOrganization(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const parsed = createOrgSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return validationError(res, parsed.error);

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId, role: OrgRole.owner },
      },
    },
  });

  return res.status(201).json({
    organization: { id: org.id, name: org.name, role: OrgRole.owner },
  });
}

async function handleGetMembers(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const orgId = await requireOrg(req, res, userId);
  if (!orgId) return;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return res.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt,
    })),
  });
}

async function handleInviteMember(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const orgId = await requireOrg(req, res, userId, true);
  if (!orgId) return;

  const parsed = inviteSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return validationError(res, parsed.error);

  const { email, role } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: existingUser.id, organizationId: orgId } },
    });
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }
    await prisma.organizationMember.create({
      data: { userId: existingUser.id, organizationId: orgId, role },
    });
    return res.status(201).json({ message: 'User added to organization' });
  }

  await prisma.orgInvite.upsert({
    where: { organizationId_email: { organizationId: orgId, email } },
    update: { role },
    create: { organizationId: orgId, email, role, invitedById: userId },
  });
  return res.status(201).json({ message: 'Invitation created. User will join when they sign in.' });
}

async function handleRemoveMember(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const orgId = await requireOrg(req, res, userId, true);
  if (!orgId) return;

  const memberId = req.url?.match(/\/members\/([^/?]+)/)?.[1];
  if (!memberId) return res.status(400).json({ error: 'Member id required' });

  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
  });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.userId === userId) {
    return res.status(400).json({ error: 'Cannot remove yourself' });
  }

  await prisma.organizationMember.delete({ where: { id: member.id } });
  return res.json({ success: true });
}

export async function dispatchAuth(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0] ?? '';
  const method = req.method ?? 'GET';

  try {
    if (path.endsWith('/auth/register') && method === 'POST') return handleRegister(req, res);
    if (path.endsWith('/auth/login') && method === 'POST') return handleLogin(req, res);
    if (path.endsWith('/auth/logout') && method === 'POST') return handleLogout(req, res);
    if (path.endsWith('/auth/me') && method === 'GET') return handleMe(req, res);
    if (path.endsWith('/auth/organizations') && method === 'POST') {
      return handleCreateOrganization(req, res);
    }
    if (path.includes('/auth/organizations/') && path.endsWith('/members') && method === 'GET') {
      return handleGetMembers(req, res);
    }
    if (path.includes('/auth/organizations/') && path.endsWith('/invites') && method === 'POST') {
      return handleInviteMember(req, res);
    }
    if (path.includes('/auth/organizations/') && path.includes('/members/') && method === 'DELETE') {
      return handleRemoveMember(req, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Auth handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
