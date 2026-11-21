# Verificação

Adaptador da skill `verificar` neste repo. O bloco abaixo é lido pelo script da
skill: globs do que mudou, dois espaços, o comando na raiz do repo.

```portoes
*  npm run verify
```

## Como testar à mão

- `npm run dev` abre a vitrine: troque tema e claro/escuro no topo e percorra
  app-shell, states, feedback, data-table, search-results, detail-page,
  entity-form, file-upload, jobs-panel, command-palette e tema. No app-shell,
  reduza a largura do iframe (Celular 390) para ver a Sheet e use Ctrl/Cmd+B
  para recolher; Ctrl/Cmd+K abre a paleta do cabeçalho.
- `npm run screenshots` fotografa cada item em cada tema, modo e largura em
  `.screenshots/` e confere foco do diálogo e da paleta (abre com Ctrl+K),
  Sheet, fila de envios, log do jobs-panel, rolagem horizontal e erros de
  console; precisa do Chromium do Playwright.
- `KEEP=1 npm run consume` deixa o projeto consumidor montado; o caminho sai na
  última linha.
