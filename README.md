# Calendário Financeiro — modo claro, anotações e planos

Este pacote substitui a versão atual do Calendário Financeiro mantendo o app financeiro e a sincronização Supabase já configurada.

## Novidades
- Tema claro branco e azul, com alternância no menu lateral em Planejamento > Aparência.
- Nova página "Anotações e planos" na navegação.
- Subáreas: Planos, Rotina diária e Anotações.
- Modelo editável do plano de 12 semanas fornecido pelo usuário.
- Rotina diária inicial com horários, dias da semana e marcação de tarefas concluídas.
- Registro de anotações e acompanhamento das entregas das marmitas Live Up.
- As informações novas ficam dentro do estado de cada perfil (mpf1/mpf2), para serem incluídas no mesmo payload de sincronização Supabase já usado pelo app.
- Service worker com novo identificador de cache para solicitar atualização dos arquivos.

## Publicação
1. Faça backup do repositório GitHub.
2. Extraia este ZIP.
3. Envie os arquivos da raiz para a raiz do repositório `PLANEJAMENTO`, substituindo os de mesmo nome.
4. Faça Commit changes.
5. Espere o build e deploy terminarem.
6. Abra o site e use Ctrl+Shift+R.

## Como usar
- No menu lateral, abra "Anotações e planos".
- Em "Planos", use "Usar meu modelo de 12 semanas" para carregar o cronograma de rotina, treino e alimentação descrito pelo usuário.
- Em "Rotina diária", marque os itens concluídos e adicione horários.
- Em "Anotações", crie notas livres.
- No menu lateral > Aparência, ative ou desative "Modo claro (branco e azul)".

## Observações importantes
- O tema escuro permanece como padrão.
- O layout móvel do calendário financeiro não foi refeito; as regras novas de tema aplicam-se ao app todo e os componentes da nova página se adaptam ao celular.
- O HTML `conta2-rotina-saude.html` fornecido era um app independente, com armazenamento local `rotina_saude_v1`. As funções de rotina foram incorporadas à página do financeiro, gravando os dados no objeto do perfil (em vez de manter um segundo app isolado).
- O modelo de 12 semanas é editável. Os horários e texto fornecidos pelo usuário foram usados como base, não como aconselhamento médico ou nutricional.
- Não execute `schema.sql` ou `realtime.sql` novamente se a tabela e a publicação já foram configuradas. A sincronização remota real depende de a autenticação e o canal Supabase estarem conectados no navegador.
