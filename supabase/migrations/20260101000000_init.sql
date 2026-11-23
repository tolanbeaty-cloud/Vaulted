-- VAULT: Supabase schema. Run in the Supabase SQL Editor (or as a migration).
-- Amounts are stored in cents. RLS is on for every table.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings jsonb not null default '{}',
  active_vault_id uuid,
  created_at timestamptz not null default now()
);

create table public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  start_date date not null default current_date,
  duration_days int not null check (duration_days between 1 and 730),
  unlock_date date generated always as (start_date + duration_days) stored,
  target_cents bigint check (target_cents is null or target_cents >= 0),
  hide_balance boolean not null default true,
  restrictions text[] not null default '{}',
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  streak_start timestamptz not null default now(),
  overridden_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Avoided purchases (potential savings: money NOT spent, never a bank deposit)
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  store text not null check (char_length(store) between 1 and 40),
  price_cents bigint not null check (price_cents > 0 and price_cents <= 100000000),
  category text,
  created_at timestamptz not null default now()
);

-- Money movements. Clients may only add self-reported deposits.
-- Verified, custody and automated-transfer rows are written by your server (service role).
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  type text not null check (type in ('deposit','withdrawal')),
  source text not null check (source in ('self_reported','bank_read','custody','byob')),
  state text not null check (state in ('pending','cooling','settled','returned','cancelled','rejected')),
  amount_cents bigint not null check (amount_cents > 0),
  idempotency_key text not null,
  release_at timestamptz,
  external_ref text,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.shield_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  sites jsonb not null default '[]',
  mode text not null default 'checkout' check (mode in ('checkout','shop')),
  cooldown_hours int not null default 24 check (cooldown_hours between 1 and 168),
  allow_override boolean not null default true,
  message text not null default 'You made a commitment to yourself. Is this purchase worth delaying your goals?'
);

create table public.shield_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  site text not null,
  action text not null check (action in ('walk_away','cooldown','continue')),
  cart_cents bigint not null default 0 check (cart_cents >= 0),
  created_at timestamptz not null default now()
);

-- Automated-transfer setup. Provider tokens must NEVER be readable by clients:
-- keep them in a server-only table (RLS on, no policies) or Supabase Vault.
create table public.byob_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source_ref text, dest_ref text,
  rule jsonb not null default '{}',
  consent_at timestamptz, revoked_at timestamptz
);
create table public.provider_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_token text not null
);

create index on public.vaults (user_id);
create index on public.purchases (vault_id);
create index on public.ledger_entries (vault_id);
create index on public.shield_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.vaults enable row level security;
alter table public.purchases enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.shield_settings enable row level security;
alter table public.shield_events enable row level security;
alter table public.byob_links enable row level security;
alter table public.provider_tokens enable row level security; -- no policies: service role only

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own vaults" on public.vaults for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own purchases read" on public.purchases for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own purchases write" on public.purchases for insert to authenticated
  with check (user_id = (select auth.uid()) and exists
    (select 1 from public.vaults v where v.id = vault_id and v.user_id = (select auth.uid())));
create policy "own purchases edit" on public.purchases for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own purchases delete" on public.purchases for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "own ledger read" on public.ledger_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self-reported deposits only" on public.ledger_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'self_reported' and type = 'deposit'
    and state = 'settled' and exists
    (select 1 from public.vaults v where v.id = vault_id and v.user_id = (select auth.uid())));
create policy "own shield settings" on public.shield_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own shield events" on public.shield_events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own byob read" on public.byob_links for select to authenticated
  using (user_id = (select auth.uid()));
-- byob_links writes (consent, linking) go through your server route, not the browser.

-- THE UNKNOWN BALANCE: clients can't read amounts directly. Totals come from a function
-- that returns NULL until the vault is unlocked, completed, or overridden.
revoke select on public.purchases from authenticated, anon;
grant select (id, vault_id, user_id, name, store, category, created_at) on public.purchases to authenticated;
revoke select on public.ledger_entries from authenticated, anon;
grant select (id, user_id, vault_id, type, source, state, release_at, created_at) on public.ledger_entries to authenticated;

create or replace function public.vault_totals(p_vault uuid)
returns table (potential_cents bigint, actual_cents bigint, resisted int, unlocked boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v public.vaults; ok boolean;
begin
  select * into v from public.vaults where id = p_vault and user_id = (select auth.uid());
  if not found then return; end if;
  ok := v.unlock_date <= current_date or v.overridden_at is not null or v.status = 'completed';
  return query select
    case when ok then coalesce((select sum(price_cents) from public.purchases where vault_id = p_vault), 0)::bigint end,
    case when ok then coalesce((select sum(case type when 'deposit' then amount_cents else -amount_cents end)
      from public.ledger_entries where vault_id = p_vault and state = 'settled'), 0)::bigint end,
    (select count(*)::int from public.purchases where vault_id = p_vault),
    ok;
end $$;

create or replace function public.override_vault(p_vault uuid)
returns void language sql security definer set search_path = '' as $$
  update public.vaults set overridden_at = now(), streak_start = now()
  where id = p_vault and user_id = (select auth.uid()) and overridden_at is null;
$$;

revoke all on function public.vault_totals(uuid), public.override_vault(uuid) from public, anon;
grant execute on function public.vault_totals(uuid), public.override_vault(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.shield_settings (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Newer Supabase projects don't expose new public tables to the Data API automatically.
-- These explicit grants make the tables reachable for signed-in users (and your server).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant select, insert, update, delete on public.profiles, public.vaults, public.shield_settings, public.shield_events to authenticated;
grant select on public.byob_links to authenticated;
grant insert, update, delete on public.purchases to authenticated;
grant select (id, vault_id, user_id, name, store, category, created_at) on public.purchases to authenticated;
grant insert on public.ledger_entries to authenticated;
grant select (id, user_id, vault_id, type, source, state, release_at, created_at) on public.ledger_entries to authenticated;
grant execute on function public.vault_totals(uuid), public.override_vault(uuid) to authenticated;
notify pgrst, 'reload schema';
