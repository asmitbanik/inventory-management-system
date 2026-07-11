# Inventory Management System for Retail and Warehouse Operations

Effortlessly manage your inventory, streamline operations, and boost productivity with our comprehensive Inventory Management System. Designed specifically for retail and warehouse operators, this system offers a user-friendly interface, robust features, and seamless integration with your existing infrastructure.

## Key Features

- **Multi-Organization Support**: Manage multiple businesses and teams from a single dashboard
- **Google Sign-in**: Secure and convenient authentication for users
- **Real-time Data Sync**: All data is stored in your Supabase Postgres database for easy access and management
- **Customizable Roles**: Assign permissions and access levels to owners, staff, and other team members
- **Inventory Management**: Track products, suppliers, customers, and orders with ease
- **Stock Adjustments**: Update stock levels and manage inventory with precision

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Prisma
- **Auth:** Supabase Auth (Google sign-in)
- **Database:** Supabase Postgres
- **Currency:** Indian Rupees (₹)

## Getting Started

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Wait for the database to provision

### Step 2: Enable Google Auth

1. In Supabase dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: Web application
   - Authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret into Supabase Google provider settings

### Step 3: Get Your Keys

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

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Fill in all values in `.env`. Also add to `client/.env` or root `.env`:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 5: Install & Run Database

```bash
npm install
npm run db:push
```

### Step 6: Start Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Step 7: Configure Redirect URL in Supabase

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
