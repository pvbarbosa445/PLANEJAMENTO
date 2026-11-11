# Calendário Financeiro — correção da Conta 3 e da aparência

Esta atualização corrige o aplicativo já instalado. Ela preserva os dados existentes e não exige alteração no Supabase.

## Correções desta versão
- Corrige a aba **Anotações**, restaurando a função que monta e exibe as notas. O erro `memoNotesHTML is not defined` deixa de ocorrer.
- Permite criar, editar, salvar e exibir anotações existentes.
- Salva a preferência de aparência em uma configuração global do navegador, não separada por Conta 1, Conta 2 ou Conta 3. Assim, a escolha claro/escuro permanece ao navegar entre páginas, trocar de conta ou abrir outra aba do navegador.
- Sincroniza a preferência de aparência entre abas abertas do mesmo navegador.
- Corrige a verificação de estado ao trocar de conta, que podia fazer o app recarregar desnecessariamente.
- Atualiza a versão do cache offline para que o navegador receba os arquivos corrigidos.

## Segurança dos dados
- Não apaga nem reinicializa lançamentos, metas, tags, planos, rotinas ou anotações.
- Não altera a estrutura de sincronização nem o conteúdo de `sync.js`.
- Não requer comando SQL.
- **Não execute** `add_profile3.sql`, `schema.sql` ou `realtime.sql` para esta atualização. A Conta 3 já está configurada no projeto existente.

## Arquivos do site
Mantenha `index.html`, `sync.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll` e os ícones na raiz do repositório GitHub Pages. A pasta `supabase` é apenas documentação e arquivo de referência; não execute os SQL desta pasta nesta correção.

## Publicação
1. Faça backup do repositório atual.
2. Extraia este pacote.
3. Envie os arquivos da raiz do pacote para a raiz do repositório `PLANEJAMENTO`, substituindo os arquivos de mesmo nome. Não apague o repositório.
4. Faça o commit e aguarde a atualização do GitHub Pages.
5. Abra `https://pvbarbosa445.github.io/PLANEJAMENTO/` e atualize com `Ctrl+Shift+R`.
6. Entre na Conta 3 e confirme que Planos, Rotina e horários e Anotações abrem normalmente.

A preferência de aparência é comum às três contas e fica guardada no navegador em `mpf_theme`. Os dados de cada conta continuam isolados.
