import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { OrgRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { setAuthCookie, clearAuthCookie } from '../lib/auth.js';
import { acceptPendingInvites } from '../lib/invites.js';
import { authMiddleware, orgMiddleware, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

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

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
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

    await acceptPendingInvites(user.id, user.email);
    const profile = await getUserProfile(user.id);
    if (!profile) return res.status(500).json({ error: 'Failed to create account' });

    setAuthCookie(res, { userId: user.id, email: user.email });
    res.status(201).json({ user: formatUser(profile) });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

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
    res.json({ user: formatUser(profile) });
  })
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  })
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await getUserProfile(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: formatUser(user) });
  })
);

router.post(
  '/organizations',
  authMiddleware,
  validateBody(createOrgSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name } = req.body;
    const org = await prisma.organization.create({
      data: {
        name,
        members: {
          create: { userId: req.user!.userId, role: OrgRole.owner },
        },
      },
      include: { members: true },
    });
    res.status(201).json({
      organization: { id: org.id, name: org.name, role: OrgRole.owner },
    });
  })
);

router.get(
  '/organizations/:id/members',
  authMiddleware,
  orgMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.org!.organizationId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
    });
  })
);

router.post(
  '/organizations/:id/invites',
  authMiddleware,
  orgMiddleware,
  requireOwner,
  validateBody(inviteSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { email, role } = req.body;
    const orgId = req.org!.organizationId;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: { userId: existingUser.id, organizationId: orgId },
        },
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
      create: { organizationId: orgId, email, role, invitedById: req.user!.userId },
    });
    res.status(201).json({ message: 'Invitation created. User will join when they sign in.' });
  })
);

router.delete(
  '/organizations/:id/members/:memberId',
  authMiddleware,
  orgMiddleware,
  requireOwner,
  asyncHandler(async (req: AuthRequest, res) => {
    const member = await prisma.organizationMember.findFirst({
      where: { id: getParam(req, 'memberId'), organizationId: req.org!.organizationId },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    await prisma.organizationMember.delete({ where: { id: member.id } });
    res.json({ success: true });
  })
);

export default router;
