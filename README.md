# FlexDesk — Multi-Tenant Hybrid Workspace Allocator

Corporate hot-desking system: interactive floorplan booking, team-cluster
scheduling, recurring desk leases, live occupancy monitoring, and an
automated no-show release job. Built as a portfolio-grade demonstration of
relational multi-tenant design, not a toy CRUD app.

## Repo layout

```
apps/web/                 React + TypeScript + Vite + Tailwind SPA
apps/api/                 Node.js + Express + TypeScript REST API + Prisma
packages/shared/          Types shared between web and api
cypress/                  End-to-end tests for all three core flows
docs/ARCHITECTURE.md      Schema design, normalization, testing strategy
docs/DEPLOYMENT.md        Vercel / Render / Supabase production blueprint
docker-compose.yml        Local Postgres for development
```

## Features

- **Floorplan Matrix** — interactive grid of every desk, meeting pod, and
  monitor station on a floor; click an available one to book it instantly,
  color-coded by status, live-refreshing every 15s.
- **Team Synchronizer** — a team lead reserves a physically-clustered group
  of desks for a whole team's collaboration day in one click.
- **Capacity Monitor** — live, color-coded occupancy dashboard per
  building and per floor against a configured safety ceiling.
- **Recurring Booking Compiler** — expands a weekday pattern + date range
  into individual bookings, skipping only the days that conflict.
- **Automated Release Runner** — a scheduled job that frees any desk whose
  holder didn't check in within the configured grace window.

## Quickstart

Requires Node 18.18+ and Docker (or any reachable Postgres 14+ instance).

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
```

```bash
docker compose up -d      # Postgres on :5432
npm run db:migrate        # apply schema
npm run db:seed           # demo company + buildings + users + teams
```

```bash
npm run dev:api           # API on :4000
npm run dev:web           # web app on :5173 — open this in a browser
```

Sign in with any seeded account — `admin@acme.test`, `lead@acme.test`, or
`employee1@acme.test` through `employee6@acme.test` — password
`password123` for all of them.

The UI is responsive from mobile through desktop: the sidebar nav collapses
into a hamburger menu below the `md` breakpoint, and the floorplan grid
scrolls horizontally on narrow viewports instead of squashing desks
unreadably small.

## Testing

```bash
npm run dev:api            # in one terminal
npm run dev:web            # in another
npm run cypress:open       # or `npm run cypress:run` for headless CI
```

## Production deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full Vercel (client)
/ Render or Fly.io (API) / Supabase (Postgres) blueprint, including RLS
hardening notes.

## Design decisions & interview talking points

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the relational
schema walkthrough (normalization, the one deliberate denormalization and
why, indexing choices) and the system testing strategy.
