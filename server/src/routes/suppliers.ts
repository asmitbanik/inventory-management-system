import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, orgMiddleware, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, validateBody, getParam } from '../middleware/validate.js';

const router = Router();
const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.use(authMiddleware, orgMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: req.org!.organizationId },
    orderBy: { name: 'asc' },
  });
  res.json({ suppliers });
}));

router.post('/', requireOwner, validateBody(supplierSchema), asyncHandler(async (req: AuthRequest, res) => {
  const supplier = await prisma.supplier.create({
    data: { ...req.body, organizationId: req.org!.organizationId },
  });
  res.status(201).json({ supplier });
}));

router.put('/:id', requireOwner, validateBody(supplierSchema.partial()), asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.supplier.updateMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
    data: req.body,
  });
  if (result.count === 0) return res.status(404).json({ error: 'Supplier not found' });
  const supplier = await prisma.supplier.findUnique({ where: { id: getParam(req, 'id') } });
  res.json({ supplier });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req: AuthRequest, res) => {
  const result = await prisma.supplier.deleteMany({
    where: { id: getParam(req, 'id'), organizationId: req.org!.organizationId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ success: true });
}));

export default router;
