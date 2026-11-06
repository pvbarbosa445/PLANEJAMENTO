# Calendário Financeiro — pacote completo

Este pacote é a versão web/PWA do Calendário Financeiro preparada para GitHub Pages e sincronização com Supabase.

## Arquivos ativos

- `index.html`: aplicativo principal (HTML, CSS e lógica do calendário).
- `sync.js`: login, recuperação de senha e sincronização Supabase.
- `sw.js`: service worker e cache offline.
- `manifest.webmanifest` e os três PNGs: instalação e ícones azul/preto.
- `supabase/schema.sql`: estrutura e políticas de segurança do armazenamento remoto.

Os módulos separados `app.js`, `pages.js`, `engine.js`, `finance.js` e similares da arquitetura anterior não são carregados pelo `index.html` atual; por isso não fazem parte deste pacote limpo.

## Publicar no GitHub Pages

1. Faça backup baixando um ZIP do repositório atual.
2. Extraia este pacote. Os arquivos ficam diretamente na raiz: `index.html` deve aparecer no primeiro nível, não dentro de uma pasta adicional.
3. Substitua o conteúdo publicado da raiz do repositório pelos arquivos deste pacote.
4. Em **Settings → Pages**, mantenha **Deploy from a branch**, branch `main`, pasta `/(root)`.
5. Aguarde a execução de `pages build and deployment` terminar com sucesso.

## Supabase

O `sync.js` usa o Project URL e a Publishable key do projeto configurado. A chave `sb_publishable_` pode ser usada no navegador; nunca coloque `sb_secret_` ou `service_role` no site.

O SQL em `supabase/schema.sql` cria `public.finance_state` e habilita RLS para que cada usuário leia e altere somente os próprios dados. Se já executou esse SQL e recebeu `Success. No rows returned`, não precisa executá-lo novamente.

Em **Authentication → URL Configuration**, configure `Site URL` e `Redirect URLs` para o endereço publicado, por exemplo `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`. Não use `localhost`.

## Primeira sincronização — cuidado com os dados

O app mantém os dados locais em `localStorage` (`mpf1` e `mpf2`) e sincroniza os dois perfis com a tabela remota após o usuário escolher uma direção inicial.

- No aparelho que tem a cópia correta e mais completa, faça backup e escolha **Enviar dados deste aparelho para a nuvem**.
- No outro aparelho, entre com a mesma conta e escolha **Baixar dados da nuvem para este aparelho**.

Enviar substitui o estado remoto do perfil correspondente; baixar substitui o estado local daquele perfil. Este pacote não faz fusão automática de lançamentos divergentes. Não envie dados do segundo aparelho por cima da cópia escolhida como principal.

A sincronização automática funciona após a ativação inicial e quando há internet. Para testar, use o mesmo login nos dois aparelhos e confira uma alteração simples antes de inserir muitos dados.
