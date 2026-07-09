import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  currentStock: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, categoryId, lowStock } = req.query;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (lowStock === 'true') {
      where.currentStock = { lte: prisma.product.fields.reorderLevel };
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const filtered =
      lowStock === 'true'
        ? products.filter((p) => p.currentStock <= p.reorderLevel)
        : products;

    res.json({ products: filtered });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: getParam(req, 'id') },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  })
);

router.post(
  '/',
  requireAdmin,
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { sku: req.body.sku } });
    if (existing) return res.status(400).json({ error: 'SKU already exists' });
    const product = await prisma.product.create({
      data: req.body,
      include: { category: { select: { id: true, name: true } } },
    });
    res.status(201).json({ product });
  })
);

router.put(
  '/:id',
  validateBody(productSchema.partial()),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: getParam(req, 'id') },
      data: req.body,
      include: { category: { select: { id: true, name: true } } },
    });
    res.json({ product });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: getParam(req, 'id') } });
    res.json({ success: true });
  })
);

export default router;
