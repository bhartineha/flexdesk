# FlexDesk — Architecture

## 1. Relational schema & normalization

The schema (`apps/api/prisma/schema.prisma`) models the tenancy chain as:

```
Company (tenant root)
 ├─ User            (companyId FK)
 ├─ Building        (companyId FK)
 │   └─ Floor       (buildingId FK)
 │       └─ Desk    (floorId FK)
 ├─ Team            (companyId FK)
 │   └─ TeamMembership (teamId FK, userId FK)  — resolves the User<->Team
 │                                                many-to-many
 ├─ RecurringBooking (companyId, deskId, userId FK) — a *lease definition*
 ├─ TeamSyncEvent    (companyId, teamId, createdById FK) — a *cluster request*
 └─ Booking          (companyId, deskId, userId FK,
                       recurringBookingId?, teamSyncEventId?)
```

**Why this shape:**

- Every entity is in 3NF: no column depends on anything other than its
  table's primary key (e.g. a desk's floor doesn't imply its building —
  that's derived through the FK chain, not duplicated onto `Desk`).
- `TeamMembership` is the join table that resolves the User↔Team
  many-to-many relationship, carrying the one attribute that belongs to the
  *relationship itself* (`isLead`) rather than to either side.
- `RecurringBooking` and `TeamSyncEvent` are kept separate from `Booking`.
  They're the *inputs* the compiler/synchronizer consume; `Booking` is the
  *output* — one row per calendar occurrence. This means a day's
  availability query is always a single indexed lookup
  (`WHERE deskId = ? AND date = ?`), never a recurrence-rule evaluation at
  read time. The tradeoff is write amplification (a 90-day recurring lease
  writes ~65 rows), which is the right side to take that tradeoff on: reads
  (checking a floor's availability) happen orders of magnitude more often
  than writes (creating a lease).

**One deliberate denormalization:** `Booking.companyId` duplicates
information reachable via `Booking -> Desk -> Floor -> Building ->
Company`. Every tenant-scoped query on the system's hottest table would
otherwise need a 3-way join just to enforce the tenant boundary. Trading a
small amount of write-side duplication (kept consistent because it's set
once at creation from the desk's building, never edited) for an index-only
scan on the read path is a standard "the bottleneck table gets one
denormalized column" call — and it's stated as a call, not silently done.

**Indexes that matter:**

- The actual double-booking guard is a **partial** unique index —
  `CREATE UNIQUE INDEX ... ON "Booking"("deskId","date","slot") WHERE status
  IN ('PENDING_CHECKIN','CHECKED_IN')` — added by hand in
  `migrations/20260822135041_active_booking_partial_unique_index/migration.sql`,
  not a `@@unique` in `schema.prisma`. A plain table-wide unique constraint
  was the first thing tried here, and it's a real trap worth naming: it
  covers *every* row regardless of status, so the moment a booking on a
  desk/date/slot is cancelled, that slot is permanently unbookable again —
  the cancelled row still occupies the unique key forever. Prisma's schema
  DSL has no partial-index syntax, so this constraint is expressed as a
  hand-written migration with a plain `@@index` (non-unique) left in
  `schema.prisma` purely for lookup speed. The app layer additionally checks
  the FULL_DAY/half-day overlap case no single-tuple index can express (a
  FULL_DAY booking should block MORNING/AFTERNOON on the same desk/date and
  vice versa) — see `bookingService.assertSlotFree`.
- `@@index([companyId, date])` on `Booking` — every capacity/floorplan query
  filters on exactly this pair.
- `@@index([status, checkInBy])` — the Automated Release Runner's sweep is a
  single `UPDATE ... WHERE status = 'PENDING_CHECKIN' AND checkInBy < now()`,
  and this index makes that a range scan, not a table scan.

## 2. Recurring Booking Compiler

`apps/api/src/services/bookingService.ts::compileRecurringBooking` takes a
date range + weekday pattern, expands it into concrete dates, and inserts
one `Booking` per occurrence inside a single transaction — partial leases
can't exist. Conflicting days are *skipped and reported*, not treated as a
hard failure, because "book me every Tue/Thu for two months, minus the two
days someone beat me to the desk" is the actual user expectation of a
hot-desking system.

## 3. Automated Release Runner

`apps/api/src/jobs/autoReleaseRunner.ts` runs on a cron schedule
(`RELEASE_RUNNER_CRON`, default every 5 minutes) and releases any booking
still `PENDING_CHECKIN` past its `checkInBy` deadline via one `updateMany`
call — no per-row fetch-then-write loop, so its cost doesn't scale with how
many bookings are outstanding. In production this is the kind of job that
belongs on its own worker dyno/service (Render background worker, a
scheduled Lambda, etc.) rather than piggybacking on the API process's event
loop — the in-process `node-cron` here is the local-dev equivalent of that.

## 4. Team Synchronizer's cluster assignment

`teamSyncService.ts` picks the tightest physically-adjacent group of free
desks (nearest to the floor's desk centroid) rather than the first N free
desks by id, so a team actually ends up sitting together. If the floor
can't seat everyone, it seats as many as it can and reports who's
unassigned rather than failing the whole request — partial success is more
useful than an all-or-nothing error for a same-day booking flow.

## 5. Multi-tenancy & auth boundary

The tenant boundary is a single fact: `req.auth.companyId`, set once at
login (`auth.routes.ts`) from the authenticated user's own row, carried in
the JWT, and never taken from client-supplied input. Every route handler
filters by it. This is the same pattern Postgres Row-Level Security
formalizes at the database layer — the natural "harden this further" step
for a v2 is moving that filter from "every handler remembers to do it" to
"the database refuses to return rows without it," via `CREATE POLICY ...
USING (company_id = current_setting('app.company_id')::uuid)` plus a
transaction-scoped `SET LOCAL`.

## 6. System testing strategy

- **Cypress e2e** (`cypress/e2e/`) exercises the three main flows end to
  end against a real running frontend + API + Postgres: instant desk
  booking (including the double-booking guard), team-lead cluster
  reservation (and the role gate blocking employees from requesting one),
  and the capacity dashboard rendering live numbers. These are the
  regression net for the reservation *pipeline*, not just the UI — a bug in
  the booking-conflict transaction would fail the first spec even though
  nothing about the button rendering changed.
- **Why e2e over unit tests for the booking logic specifically:** the bug
  class this system is most exposed to is a race between "check
  availability" and "write the booking" — exactly the kind of thing that
  only shows up when a real HTTP request hits a real transaction against a
  real database, not when a service function is called directly with a
  mocked Prisma client.
- **Where unit/integration tests would go next:** `bookingService`,
  `teamSyncService`, and `capacityService` are already pure enough
  (Prisma client injected via the shared singleton, no hidden globals) to
  test against a scratch Postgres schema with Jest/Vitest — the natural
  next layer once the e2e suite is green, to pin down edge cases (leap
  years in a recurring range, a team with zero members, a building at
  exactly 100% capacity) that are slow to hit through the UI.

## 7. What's intentionally out of scope here

- Payment/billing — not part of the spec.
- Real OAuth/SSO — auth is email+password+JWT against seeded users; wiring
  an actual identity provider (Okta, Azure AD — realistic for corporate
  real estate tooling) is a follow-up, not a redesign, since the JWT
  contract (`{id, companyId, email, name, role}`) stays the same either way.
- Postgres RLS policies themselves (see §5) — the schema and tenant-scoping
  discipline are in place; the `CREATE POLICY` migration is the next step
  before this holds real tenant data.
