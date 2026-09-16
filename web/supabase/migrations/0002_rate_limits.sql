-- ===========================================================================
-- 0002_rate_limits.sql — fixed-window rate limiting without an extra service
--
-- Public routes (verify by id, PDF tamper check) are unauthenticated, so they
-- need a throttle. Rather than adding Redis, the counter lives in Postgres and
-- is incremented by a SECURITY DEFINER function so the check is atomic: the
-- insert-or-increment happens in one statement and cannot race.
-- ===========================================================================

create table public.rate_limits (
  bucket       text        not null,
  identifier   text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, identifier, window_start)
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies: only the SECURITY DEFINER function below may touch this table.

/**
 * Consume one unit from a fixed window.
 *
 * Returns the number of requests made in the current window, INCLUDING this
 * one. The caller compares against its own limit. Windows are aligned to
 * p_window_seconds boundaries so every caller agrees on where a window starts.
 */
create or replace function public.consume_rate_limit(
  p_bucket         text,
  p_identifier     text,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window_start, 1)
  on conflict (bucket, identifier, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer) from public;
grant execute on function public.consume_rate_limit(text, text, integer) to service_role;

/** Housekeeping: drop windows older than a day. Safe to call repeatedly. */
create or replace function public.prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_start < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_rate_limits() from public;
grant execute on function public.prune_rate_limits() to service_role;
