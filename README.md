# Inventory Management System

A full-stack inventory management web app for warehouse and retail operations. Track products, manage purchase and sales orders, monitor stock levels, and audit all stock movements.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, TanStack Query, React Router
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (Vercel Postgres / Neon)
- **Deployment:** Vercel

## Features

- Multi-user authentication (admin + staff roles)
- Product and category management with low-stock alerts
- Supplier and customer management
- Purchase orders with receive workflow (stock in)
- Sales orders with ship workflow (stock out + validation)
- Stock movement audit log with manual adjustments
- Dashboard with key metrics and recent activity

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or Vercel Postgres)

### Setup

1. Clone and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your database URL and a secure JWT secret:

```
POSTGRES_URL="postgresql://user:password@localhost:5432/inventory"
JWT_SECRET="your-long-random-secret"
CLIENT_URL="http://localhost:5173"
```

4. Run database migrations and seed:

```bash
npm run db:push
npm run db:seed
```

5. Start development servers:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Demo Accounts

| Role  | Email                 | Password  |
|-------|-----------------------|-----------|
| Admin | admin@inventory.com   | admin123  |
| Staff | staff@inventory.com   | staff123  |

## Deploy to Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add **Vercel Postgres** from the Storage tab
4. Set environment variables:
   - `JWT_SECRET` — a long random string
   - `CLIENT_URL` — your production URL (e.g. `https://your-app.vercel.app`)
5. Deploy

After first deploy, run migrations against production:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

## Project Structure

```
inventory/
├── client/          # React frontend (Vite)
├── server/          # Express API
├── api/             # Vercel serverless entry point
├── prisma/          # Database schema and seed
├── vercel.json      # Deployment config
└── package.json     # Root workspace
```

## API Endpoints

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/login                 | Login                    |
| POST   | /api/auth/logout                | Logout                   |
| GET    | /api/auth/me                    | Current user             |
| GET    | /api/products                   | List products            |
| GET    | /api/purchase-orders            | List purchase orders     |
| POST   | /api/purchase-orders/:id/receive| Receive PO (stock in)    |
| GET    | /api/sales-orders               | List sales orders        |
| POST   | /api/sales-orders/:id/ship      | Ship SO (stock out)      |
| GET    | /api/stock-movements            | Stock audit log          |
| POST   | /api/stock-movements/adjust     | Manual stock adjustment  |
| GET    | /api/dashboard/stats            | Dashboard metrics        |

## License

ISC
