import '../env.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Router } from 'express';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../middleware/validate.js';

const routeLoaders: Record<string, () => Promise<{ default: Router }>> = {
  categories: () => import('../routes/categories.js'),
  products: () => import('../routes/products.js'),
  suppliers: () => import('../routes/suppliers.js'),
  customers: () => import('../routes/customers.js'),
  'purchase-orders': () => import('../routes/purchaseOrders.js'),
  'sales-orders': () => import('../routes/salesOrders.js'),
  'stock-movements': () => import('../routes/stockMovements.js'),
  dashboard: () => import('../routes/dashboard.js'),
};

const routerCache = new Map<string, Router>();
let cachedApp: express.Application | undefined;

function normalizeRequestUrl(req: VercelRequest) {
  const raw = req.url ?? '/';
  const [path, ...queryParts] = raw.split('?');
  const query = queryParts.length ? `?${queryParts.join('?')}` : '';

  let normalizedPath = path || '/';
  if (!normalizedPath.startsWith('/api')) {
    normalizedPath = `/api${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  }

  req.url = `${normalizedPath}${query}`;
}

function createApp() {
  const app = express();

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.includes(origin) || true);
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(async (req, res, next) => {
    const match = req.url?.match(/^\/api\/([^/?]+)/);
    if (!match) return next();

    const segment = match[1];
    const loader = routeLoaders[segment];
    if (!loader) return next();

    try {
      if (!routerCache.has(segment)) {
        const mod = await loader();
        routerCache.set(segment, mod.default);
      }

      const router = routerCache.get(segment)!;
      const prefix = `/api/${segment}`;
      const originalUrl = req.url;
      req.url = originalUrl!.startsWith(prefix)
        ? originalUrl.slice(prefix.length) || '/'
        : originalUrl;

      router(req, res, (err?: unknown) => {
        req.url = originalUrl;
        if (err) return next(err as Error);
        if (!res.headersSent) return next();
      });
    } catch (err) {
      next(err as Error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);
  return app;
}

function runApp(req: VercelRequest, res: VercelResponse, app: express.Application) {
  return new Promise<void>((resolve, reject) => {
    res.once('finish', resolve);
    res.once('error', reject);
    app(req, res);
  });
}

export async function dispatchApp(req: VercelRequest, res: VercelResponse) {
  normalizeRequestUrl(req);

  if (!cachedApp) {
    cachedApp = createApp();
  }

  return runApp(req, res, cachedApp);
}
