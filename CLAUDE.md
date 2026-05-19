# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted flower shop inventory + POS management system (鲜花批发店进销存收银系统). Single-store deployment on a local PC; phones/tablets access over LAN. Built with Nuxt 4 (SPA mode), Nitro backend, and Prisma ORM.

## Commands

```bash
pnpm dev                                        # Start dev server at http://localhost:3000
pnpm build                                      # Build for production
pnpm prisma migrate dev --name <migration-name> # Apply schema changes (dev)
pnpm prisma migrate reset                       # Reset DB and re-apply all migrations
pnpm prisma studio                              # Open visual DB browser
pnpm db:seed                                    # Seed test data
```

Requirements: Node.js >= 18.x, pnpm >= 8.x.

## Architecture

**Full-stack Nuxt 4 monorepo** — no separate frontend/backend repos.

| Layer | Path | Role |
|---|---|---|
| Frontend | `app/` | Vue 3 SPA (ssr: false) |
| Backend | `server/api/` | Nitro API routes (file-based routing) |
| Shared | `shared/` | Types/enums used by both sides |
| Database | `prisma/` | Schema (SQLite dev, PostgreSQL prod) |

**Layouts**: `app/layouts/default.vue` (admin sidebar), `app/layouts/pos.vue` (fullscreen cashier). These are auto-applied based on route.

**Auth flow**: JWT (7-day). Two login scopes — `admin` (staff/admin roles) and `pos` (all roles). `app/middleware/auth.global.ts` enforces role-based route guards and redirects. Token stored via `useAuth` composable.

**Stock allocation**: `server/utils/stockAllocator.ts` implements FIFO batch allocation. Stock batches tracked in `StockBatch` model with expiry dates. All stock changes write audit records to `StockMovement`.

## Key Conventions

**API response format** — all server routes return:
```ts
{ data: T | null, error: { message: string, code: string } | null }
```

**Frontend data fetching** — encapsulate in `app/composables/`, never call `$fetch` directly from components. Existing composables: `useAuth`, `useOrders`, `useProducts`, `useCustomers`, `useStocks`, `usePreorders`, `useReports`, `useStatement`, `useLowStockAlert`, `useExport`, `useActiveCashier`.

**State management** — cross-component or persistent state lives in Pinia stores (`app/stores/`). The `cart.ts` store manages multiple concurrent POS carts.

**Database access** — always use the singleton from `server/utils/prisma.ts`, never instantiate `PrismaClient` directly (prevents hot-reload connection leaks).

**Styling** — Tailwind CSS for layout/spacing, Ant Design Vue for interactive components. Tailwind preflight is disabled to avoid conflicts with AntD. Custom theme colors: `primary` (pink) and `sage` (green) defined in `tailwind.config.ts`.

**Schema changes** — after editing `prisma/schema.prisma`, run `pnpm prisma migrate dev` and restart the dev server.

## Data Model Highlights

- **Product**: multi-unit (e.g., stem/bunch/box), multi-spec, three pricing tiers (default/VIP/wholesale)
- **Customer**: four tiers (normal/member/VIP/wholesale), supports credit accounts and WeChat mini-program login
- **Order**: retail and wholesale modes, supports pre-orders with delivery scheduling
- **StockBatch**: expiry tracking with near-expiry alerts; FIFO consumed during checkout
- **Setting**: global key-value config table (accessed via `/settings` routes)
