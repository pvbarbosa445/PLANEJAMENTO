-- Ativa eventos em tempo real para a tabela usada pelo Calendário Financeiro.
-- Pode ser executado mais de uma vez; não apaga dados nem altera permissões.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'finance_state'
     ) then
    execute 'alter publication supabase_realtime add table public.finance_state';
  end if;
end $$;

-- Confirma que a tabela está na publicação de eventos.
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'finance_state';
