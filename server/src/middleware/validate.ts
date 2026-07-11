import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError, type ZodSchema } from 'zod';

export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
        const message = details
          .map((d) => {
            const field = d.path === 'email' ? 'Email' : d.path === 'password' ? 'Password' : d.path === 'name' ? 'Name' : d.path;
            return `${field}: ${d.message}`;
          })
          .join(', ');
        return res.status(400).json({
          error: message || 'Validation failed',
          details,
        });
      }
      next(err);
    }
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid category. Create a category first or choose "No Category".' });
    }
  }

  const message = err.message || 'Internal server error';
  const status = message.includes('not found') ? 404 : message.includes('Insufficient') ? 400 : 500;
  res.status(status).json({ error: message });
}
