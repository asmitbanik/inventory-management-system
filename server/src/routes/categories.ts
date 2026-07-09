import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: getParam(req, 'id') },
      include: { products: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  })
);

router.post(
  '/',
  requireAdmin,
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json({ category });
  })
);

router.put(
  '/:id',
  requireAdmin,
  validateBody(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.update({
      where: { id: getParam(req, 'id') },
      data: req.body,
    });
    res.json({ category });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: getParam(req, 'id') } });
    res.json({ success: true });
  })
);

export default router;
