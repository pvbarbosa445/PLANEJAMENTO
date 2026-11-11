# Ativação dos eventos em tempo real

A tabela `public.finance_state` já foi criada anteriormente com `schema.sql`. Não execute esse arquivo novamente.

1. Abra o projeto `calendario` no Supabase.
2. Entre em **SQL Editor** e clique em **New query**.
3. Abra este arquivo `realtime.sql` no pacote, copie todo o conteúdo e cole no editor.
4. Clique em **Run** uma única vez.
5. O resultado deve mostrar `finance_state` na publicação `supabase_realtime`.

Esse complemento não apaga nem altera os registros financeiros. Mesmo sem ele, o aplicativo consulta atualizações como contingência a cada 12 segundos; com Realtime, as alterações são entregues mais rapidamente.
