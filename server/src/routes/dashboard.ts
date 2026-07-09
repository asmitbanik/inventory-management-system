import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [products, lowStockProducts, recentPOs, recentSOs] = await Promise.all([
      prisma.product.findMany({
        select: { currentStock: true, costPrice: true, reorderLevel: true, name: true, sku: true, id: true },
      }),
      prisma.product.findMany({
        where: { currentStock: { lte: 10 } },
        select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true },
        orderBy: { currentStock: 'asc' },
        take: 10,
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { name: true } } },
      }),
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
    ]);

    const totalProducts = products.length;
    const stockValue = products.reduce(
      (sum, p) => sum + p.currentStock * Number(p.costPrice),
      0
    );
    const lowStockCount = products.filter((p) => p.currentStock <= p.reorderLevel).length;

    res.json({
      stats: {
        totalProducts,
        stockValue: Math.round(stockValue * 100) / 100,
        lowStockCount,
        lowStockProducts: lowStockProducts.filter((p) => p.currentStock <= p.reorderLevel),
        recentPurchaseOrders: recentPOs,
        recentSalesOrders: recentSOs,
      },
    });
  })
);

export default router;
