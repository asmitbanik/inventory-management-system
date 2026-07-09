import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import serverless from 'serverless-http';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import supplierRoutes from './routes/suppliers.js';
import customerRoutes from './routes/customers.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import salesOrderRoutes from './routes/salesOrders.js';
import stockMovementRoutes from './routes/stockMovements.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/validate.js';

export function createApp() {
  const app = express();

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/purchase-orders', purchaseOrderRoutes);
  app.use('/api/sales-orders', salesOrderRoutes);
  app.use('/api/stock-movements', stockMovementRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(errorHandler);

  return app;
}

const app = createApp();

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export const handler = serverless(app);
export default app;
