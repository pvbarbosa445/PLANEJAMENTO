# Calendário Financeiro — Conta 3 de organização pessoal

Este pacote acrescenta uma terceira conta/perfil dentro do MESMO Calendário Financeiro. Não é um aplicativo separado. A Conta 3 usa o calendário mensal, semanal e diário já existente, mas guarda apenas tarefas, compromissos, horários recorrentes, planos e anotações.

## Modo claro — referência visual Apple Calendar
- Fundo principal branco e painel lateral em cinza-claro, com texto escuro de alto contraste.
- Grade mensal contínua, com divisórias finas no lugar dos cartões escuros arredondados.
- Dia atual destacado em azul, fins de semana discretos e eventos em faixas suaves com marcadores laterais coloridos.
- Controles, seletores, campos e gráficos adaptados ao tema claro; o texto central do gráfico acompanha as cores do tema.
- O modo escuro foi mantido. A mudança na grade contínua é aplicada no layout desktop; no celular, a estrutura responsiva original é preservada.

## O que muda
- O seletor de contas passa a mostrar Conta 1, Conta 2 e Conta 3 · Organização.
- A Conta 3 começa vazia e isolada; não copia nem altera receitas, despesas, saldos, metas ou cofrinhos das Contas 1 e 2.
- O calendário da Conta 3 mostra tarefas/compromissos com data e horários recorrentes nos dias da semana escolhidos.
- A área Planos e anotações permite criar planos livres (com título, resumo, data inicial, duração em semanas e texto), rotinas recorrentes, compromissos e notas.
- O botão de aparência fica no cabeçalho da aba lateral, imediatamente ao lado do botão de recarregar, com o mesmo tamanho.
- A sincronização Supabase inclui o perfil 3, separado dos perfis 1 e 2.

## Arquivos do site
Mantenha `index.html`, `sync.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll` e os ícones na raiz do GitHub Pages.

## Configuração do Supabase existente
A tabela `finance_state` já existe e o Realtime já foi ativado neste projeto. Execute SOMENTE `supabase/add_profile3.sql`, uma vez, no SQL Editor do projeto `calendario`. Esse comando substitui a restrição de perfil aceita para incluir o valor `3`; não apaga linhas nem altera os payloads existentes.

Não execute novamente `schema.sql` nem `realtime.sql`.

## Publicação
1. Baixe um backup do repositório atual.
2. Extraia este pacote.
3. Envie os arquivos da raiz do pacote à raiz do repositório `PLANEJAMENTO`, substituindo os arquivos com o mesmo nome.
4. Faça Commit changes e aguarde o GitHub Pages terminar o deploy.
5. Abra `https://pvbarbosa445.github.io/PLANEJAMENTO/` e atualize com `Ctrl+Shift+R`.
6. No seletor de contas, escolha Conta 3 · Organização.

## Primeiro uso da Conta 3
- Em Planos e anotações > Planos, crie um plano e escreva seu cronograma no campo de conteúdo. O exemplo de 12 semanas enviado foi usado como referência de estrutura; seus horários pessoais não foram inseridos automaticamente.
- Em Rotina e horários, crie atividades recorrentes e selecione os dias da semana. Elas aparecem nos dias correspondentes do calendário.
- No calendário, toque/clique em um dia para adicionar uma tarefa ou compromisso específico.
- Em Anotações, registre notas livres.

## Isolamento e sincronização
A Conta 3 é gravada localmente em `mpf3` e remotamente com `profile_id='3'`. A Conta 1 usa `mpf1`/perfil `1`; a Conta 2 usa `mpf2`/perfil `2`. O login Supabase é o mesmo, mas os dados de cada perfil permanecem separados.
