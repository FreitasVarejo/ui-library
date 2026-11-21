#!/usr/bin/env bash
# Teste de consumo: instala este repo, sem push, num projeto Vite novo.
#
#   scripts/consume.sh            roda tudo e apaga o diretório temporário
#   KEEP=1 scripts/consume.sh     mantém o projeto e imprime o caminho
#
# O CLI do shadcn lê um registry GitHub resolvendo a ref com `git ls-remote
# https://github.com/FreitasVarejo/ui.git` e buscando os arquivos em
# raw.githubusercontent.com. Aqui os dois são desviados para este checkout
# (GIT_CONFIG_* e scripts/fake-github.mjs): é o mesmo caminho de código do CLI,
# com os endereços `FreitasVarejo/ui/<item>` de verdade, lendo a árvore de
# trabalho. Precisa de rede para o npm (scaffold do Vite e dependências).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHADCN="$REPO/node_modules/.bin/shadcn"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ui-consume.XXXXXX")"
LOG="$WORK/consume.log"

cleanup() {
  if [[ -n "${KEEP:-}" ]]; then
    echo "projeto mantido em $WORK/app"
  else
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

export FAKE_GITHUB_ROOT="$REPO"
export NODE_OPTIONS="--import $REPO/scripts/fake-github.mjs ${NODE_OPTIONS:-}"
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="url.$REPO.insteadOf"
export GIT_CONFIG_VALUE_0="https://github.com/FreitasVarejo/ui.git"
export CI=1

step() { printf '\n== %s\n' "$*"; }
# stdin fechado: se o CLI pedir confirmação, o passo falha em vez de travar.
run() { timeout 300 "$@" </dev/null >>"$LOG" 2>&1 || { tail -40 "$LOG"; echo "FALHOU: $*"; exit 1; }; }
expect() { # arquivo, texto
  grep -qF -- "$2" "$1" || { echo "FALHOU: '$2' não está em $1"; exit 1; }
}
expect_not() { # arquivo, texto
  if grep -qF -- "$2" "$1"; then echo "FALHOU: '$2' não deveria estar em $1"; exit 1; fi
}

step "registry GitHub: validate e list"
run "$SHADCN" registry validate FreitasVarejo/ui
LIST="$(cd "$WORK" && timeout 120 "$SHADCN" list FreitasVarejo/ui </dev/null)"
for item in agent-kit app-shell feedback states theme-default theme-editorial; do
  grep -q "$item" <<<"$LIST" || { echo "FALHOU: list não mostra $item"; echo "$LIST"; exit 1; }
done
echo "list mostra os itens do registry"

step "projeto Vite do zero com Base UI"
cd "$WORK"
run "$SHADCN" init -t vite -b base -p nova -n app -y --no-monorepo --no-rtl
cd app
expect components.json '"style": "base-nova"'

step "tema default, agent-kit e blocos"
run "$SHADCN" add FreitasVarejo/ui/theme-default -y
run "$SHADCN" add FreitasVarejo/ui/agent-kit -y
run "$SHADCN" add FreitasVarejo/ui/app-shell FreitasVarejo/ui/states FreitasVarejo/ui/feedback -y
test -f .claude/rules/ui-library.md
test -f src/components/app-shell/app-shell.tsx
test -f src/components/states/loading-state.tsx
test -f src/components/feedback/confirm-destructive.tsx
expect src/lib/icons.ts 'lucide-react'
expect src/index.css '--primary: oklch(0.511 0.23 276.966)'
expect src/index.css '--radius: 0.625rem'
expect src/index.css '--spacing: 0.25rem'
expect src/index.css "--font-sans: 'Inter Variable', sans-serif"
expect src/index.css '@import "@fontsource-variable/inter"'
expect src/index.css '--shadow-sm: 0 1px 3px 0'
expect src/index.css '--sidebar-primary:'
expect src/index.css '--chart-5:'
expect package.json '"@fontsource-variable/inter"'

step "página com os blocos: typecheck e build"
cp "$REPO/scripts/consume/App.tsx.template" src/App.tsx
run npx tsc -b
run npm run build
echo "typecheck e build com theme-default: ok"

step "trocar a identidade: theme-editorial por cima"
run "$SHADCN" add FreitasVarejo/ui/theme-editorial -y --overwrite
expect src/lib/icons.ts '@phosphor-icons/react'
expect_not src/lib/icons.ts 'lucide-react'
expect src/index.css '--primary: oklch(0.455 0.171 13.697)'
expect src/index.css '--radius: 0rem'
expect src/index.css '--spacing: 0.22rem'
expect src/index.css "--font-heading: 'Fraunces Variable', serif"
expect src/index.css '--shadow-sm: 0 0 #0000'
expect src/index.css '@import "@fontsource-variable/fraunces"'
expect package.json '"@phosphor-icons/react"'
expect_not src/index.css '--primary: oklch(0.511 0.23 276.966)'
run npx tsc -b
run npm run build
echo "typecheck e build com theme-editorial: ok"

step "reinstalar um bloco sobre o tema novo não pergunta nada"
run "$SHADCN" add FreitasVarejo/ui/app-shell FreitasVarejo/ui/states FreitasVarejo/ui/feedback -y
expect src/lib/icons.ts '@phosphor-icons/react'
run npx tsc -b
echo "ok"

step "consumo ok"
