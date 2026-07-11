import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();
const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const customers = await prisma.customer.findMany({
    where: { organizationId: req.org!.organizationId },
    orderBy: { name: 'asc' },
  });
  res.json({ customers });
}));

router.post('/', requireOwner, validateBody(customerSchema), asyncHandler(async (req: AuthRequest, res) => {
  const customer = await prisma.customer.create({
    data: { ...req.body, organizationId: req.org!.organizationId },
  });
  res.status(201).json({ customer });
}));

router.put('/:id', requireOwner, validateBody(customerSchema.partial()), asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.customer.updateMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    data: req.body,
  });
  if (result.count === 0) return res.status(404).json({ error: 'Customer not found' });
  const customer = await prisma.customer.findUnique({ where: { id: getParam(req, 'id') } });
  res.json({ customer });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.customer.deleteMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json({ success: true });
}));

export default router;
