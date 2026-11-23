# ui

Biblioteca pessoal de blocos React distribuída como registry do shadcn/ui
(Base UI, Tailwind v4, Vite + React + TS). Endereço: `github.com/FreitasVarejo/ui-library`.

- **Vitrine**: `npm run dev`. App Vite que renderiza cada item em cada estado,
  importando de `registry/` (fonte única), com seletor de tema e claro/escuro.
  `npm run screenshots` fotografa tudo em `.screenshots/`.
- **Portão**: `npm run verify`. `docs/agents/verificacao.md` é o adaptador.
- **Onde fica cada coisa**
  - `registry.json` (raiz): só `include` dos fragmentos.
  - `registry/<item>/`: código do item e o `registry.json` dele (`app-shell`,
    `states`, `feedback`, `data-table`, `search-results`, `detail-page`,
    `entity-form`, `file-upload`, `jobs-panel`, `command-palette`, `sheet`,
    `agent-kit`).
  - `brands/<nome>.json`: identidade visual (campos: veja `brands/default.json`).
  - `registry/themes/<nome>/` e `src/themes/<nome>.css`: **gerados**, não edite.
  - `src/components/ui/`, `src/hooks/`: componentes do shadcn, só da vitrine.
  - `src/lib/icons.tsx`: `@/lib/icons` da vitrine; no consumidor é o do tema.
  - `scripts/`: gerador de tema, `consume.sh` (teste de consumo sem push) e
    `fake-github.mjs`.
- **Tema novo**: `npm run theme -- brands/<nome>.json`; os outros scripts
  `theme:*` estão no `package.json`.
- **Regras dos itens**
  - Identificadores e arquivos em inglês; texto visível em pt-BR, sobrescrevível
    por prop.
  - Cor, raio, sombra e espaçamento só por token; ícone só de `@/lib/icons`.
  - Componentes do shadcn entram por nome em `registryDependencies`.
  - Dependência entre itens deste registry: só `FreitasVarejo/ui-library/states` e
    `FreitasVarejo/ui-library/feedback`, sem `#ref`, e o bloco importa deles por
    `@/components/states` e `@/components/feedback` (a vitrine mapeia os dois
    para `registry/`). Item de tema nunca é dependência: escreve `icons.ts`. O
    `consume.sh` vigia as duas coisas pelo plano do `add --dry-run`.
  - Navegação, links e dados só por props; sem roteador nem `fetch` nos blocos.
  - Fonte, `--spacing` e sombra de uma marca vão no item `registry:theme`
    (`cssVars`, `dependencies` e `css`).
