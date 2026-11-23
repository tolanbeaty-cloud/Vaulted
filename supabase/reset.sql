-- DANGER: deletes all VAULT tables and data. Run this only if you want to start over,
-- then run supabase/migrations/20260101000000_init.sql again.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.vault_totals(uuid);
drop function if exists public.override_vault(uuid);
drop table if exists public.provider_tokens, public.byob_links, public.shield_events,
  public.shield_settings, public.ledger_entries, public.purchases, public.vaults,
  public.profiles cascade;
