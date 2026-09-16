-- ===========================================================================
-- 0001_init.sql — initial schema for the certificate verification system
--
-- Design notes:
--   * The blockchain is the authority on certificate status. These tables hold
--     the human-readable data that must NEVER go on-chain, plus a cache of the
--     chain state so listings are fast.
--   * "expired" is never stored. It is derived from expires_on at read time,
--     mirroring statusOf() in the contract.
--   * RLS is on for every table. Anonymous users get no direct table access at
--     all; the public verify page reads through a server route that returns a
--     whitelisted subset of columns.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Helper: keep updated_at honest
-- --------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- orgs
-- --------------------------------------------------------------------------

create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger orgs_set_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- staff — links a Supabase auth user to an organisation and a role
-- --------------------------------------------------------------------------

create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'viewer'
              check (role in ('admin', 'issuer', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index staff_org_id_idx on public.staff (org_id);

create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- courses
-- --------------------------------------------------------------------------

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  code        text not null,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code)
);

create index courses_org_id_idx on public.courses (org_id);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- certificates
-- --------------------------------------------------------------------------

create table public.certificates (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.orgs (id) on delete cascade,
  course_id       uuid not null references public.courses (id) on delete restrict,

  recipient_name  text not null,
  recipient_email text not null,

  issued_on       date not null,
  expires_on      date,

  -- on-chain anchor; null until the certificate is issued
  cert_hash       text unique check (cert_hash is null or cert_hash ~ '^0x[0-9a-f]{64}$'),
  tx_hash         text check (tx_hash is null or tx_hash ~ '^0x[0-9a-f]{64}$'),
  chain_id        integer,

  pdf_path        text,

  -- 'expired' is deliberately absent: it is derived, never stored
  status          text not null default 'draft'
                  check (status in ('draft', 'issued', 'revoked')),
  revoked_reason  text,

  issued_by       uuid references public.staff (id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- an issued certificate must actually be anchored
  constraint certificates_issued_has_anchor
    check (status = 'draft' or (cert_hash is not null and tx_hash is not null)),

  -- expiry cannot precede issue
  constraint certificates_expiry_after_issue
    check (expires_on is null or expires_on > issued_on)
);

create index certificates_org_id_idx     on public.certificates (org_id);
create index certificates_course_id_idx  on public.certificates (course_id);
create index certificates_status_idx     on public.certificates (status);
create index certificates_cert_hash_idx  on public.certificates (cert_hash);
create index certificates_created_at_idx on public.certificates (created_at desc);

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- audit_log
-- --------------------------------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid references public.orgs (id) on delete cascade,
  actor       uuid references public.staff (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_org_id_idx     on public.audit_log (org_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- ===========================================================================
-- Row-level security
-- ===========================================================================

alter table public.orgs         enable row level security;
alter table public.staff        enable row level security;
alter table public.courses      enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_log    enable row level security;

-- Helper: the org of the calling user. SECURITY DEFINER so the policy can read
-- the staff table without recursing into staff's own RLS policies.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.staff where user_id = auth.uid();
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff where user_id = auth.uid();
$$;

-- --- orgs ------------------------------------------------------------------

create policy "staff read own org"
  on public.orgs for select
  to authenticated
  using (id = public.current_org_id());

-- --- staff -----------------------------------------------------------------

create policy "staff read own org members"
  on public.staff for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "admins manage staff"
  on public.staff for all
  to authenticated
  using (
    org_id = public.current_org_id()
    and public.current_staff_role() = 'admin'
  )
  with check (
    org_id = public.current_org_id()
    and public.current_staff_role() = 'admin'
  );

-- --- courses ---------------------------------------------------------------

create policy "staff read own org courses"
  on public.courses for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "admins manage courses"
  on public.courses for all
  to authenticated
  using (
    org_id = public.current_org_id()
    and public.current_staff_role() = 'admin'
  )
  with check (
    org_id = public.current_org_id()
    and public.current_staff_role() = 'admin'
  );

-- --- certificates ----------------------------------------------------------

create policy "staff read own org certificates"
  on public.certificates for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "issuers insert certificates"
  on public.certificates for insert
  to authenticated
  with check (
    org_id = public.current_org_id()
    and public.current_staff_role() in ('admin', 'issuer')
  );

create policy "issuers update certificates"
  on public.certificates for update
  to authenticated
  using (
    org_id = public.current_org_id()
    and public.current_staff_role() in ('admin', 'issuer')
  )
  with check (
    org_id = public.current_org_id()
    and public.current_staff_role() in ('admin', 'issuer')
  );

create policy "admins delete draft certificates"
  on public.certificates for delete
  to authenticated
  using (
    org_id = public.current_org_id()
    and public.current_staff_role() = 'admin'
    and status = 'draft'
  );

-- --- audit_log -------------------------------------------------------------

create policy "staff read own org audit log"
  on public.audit_log for select
  to authenticated
  using (org_id = public.current_org_id());

-- Audit rows are written server-side with the service role, which bypasses
-- RLS. No insert policy is granted to authenticated users on purpose: an audit
-- trail that the audited party can write to is not an audit trail.

-- ===========================================================================
-- Storage — private bucket for generated PDFs
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do update set public = false;

-- Deliberately NO policies on storage.objects for this bucket.
--
-- With RLS enabled and no policy granting access, neither anon nor
-- authenticated can read or write these objects directly. PDFs are served
-- exclusively through short-lived signed URLs minted server-side, and uploaded
-- with the service-role client. This keeps a certificate PDF from being
-- fetchable by anyone who guesses its path.
