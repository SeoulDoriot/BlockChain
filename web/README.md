# web

Next.js 16 app — staff dashboard for issuing certificates, and the public
verification page.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. `lib/env.ts` validates it with zod at startup and fails
loudly listing exactly which variables are wrong, so a missing value shows up
immediately rather than as a confusing runtime error later.

## Database

There is no Supabase project for this app yet. Create one, then apply the
schema:

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy **Project URL** and the **anon** key from Settings → API into
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`. This key
   bypasses row-level security — treat it like a database root password. It
   must never be committed or prefixed `NEXT_PUBLIC_`.
4. Open the **SQL Editor**, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and run it.
5. Confirm in Table Editor that `orgs`, `staff`, `courses`, `certificates` and
   `audit_log` exist, and that Storage shows a **private** bucket named
   `certificates`.

With the Supabase CLI instead:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

## Seed

Create your own user first — Authentication → Users → Add user, or by signing
up through the app. The seed script links an existing account; it never creates
accounts and never handles passwords.

```bash
npm run seed -- you@kit.edu.kh
```

Creates the KIT organisation, three courses, and an `admin` staff row bound to
that user.

## Run

```bash
npm run dev
```

## Health check

```
GET /api/health
```

Checks three things and returns 200 only if all three pass: the database is
reachable, the RPC endpoint reports the expected chain id, and there is actually
contract bytecode at `NEXT_PUBLIC_CONTRACT_ADDRESS`. Until Phase 5 deploys the
contract, the third check is expected to fail.

## Test

```bash
npm test
```

## Layout

| Path | What |
| ---- | ---- |
| `lib/env.ts` | Public env, zod-validated |
| `lib/env.server.ts` | Server-only env, guarded by `server-only` |
| `lib/supabase/client.ts` | Browser client |
| `lib/supabase/server.ts` | Server client — respects RLS |
| `lib/supabase/admin.ts` | Service role — bypasses RLS, `server-only` |
| `lib/auth.ts` | `requireStaff()` / `requireIssuer()` |
| `lib/chain/abi.ts` | Generated from the contract — do not edit |
| `proxy.ts` | Session refresh + `/dashboard` guard |
| `supabase/migrations/` | Schema |
| `scripts/seed.ts` | Seed data |
