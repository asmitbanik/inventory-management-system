import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';

const router = Router();

router.use(authMiddleware, orgMiddleware);

router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const orgId = req.org!.organizationId;

  const [products, recentPOs, recentSOs] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: orgId },
      select: { currentStock: true, costPrice: true, reorderLevel: true, name: true, sku: true, id: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.salesOrder.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const lowStockProducts = products
    .filter((p) => p.currentStock <= p.reorderLevel)
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 10);

  const stockValue = products.reduce(
    (sum, p) => sum + p.currentStock * Number(p.costPrice),
    0
  );

  res.json({
    stats: {
      totalProducts: products.length,
      stockValue: Math.round(stockValue * 100) / 100,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentPurchaseOrders: recentPOs,
      recentSalesOrders: recentSOs,
    },
  });
}));

export default router;
