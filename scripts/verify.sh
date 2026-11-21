#!/usr/bin/env bash
# Portão do repo: `npm run verify`. Para no primeiro passo que falhar.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

step() { printf '\n==== %s\n' "$*"; }

step "typecheck"
npm run --silent typecheck

step "lint"
npm run --silent lint

step "temas em dia (gerado == versionado, contraste ok)"
npm run --silent theme:check

step "testes (contraste, estados, feedback, tabela, busca, detalhe, formulário)"
npm run --silent test

step "build da vitrine"
npm run --silent build

step "shadcn build"
rm -rf .registry-out
npm run --silent registry:build
for item in agent-kit app-shell data-table detail-page entity-form feedback search-results states theme-default theme-editorial; do
  test -s ".registry-out/$item.json" || { echo "faltou .registry-out/$item.json"; exit 1; }
done

step "shadcn registry validate"
npm run --silent registry:validate

step "consumo: projeto Vite novo, instalação a partir deste repo, typecheck e build"
npm run --silent consume

printf '\nverify: tudo verde\n'
