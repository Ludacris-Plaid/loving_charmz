-- 00012: DB-backed rate limiting for public write actions.
--
-- Server actions run on serverless functions where in-memory counters are
-- useless (every invocation may land on a different instance), so the window
-- lives in Postgres. A fixed-window counter per (key, bucket) keeps the logic
-- trivially race-safe via upsert, and expired buckets are pruned opportunistically.
--
-- Used by lib/security/rate-limit.ts to throttle discount-code validation,
-- mailing-list signup, and unsubscribe attempts per IP.

create table if not exists public.rate_limits (
  key text not null,
  bucket timestamptz not null,
  count integer not null default 0,
  primary key (key, bucket)
);

-- Opportunistic cleanup: rows older than one hour can never be part of an
-- active window (the largest window used by the app is 10 minutes), so
-- pruning them whenever a limiter runs keeps the table tiny forever.
create or replace function public.prune_rate_limits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rate_limits where bucket < now() - interval '1 hour';
end;
$$;

-- Atomic consume: upsert the current window's bucket, bump the counter, and
-- report whether the caller is still under the limit — in one statement, so
-- concurrent requests cannot race past the limit.
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  insert into public.rate_limits (key, bucket, count)
  values (p_key, v_bucket, 1)
  on conflict (key, bucket) do update
    set count = public.rate_limits.count + 1;

  select count into v_count from public.rate_limits
  where key = p_key and bucket = v_bucket;

  perform public.prune_rate_limits();

  if v_count <= p_limit then
    return v_count;
  end if;
  return 0;
end;
$$;

-- The table is written through the service-role client from server code;
-- no client-facing policies are needed. Lock it down completely so even
-- the anon role can never read or write it directly.
revoke all on public.rate_limits from anon, authenticated;
alter table public.rate_limits enable row level security;
