import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, requireOwner, type AuthRequest } from '../middleware/auth.js';
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

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { search, categoryId, lowStock } = req.query;
  const orgId = req.org!.organizationId;
  const where: Record<string, unknown> = { organizationId: orgId };

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { sku: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = String(categoryId);

  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  const filtered = lowStock === 'true'
    ? products.filter((p) => p.currentStock <= p.reorderLevel)
    : products;

  res.json({ products: filtered });
}));

router.post('/', requireOwner, validateBody(productSchema), asyncHandler(async (req: AuthRequest, res) => {
  const orgId = req.org!.organizationId;
  const existing = await prisma.product.findUnique({
    where: { organizationId_sku: { organizationId: orgId, sku: req.body.sku } },
  });
  if (existing) return res.status(400).json({ error: 'SKU already exists' });
  const product = await prisma.product.create({
    data: { ...req.body, organizationId: orgId },
    include: { category: { select: { id: true, name: true } } },
  });
  res.status(201).json({ product });
}));

router.put('/:id', validateBody(productSchema.partial()), asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.product.updateMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    data: req.body,
  });
  if (result.count === 0) return res.status(404).json({ error: 'Product not found' });
  const product = await prisma.product.findUnique({
    where: { id: getParam(req, 'id') },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json({ product });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.product.deleteMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
}));

export default router;
