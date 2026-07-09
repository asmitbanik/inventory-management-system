import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ suppliers });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: getParam(req, 'id') },
      include: { purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ supplier });
  })
);

router.post(
  '/',
  requireAdmin,
  validateBody(supplierSchema),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ supplier });
  })
);

router.put(
  '/:id',
  requireAdmin,
  validateBody(supplierSchema.partial()),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.update({
      where: { id: getParam(req, 'id') },
      data: req.body,
    });
    res.json({ supplier });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.supplier.delete({ where: { id: getParam(req, 'id') } });
    res.json({ success: true });
  })
);

export default router;
