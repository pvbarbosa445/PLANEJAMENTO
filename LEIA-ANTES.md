# Migração da Conta 3

No projeto Supabase já utilizado pelo Calendário Financeiro, execute somente `add_profile3.sql` no SQL Editor.

A migração remove a antiga restrição `finance_state_profile_id_check` (que aceitava apenas perfis 1 e 2) e cria a mesma restrição aceitando 1, 2 e 3. Nenhum registro é apagado.

Não execute `schema.sql` novamente. A tabela `finance_state` já existe. Não execute `realtime.sql` novamente se `finance_state` já aparece como tabela na publicação `supabase_realtime`.
