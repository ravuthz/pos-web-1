# POS Frontend (React + TypeScript)

Frontend scaffold generated from the backend OpenAPI export (`openapi.export.json`) and controller/resource validation in this repository.

## Stack

- Vite + React + TypeScript
- TanStack Router
- TanStack Query
- Axios
- React Hook Form + Zod
- TailwindCSS
- Vite PWA Plugin + Workbox

## Implemented Requirements

- Authentication
  - JWT access token in localStorage (`pos.auth`)
  - Auto refresh interceptor support (Passport refresh token flow via `VITE_AUTH_REFRESH_URL`)
  - Protected routes via TanStack Router `beforeLoad`
- Branch Switching
  - Global branch selector in app shell
  - Persist selected branch in localStorage (`pos.branch`)
  - Attach `branch_id` and `X-Branch-Id` headers on every API request
  - Auto-inject `branch_id` into params/body when absent
- CRUD Pages
  - Products
  - Categories
  - Customers
  - Purchases
  - Stock Movements
  - Users
  - Reports
- POS Screen
  - Barcode input autofocus
  - Add to cart and quantity controls
  - Keyboard shortcuts: `F2`, `Ctrl+Enter`, `F8`, `Esc`
  - Real-time stock validation before checkout
  - Optimistic stock update in query cache
  - Offline fallback queue for sales
- TanStack Query
  - Central query key factory (`src/lib/queryKeys.ts`)
  - Invalidation on mutations
  - Optimistic stock mutation in POS checkout
- PWA
  - Installable manifest/icons
  - Runtime offline caching (Workbox strategies)
  - Background sync queue replay for sales (`sync-sales-queue`)

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Variables:

- `VITE_API_URL` (example: `http://localhost:8000/api`)
- `VITE_AUTH_REFRESH_URL` (example: `http://localhost:8000/oauth/token`)
- `VITE_PASSPORT_CLIENT_ID` (optional for refresh)
- `VITE_PASSPORT_CLIENT_SECRET` (optional for refresh)

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
