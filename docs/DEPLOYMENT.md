# FlexDesk — Production Deployment Blueprint

```
[User Browser] ---> [Vercel Global CDN (apps/web build)]
                           |
               Encrypted API Requests (HTTPS)
                           |
                           v
         [Render / Fly.io (apps/api Node instance)] ---> [Supabase Postgres]
                           |
                    (cron-scheduled in-process,
                     or a separate worker service)
                  Automated Release Runner
```

## Client layer — Vercel or Netlify

1. Point the project root at `apps/web`.
2. Build command: `npm run build --workspace=apps/web` (Vercel's
   monorepo detection also works if you set the project root to `apps/web`
   directly and it runs `npm install` from the repo root).
3. Output directory: `apps/web/dist`.
4. Environment variable: `VITE_API_URL=https://<your-api-domain>`.
5. Tailwind is already wired through PostCSS — no extra build step needed.

## Application layer — Render, Railway, or Fly.io

1. Root directory: `apps/api`.
2. Build command: `npm install && npm run build --workspace=apps/api`
   (runs `tsc` + `prisma generate`).
3. Start command: `npm run start --workspace=apps/api`.
4. Environment variables (`.env.production`, set via the platform's secret
   manager — never committed):
   - `DATABASE_URL` — the Supabase/Atlas connection string
   - `JWT_SECRET` — generate with `openssl rand -base64 48`
   - `CORS_ORIGIN` — the deployed Vercel domain
   - `RELEASE_RUNNER_CRON`, `CHECKIN_GRACE_MINUTES` — tune per business hours
5. Run `npx prisma migrate deploy` as a one-off release step (Render's
   "Pre-Deploy Command", Railway's release phase, or a manual step) — not
   `migrate dev`, which prompts interactively and isn't safe in CI/CD.
6. The Automated Release Runner is wired to start in-process alongside the
   API (`src/index.ts`). At real scale, split it into its own worker
   service (Render "Background Worker", a separate Fly machine) so a burst
   of booking traffic can't delay a check-in sweep, and so the API can
   scale horizontally without running N copies of the same cron job.

## Storage layer — Supabase (Postgres) or MongoDB Atlas

This schema is relational by design (see `docs/ARCHITECTURE.md`), so
Supabase Postgres is the natural fit:

1. Create a Supabase project, copy the pooled connection string into
   `DATABASE_URL` (use the *pooler* connection for the app; Prisma
   migrations should run against the direct connection).
2. Run the RLS hardening pass before real tenant data goes in: enable RLS
   on every tenant-scoped table and add policies keyed on a
   `current_setting('app.company_id')` set per-transaction — the schema's
   `companyId` columns already exist for exactly this.
3. Lock down network access: Supabase's dashboard lets you restrict
   Postgres connections to specific IPs — restrict it to your Render/Fly
   deployment's egress IPs so the database refuses connections from
   anywhere except your API.
4. Point `apps/api/prisma/schema.prisma`'s `datasource` block at Supabase —
   no schema changes needed, only the connection string.

## Local development (this repo, right now)

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install

docker compose up -d          # Postgres on :5432
npm run db:migrate            # apply Prisma schema
npm run db:seed               # demo company, buildings, users, teams

npm run dev:api               # API on :4000
npm run dev:web               # Vite dev server on :5173, separate terminal
```

Then open `http://localhost:5173` and sign in with any seeded account
(`admin@acme.test`, `lead@acme.test`, `employee1@acme.test` …
`employee6@acme.test`, all with password `password123`).
