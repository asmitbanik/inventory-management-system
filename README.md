# Inventory Management System

Live inventory management for warehouse and retail — multi-organization, Google sign-in, all data stored in your database.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Prisma
- **Auth:** Supabase Auth (Google sign-in)
- **Database:** Supabase Postgres
- **Currency:** Indian Rupees (₹)

## How It Works

1. Sign up / sign in with **Google** (via Supabase)
2. New users create their **organization** (business workspace)
3. Add products, suppliers, customers, and orders — all saved to the database
4. Owners can **invite staff** by email to join the organization
5. Each organization's data is fully isolated

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Wait for the database to provision

### 2. Enable Google Auth

1. In Supabase dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: Web application
   - Authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret into Supabase Google provider settings

### 3. Get Your Keys

From Supabase dashboard → **Project Settings** → **API**:

| Key | Used in |
|-----|---------|
| Project URL | `SUPABASE_URL`, `VITE_SUPABASE_URL` |
| `anon` `public` key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose) |

From **Project Settings** → **Database** → **Connection string** (URI):

| Key | Used in |
|-----|---------|
| Connection string (pooler) | `POSTGRES_URL` |

### 4. Configure Environment

```bash
cp .env.example .env
```

Fill in all values in `.env`. Also add to `client/.env` or root `.env`:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 5. Install & Run Database

```bash
npm install
npm run db:push
```

### 6. Start Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### 7. Configure Redirect URL in Supabase

In Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** `http://localhost:5173/auth/callback`

For production, add your Vercel URL too.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes | Supabase Postgres connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side auth verification |
| `VITE_SUPABASE_URL` | Yes | Same as SUPABASE_URL (for frontend) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key (for frontend) |
| `CLIENT_URL` | Yes | `http://localhost:5173` or production URL |

## Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access + team management + invite staff |
| **Staff** | Manage inventory, orders, stock adjustments |

## License

ISC
