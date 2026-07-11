import { Router } from 'express';
import { z } from 'zod';
import { SalesOrderStatus, StockMovementType, StockReferenceType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();
const soItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});
const createSOSchema = z.object({
  customerId: z.string(),
  notes: z.string().optional(),
  items: z.array(soItemSchema).min(1),
});
const updateSOSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'shipped', 'cancelled']).optional(),
  notes: z.string().optional(),
  items: z.array(soItemSchema).optional(),
});

const includeRelations = {
  customer: true,
  createdBy: { select: { id: true, name: true, email: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, currentStock: true } } } },
};

async function generateSONumber(orgId: string): Promise<string> {
  const count = await prisma.salesOrder.count({ where: { organizationId: orgId } });
  return `SO-${String(count + 1).padStart(5, '0')}`;
}

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { status } = req.query;
  const where: Record<string, unknown> = { organizationId: req.org!.organizationId };
  if (status) where.status = status as SalesOrderStatus;
  const salesOrders = await prisma.salesOrder.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ salesOrders });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    include: includeRelations,
  });
  if (!salesOrder) return res.status(404).json({ error: 'Sales order not found' });
  res.json({ salesOrder });
}));

router.post('/', validateBody(createSOSchema), asyncHandler(async (req: AuthRequest, res) => {
  const orgId = req.org!.organizationId;
  const { customerId, notes, items } = req.body;
  const total = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
    sum + item.quantity * item.unitPrice, 0);
  const soNumber = await generateSONumber(orgId);
  const salesOrder = await prisma.salesOrder.create({
    data: {
      organizationId: orgId,
      soNumber,
      customerId,
      notes,
      total,
      createdById: req.user!.userId,
      items: {
        create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: includeRelations,
  });
  res.status(201).json({ salesOrder });
}));

router.put('/:id', validateBody(updateSOSchema), asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req, 'id');
  const orgId = req.org!.organizationId;
  const existing = await prisma.salesOrder.findFirst({
    where: { id, organizationId: orgId },
    include: { items: true },
  });
  if (!existing) return res.status(404).json({ error: 'Sales order not found' });
  if (existing.status === 'shipped' || existing.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot edit a shipped or cancelled order' });
  }

  const { customerId, status, notes, items } = req.body;
  const data: Record<string, unknown> = {};
  if (customerId) data.customerId = customerId;
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === 'confirmed' && !existing.orderDate) data.orderDate = new Date();

  if (items) {
    data.total = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice, 0);
    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
    data.items = {
      create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
  }

  const salesOrder = await prisma.salesOrder.update({
    where: { id },
    data,
    include: includeRelations,
  });
  res.json({ salesOrder });
}));

router.post('/:id/ship', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req, 'id');
  const orgId = req.org!.organizationId;
  const so = await prisma.salesOrder.findFirst({
    where: { id, organizationId: orgId },
    include: { items: { include: { product: true } } },
  });
  if (!so) return res.status(404).json({ error: 'Sales order not found' });
  if (so.status === 'shipped') return res.status(400).json({ error: 'Already shipped' });
  if (so.status === 'cancelled') return res.status(400).json({ error: 'Cannot ship cancelled order' });
  if (so.status === 'draft') return res.status(400).json({ error: 'Order must be confirmed before shipping' });

  const insufficient = so.items.filter((item) => item.product.currentStock < item.quantity);
  if (insufficient.length > 0) {
    return res.status(400).json({
      error: 'Insufficient stock',
      details: insufficient.map((item) => ({
        product: item.product.name,
        sku: item.product.sku,
        required: item.quantity,
        available: item.product.currentStock,
      })),
    });
  }

  const salesOrder = await prisma.$transaction(async (tx) => {
    for (const item of so.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          productId: item.productId,
          type: StockMovementType.out,
          quantity: item.quantity,
          referenceType: StockReferenceType.sales_order,
          referenceId: so.id,
          notes: `Shipped via SO ${so.soNumber}`,
          createdById: req.user!.userId,
        },
      });
    }
    return tx.salesOrder.update({
      where: { id: so.id },
      data: { status: SalesOrderStatus.shipped, shippedDate: new Date() },
      include: includeRelations,
    });
  });

  res.json({ salesOrder });
}));

export default router;
