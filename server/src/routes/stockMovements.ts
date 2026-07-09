import { Router } from 'express';
import { z } from 'zod';
import { StockMovementType, StockReferenceType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody } from '../middleware/validate.js';

const router = Router();

const adjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
  notes: z.string().min(1),
});

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, type, from, to } = req.query;
    const where: Record<string, unknown> = {};
    if (productId) where.productId = String(productId);
    if (type) where.type = String(type);
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(String(from));
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(String(to));
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ movements });
  })
);

router.post(
  '/adjust',
  validateBody(adjustmentSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { productId, quantity, notes } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newStock = product.currentStock + quantity;
    if (newStock < 0) {
      return res.status(400).json({
        error: 'Adjustment would result in negative stock',
        currentStock: product.currentStock,
      });
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          type: StockMovementType.adjustment,
          quantity,
          referenceType: StockReferenceType.manual,
          notes,
          createdById: req.user!.userId,
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.status(201).json({ product: updatedProduct, movement });
  })
);

export default router;
