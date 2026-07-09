import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    res.json({ customers });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: getParam(req, 'id') },
      include: { salesOrders: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  })
);

router.post(
  '/',
  requireAdmin,
  validateBody(customerSchema),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ customer });
  })
);

router.put(
  '/:id',
  requireAdmin,
  validateBody(customerSchema.partial()),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.update({
      where: { id: getParam(req, 'id') },
      data: req.body,
    });
    res.json({ customer });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: getParam(req, 'id') } });
    res.json({ success: true });
  })
);

export default router;
