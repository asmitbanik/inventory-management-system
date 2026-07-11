import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();
const categorySchema = z.object({ name: z.string().min(1), description: z.string().optional() });

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const categories = await prisma.category.findMany({
    where: { organizationId: req.org!.organizationId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ categories });
}));

router.post('/', requireOwner, validateBody(categorySchema), asyncHandler(async (req: AuthRequest, res) => {
  const category = await prisma.category.create({
    data: { ...req.body, organizationId: req.org!.organizationId },
  });
  res.status(201).json({ category });
}));

router.put('/:id', requireOwner, validateBody(categorySchema.partial()), asyncHandler(async (req: AuthRequest, res) => {
  const category = await prisma.category.updateMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    data: req.body,
  });
  if (category.count === 0) return res.status(404).json({ error: 'Category not found' });
  const updated = await prisma.category.findUnique({ where: { id: getParam(req, 'id') } });
  res.json({ category: updated });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.category.deleteMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
}));

export default router;
