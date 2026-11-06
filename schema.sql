-- Execute no SQL Editor do projeto Supabase antes de ativar a sincronização.
create table if not exists public.finance_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null check (profile_id in ('1','2')),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);
alter table public.finance_state enable row level security;
drop policy if exists "read own finance state" on public.finance_state;
drop policy if exists "insert own finance state" on public.finance_state;
drop policy if exists "update own finance state" on public.finance_state;
create policy "read own finance state" on public.finance_state for select to authenticated using (auth.uid() = user_id);
create policy "insert own finance state" on public.finance_state for insert to authenticated with check (auth.uid() = user_id);
create policy "update own finance state" on public.finance_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.finance_state to authenticated;
