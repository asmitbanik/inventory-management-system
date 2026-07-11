import { Router } from 'express';
import { z } from 'zod';
import { PurchaseOrderStatus, StockMovementType, StockReferenceType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();
const poItemSchema = z.object({
  productId: z.string(),
  quantityOrdered: z.number().int().min(1),
  unitCost: z.number().min(0),
});
const createPOSchema = z.object({
  supplierId: z.string(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1),
});
const updatePOSchema = z.object({
  supplierId: z.string().optional(),
  status: z.enum(['draft', 'ordered', 'received', 'cancelled']).optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).optional(),
});

const includeRelations = {
  supplier: true,
  createdBy: { select: { id: true, name: true, email: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true } } } },
};

async function generatePONumber(orgId: string): Promise<string> {
  const count = await prisma.purchaseOrder.count({ where: { organizationId: orgId } });
  return `PO-${String(count + 1).padStart(5, '0')}`;
}

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { status } = req.query;
  const where: Record<string, unknown> = { organizationId: req.org!.organizationId };
  if (status) where.status = status as PurchaseOrderStatus;
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ purchaseOrders });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    include: includeRelations,
  });
  if (!purchaseOrder) return res.status(404).json({ error: 'Purchase order not found' });
  res.json({ purchaseOrder });
}));

router.post('/', validateBody(createPOSchema), asyncHandler(async (req: AuthRequest, res) => {
  const orgId = req.org!.organizationId;
  const { supplierId, notes, items } = req.body;
  const total = items.reduce((sum: number, item: { quantityOrdered: number; unitCost: number }) =>
    sum + item.quantityOrdered * item.unitCost, 0);
  const poNumber = await generatePONumber(orgId);
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      organizationId: orgId,
      poNumber,
      supplierId,
      notes,
      total,
      createdById: req.user!.userId,
      items: {
        create: items.map((item: { productId: string; quantityOrdered: number; unitCost: number }) => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        })),
      },
    },
    include: includeRelations,
  });
  res.status(201).json({ purchaseOrder });
}));

router.put('/:id', validateBody(updatePOSchema), asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req, 'id');
  const orgId = req.org!.organizationId;
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: orgId },
    include: { items: true },
  });
  if (!existing) return res.status(404).json({ error: 'Purchase order not found' });
  if (existing.status === 'received' || existing.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot edit a received or cancelled order' });
  }

  const { supplierId, status, notes, items } = req.body;
  const data: Record<string, unknown> = {};
  if (supplierId) data.supplierId = supplierId;
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === 'ordered' && !existing.orderDate) data.orderDate = new Date();

  if (items) {
    data.total = items.reduce((sum: number, item: { quantityOrdered: number; unitCost: number }) =>
      sum + item.quantityOrdered * item.unitCost, 0);
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    data.items = {
      create: items.map((item: { productId: string; quantityOrdered: number; unitCost: number }) => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
      })),
    };
  }

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id },
    data,
    include: includeRelations,
  });
  res.json({ purchaseOrder });
}));

router.post('/:id/receive', asyncHandler(async (req: AuthRequest, res) => {
  const id = getParam(req, 'id');
  const orgId = req.org!.organizationId;
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: orgId },
    include: { items: true },
  });
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'Already received' });
  if (po.status === 'cancelled') return res.status(400).json({ error: 'Cannot receive cancelled order' });
  if (po.status === 'draft') return res.status(400).json({ error: 'Order must be marked as ordered before receiving' });

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    for (const item of po.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantityOrdered } },
      });
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: item.quantityOrdered },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          productId: item.productId,
          type: StockMovementType.in,
          quantity: item.quantityOrdered,
          referenceType: StockReferenceType.purchase_order,
          referenceId: po.id,
          notes: `Received from PO ${po.poNumber}`,
          createdById: req.user!.userId,
        },
      });
    }
    return tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: PurchaseOrderStatus.received, receivedDate: new Date() },
      include: includeRelations,
    });
  });

  res.json({ purchaseOrder });
}));

export default router;
