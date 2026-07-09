import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, getCookieOptions, COOKIE_NAME } from '../lib/auth.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'staff']).default('staff'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'staff']).optional(),
});

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(COOKIE_NAME, token, getCookieOptions());
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  })
);

router.get(
  '/users',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  })
);

router.post(
  '/users',
  authMiddleware,
  requireAdmin,
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.status(201).json({ user });
  })
);

router.put(
  '/users/:id',
  authMiddleware,
  requireAdmin,
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const data: Record<string, unknown> = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (role) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: getParam(req, 'id') },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json({ user });
  })
);

router.delete(
  '/users/:id',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    if (getParam(req, 'id') === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: getParam(req, 'id') } });
    res.json({ success: true });
  })
);

export default router;
